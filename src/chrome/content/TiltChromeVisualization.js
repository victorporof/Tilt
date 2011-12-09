/***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Tilt: A WebGL-based 3D visualization of a webpage.
 *
 * The Initial Developer of the Original Code is The Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Victor Porof <victor.porof@gmail.com> (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 ***** END LICENSE BLOCK *****/
"use strict";

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.Visualization"];

/*global Tilt, gBrowser, vec3, mat3, mat4, quat4, style_html, js_beautify */
/*jshint sub: true, undef: false, onevar: false */

/**
 * TiltChrome visualization constructor.
 *
 * @param {HTMLCanvasElement} canvas: the canvas element used for rendering
 * @param {TiltChrome.Controller} controller: the controller handling events
 * @param {TiltChrome.UI} ui: the visualization user interface
 * @return {TiltChrome.Visualization} the newly created object
 */
TiltChrome.Visualization = function(canvas, controller, ui) {

  /**
   * Create the renderer, containing useful functions for easy drawing.
   */
  var tilt = new Tilt.Renderer(canvas, {
    // if initialization fails because the WebGL context couldn't be created
    onfail: function() {
      TiltChrome.BrowserOverlay.destroy(true, true);
      TiltChrome.BrowserOverlay.href = null;
      window.content.location.href = "http://get.webgl.org/";
    },

    // WebGL was initialized, but other unforseen consequences may occur
    onsuccess: function() {
      window.setTimeout(function() {
        // check if rendering is working as expected
        if (tilt && tilt.frameCount < 1) {
          TiltChrome.BrowserOverlay.destroy(true, true);
          TiltChrome.BrowserOverlay.href = null;

          window.content.location.href="http://get.webgl.org/troubleshooting/";
          Tilt.Console.alert("Firefox", Tilt.StringBundle.get("tilt.error"));
        }
      }, 1000);
    }
  }),

  /**
   * Mesh initialization properties.
   */
  image = null,
  texture = null,
  thickness = 15,

  /**
   * The combined mesh representing the document visualization.
   */
  mesh = null,
  meshWireframe = null,

  /**
   * A custom shader used for drawing the visualization mesh.
   */
  visualizationShader = null,

  /**
   * A highlight quad drawn over a stacked dom node.
   */
  highlightQuad = {
    index: -1,
    fill: "#fff",
    stroke: "000",
    strokeWeight: 1,
    v0: vec3.create(),
    v1: vec3.create(),
    v2: vec3.create(),
    v3: vec3.create()
  },

  /**
   * Scene transformations, exposing translation, rotation etc.
   * Modified by events in the controller through delegate functions.
   */
  transforms = {
    offset: vec3.create(),      // mesh offset, aligned to the viewport center
    translation: vec3.create(), // scene translation, on the [x, y, z] axis
    rotation: quat4.create(),   // scene rotation, expressed as a quaternion
    tilt: vec3.create()         // accelerometer rotation, if available
  },

  /**
   * Variable specifying if the scene should be redrawn.
   * This happens, for example, when the visualization is translated/rotated.
   */
  redraw = true,

  /**
   * Variables specifying if the scene should be recreated.
   * This happens usually after a MozAfterPaint event.
   */
  refreshTexture = true,
  refreshMesh = true;

  /**
   * The initialization logic.
   */
  var setup = function() {
    if (!tilt || !tilt.gl) {
      return;
    }

    // load the necessary configuration keys and values
    TiltChrome.Config.Visualization.reload();

    // create the visualization shaders and program to draw the stacks mesh
    visualizationShader = new Tilt.Program(
      TiltChrome.Shaders.Visualization.vs,
      TiltChrome.Shaders.Visualization.fs);

    // setup the controller, user interface, visualization mesh, and the
    // browser event handlers
    setupController();
    setupUI();
    setupBrowserEvents();

    // set the transformations at initialization
    vec3.set([0, 0, 0], transforms.offset);
    vec3.set([0, 0, 0], transforms.translation);
    quat4.set([0, 0, 0, 1], transforms.rotation);
    vec3.set([0, 0, 0],  transforms.tilt);

    // this is because of some weird behavior on Windows, if the visualization
    // has been started from the application menu, the width and height gets
    // messed up, so we need to update almost immediately after it starts
    window.setTimeout(function() {
      try {
        gResize();
        gMouseOver();
      }
      catch(e) {}
    }.bind(this), 100);

    // set the focus back to the window content if it was somewhere else
    window.content.focus();
  }.bind(this);

  /**
   * The rendering animation logic and loop.
   */
  var draw = function() {
    // if the visualization was destroyed, don't continue rendering
    if (!tilt || !tilt.gl) {
      return;
    }

    // prepare for the next frame of the animation loop
    // behind the scenes, this issues a requestAnimFrame call and updates some
    // timing variables, frame count, frame rate etc.
    tilt.loop(draw, true);

    // recreate the visualization texture if necessary
    if (refreshTexture) {
      refreshTexture = false;
      setupTexture();
    }

    // recreate the visualization mesh if necessary
    if (refreshMesh) {
      refreshMesh = false;
      setupVisualization();
    }

    // only redraw if we really have to
    if (redraw) {
      redraw = false;

      // clear the context to an opaque black background
      tilt.clear(0, 0, 0, 1);

      // apply the preliminary transformations to the model view
      tilt.translate(tilt.width * 0.5 + 100,
                     tilt.height * 0.5 - 50, -thickness * 30);

      // transform the tilting representing the device orientation
      if (TiltChrome.Config.Visualization.useAccelerometer) {
        tilt.transform(quat4.toMat4(
          Tilt.Math.quat4fromEuler(0,
            Tilt.Math.map(transforms.tilt[0], -1, 1, 1.57079633, -1.57079633),
            Tilt.Math.map(transforms.tilt[2], -1, 1, -1.57079633, 1.57079633)
        )));
      }

      // calculate the camera matrix using the rotation and translation
      tilt.translate(transforms.translation[0], 0, transforms.translation[2]);
      tilt.transform(quat4.toMat4(transforms.rotation));
      tilt.translate(0, transforms.translation[1], 0);

      // offset the visualization mesh to center
      tilt.translate(transforms.offset[0], transforms.offset[1], 0);

      // draw the visualization mesh
      tilt.blendMode("alpha");
      tilt.strokeWeight(2);
      mesh.draw();
      meshWireframe.draw();

      // check if there's anything to highlight (i.e any node is selected)
      if (highlightQuad.index !== -1) {

        // we'll need to calculate the quad corners to draw a highlighted area
        // around the currently selected node
        var transf = mat4.multiplyVec4,
          mvMatrix = mesh.mvMatrix;

        tilt.perspective();
        tilt.depthTest(false);
        tilt.fill(highlightQuad.fill);
        tilt.stroke(highlightQuad.stroke);
        tilt.strokeWeight(highlightQuad.strokeWeight);

        // draw the quad along the corresponding transformed stack vertices
        tilt.quad(transf(mvMatrix, highlightQuad.$v0, highlightQuad.v0),
                  transf(mvMatrix, highlightQuad.$v1, highlightQuad.v1),
                  transf(mvMatrix, highlightQuad.$v2, highlightQuad.v2),
                  transf(mvMatrix, highlightQuad.$v3, highlightQuad.v3));
      }

      // draw the ui on top of the visualization
      if (ui && "function" === typeof ui.draw) {
        ui.draw(tilt.frameDelta);
      }
    }

    // when rendering is finished, call an update function in the controller
    if (controller && "function" === typeof controller.update) {
      controller.update(tilt.frameDelta);
    }

    // every once in a while, do a garbage collect
    // this is not vital, but it's good to keep things in control
    if ((tilt.frameCount + 1) % 1000 === 0) {
      TiltChrome.BrowserOverlay.performGC();
    }
  }.bind(this);

  /**
   * Setup the controller, referencing this visualization.
   */
  var setupController = function() {
    // we might have the controller undefined (not passed as a parameter in
    // the constructor, in which case the controller won't be used)
    if ("undefined" === typeof controller) {
      return;
    }

    // set a reference in the controller for this visualization
    controller.visualization = this;

    // call the init function on the controller if available
    if ("function" === typeof controller.init) {
      controller.init(canvas);
    }
  }.bind(this);

  /**
   * Setup the user interface, referencing this visualization and controller.
   */
  var setupUI = function() {
    // we might have the interface undefined (not passed as a parameter in
    // the constructor, in which case the interface won't be used)
    if ("undefined" === typeof ui) {
      return;
    }

    // set a reference in the ui for this visualization and the controller
    ui.visualization = this;
    ui.controller = controller;

    // the top-level UI might need to force redraw, teach it how to do that
    Tilt.UI.requestRedraw = this.requestRedraw;

    // call the init function on the user interface if available
    if ("function" === typeof ui.init) {
      ui.init(canvas);
    }
  }.bind(this);

  /**
   * Creates or refreshes the texture applied to the visualization mesh.
   */
  var setupTexture = function() {
    var rect = this.$refreshBoundingClientRect;

    // use an extension to get the image representation of the document
    // this will be removed once the MOZ_window_region_texture extension
    // is finished; currently converting the document image to a texture
    // bug #653656
    if ("undefined" === typeof rect || rect === null) {
      image = Tilt.WebGL.initDocumentImage(window.content);

      if (texture !== null) {
        texture.destroy();
      }

      // create a static texture using the previously created document image
      texture = new Tilt.Texture(image, { preserve: true });

      // update the mesh texture with the new object
      if (mesh !== null) {
        mesh.texture = texture;
      }
    }
    else if ("object" === typeof rect) {
      // refresh the document image for a delimited bounding rectangle
      var ref = Tilt.WebGL.refreshDocumentImage(window.content, image, rect);

      // update the texture with the refreshed sub-image
      if (ref) {
        texture.updateSubImage2D(ref, rect.left, rect.top);
      }
    }
  }.bind(this);

  /**
   * Create the combined mesh representing the document visualization by
   * traversing the document & adding a stack for each node that is drawable.
   */
  var setupVisualization = function() {
    // if the visualization was destroyed, don't continue setup
    if (!tilt || !tilt.gl) {
      return;
    }

    // seed the random function to get the same values each time
    Tilt.Random.seed(Math.PI);

    var random = Tilt.Random.next,
      vertices = [],
      texCoord = [],
      indices = [],
      wireframeIndices = [],
      visibleNodes = [],
      hiddenNodes = [],
      maxWidth = 0,
      maxHeight = 0;

    if (mesh !== null) {
      mesh.texture = null;
      mesh.destroy();
    }
    if (meshWireframe !== null) {
      meshWireframe.destroy();
    }

    // traverse the document and issue a callback for each node in the dom
    Tilt.Document.traverse(function(node, depth, index, uid,
                                    offsetX, offsetY, sliceWidth, sliceHeight){

      // call the node callback in the ui
      // this is done (in the default implementation) to create a tree-like
      // representation using color coded strips for each node in the dom
      if (ui && "function" === typeof ui.meshNodeCallback) {
        ui.meshNodeCallback(node, depth, index, uid);
      }

      // the maximum texture size slices the visualization mesh where needed
      var maxSize = tilt.gl.getParameter(tilt.gl.MAX_TEXTURE_SIZE),

      // save some information about each node in the dom
      // this will be used when showing the source editor panel popup
      innerHTML = node.innerHTML,
      attributes = node.attributes,
      localName = node.localName,
      className = node.className,
      id = node.id,
      info = {
        innerHTML: innerHTML,
        attributes: attributes,
        localName: localName,
        className: className,
        id: id,
        uid: uid,
        style: "",
        index: -1
      };

      // if css style is available for the current node, compute it now
      try {
        info.style = window.getComputedStyle(node);
      }
      catch (e) {}

      // skip some nodes to avoid too bloated visualization meshes
      if (localName === "head" ||
          localName === "title" ||
          localName === "meta" ||
          localName === "link" ||
          localName === "style" ||
          localName === "script" ||
          localName === "noscript" ||
          localName === "option" ||
          localName === "ins" ||
          localName === "del") {

        // information about these nodes should still be accessible, despite
        // the fact that they're not rendered
        hiddenNodes.push(info);
        return;
      }

      // get the x, y, width and height coordinates of a node
      var coord = Tilt.Document.getNodeCoordinates(node),
        coordWidth = coord.width,
        coordHeight = coord.height;

      // use this node only if it actually has visible dimensions
      if (coordWidth > 2 && coordHeight > 2) {

        // information about these nodes should still be accessible
        info.index = visibleNodes.length;
        visibleNodes.push(info);

        // number of vertex points, used for creating the indices array
        var i = vertices.length / 3, // a vertex has 3 coords: x, y & z

        // calculate the stack x, y, z, width and height coordinates
        z = depth * thickness + random() * 0.1,
        x = coord.x + offsetX + random() * 0.1,
        y = coord.y + offsetY + random() * 0.1,
        w = Math.min(sliceWidth, coordWidth),
        h = Math.min(sliceHeight, coordHeight);

        // the maximum texture size slices the visualization mesh where needed
        if (x > maxSize || y > maxSize) {
          return;
        }
        if (x + w > maxSize) {
          w = Math.max(maxSize - x, 0);
        }
        if (y + h > maxSize) {
          h = Math.max(maxSize - y, 0);
        }

        // set the maximum mesh width and height to calculate the center offset
        maxWidth = Math.max(w, maxWidth);
        maxHeight = Math.max(h, maxHeight);

        // compute the vertices
        vertices.unshift(x,     y,     z,                    /* front */ // 0
                         x + w, y,     z,                                // 1
                         x + w, y + h, z,                                // 2
                         x,     y + h, z,                                // 3

        // we don't duplicate vertices for the left and right faces, because
        // they can be reused from the bottom and top faces; we do, however,
        // duplicate some vertices from front face, because it has custom
        // texture coordinates which are not shared by the other faces
                        x,     y + h, z - thickness,        /* top */    // 4
                        x + w, y + h, z - thickness,                     // 5
                        x + w, y + h, z,                                 // 6
                        x,     y + h, z,                                 // 7
                        x,     y,     z,                    /* bottom */ // 8
                        x + w, y,     z,                                 // 9
                        x + w, y,     z - thickness,                     // 10
                        x,     y,     z - thickness);                    // 11

        // compute the texture coordinates
        texCoord.unshift((x    ) / texture.width,
                         (y    ) / texture.height,
                         (x + w) / texture.width,
                         (y    ) / texture.height,
                         (x + w) / texture.width,
                         (y + h) / texture.height,
                         (x    ) / texture.width,
                         (y + h) / texture.height,
                         -1, -1, -1, -1, -1, -1, -1, -1,
                         -1, -1, -1, -1, -1, -1, -1, -1);

        // compute the indices
        indices.unshift(i + 0,  i + 1,  i + 2,  i + 0,  i + 2,  i + 3,
                        i + 4,  i + 5,  i + 6,  i + 4,  i + 6,  i + 7,
                        i + 8,  i + 9,  i + 10, i + 8,  i + 10, i + 11,
                        i + 10, i + 9,  i + 6,  i + 10, i + 6,  i + 5,
                        i + 8,  i + 11, i + 4,  i + 8,  i + 4,  i + 7);

        // compute the wireframe indices
        wireframeIndices.unshift(i + 0,  i + 1,  i + 1,  i + 2,
                                 i + 2,  i + 3,  i + 3,  i + 0,
                                 i + 4,  i + 5,  i + 5,  i + 6,
                                 i + 6,  i + 7,  i + 7,  i + 4,
                                 i + 8,  i + 9,  i + 9,  i + 10,
                                 i + 10, i + 11, i + 11, i + 8,
                                 i + 10, i + 9,  i + 9,  i + 6,
                                 i + 6,  i + 5,  i + 5,  i + 10);
      }
      else {
        // information about these nodes should still be accessible, despite
        // the fact that they're not rendered
        hiddenNodes.push(info);
      }
    }.bind(this), function(maxDepth, totalNodes) {
      // call the ready callback in the ui
      // this is done (in the default implementation) to create a tree-like
      // representation using color coded strips for each node in the dom
      if (ui && "undefined" !== ui.meshReadyCallback) {
        ui.meshReadyCallback(maxDepth, totalNodes);
      }
    }.bind(this), true);

    // create the visualization mesh using the vertices, texture coordinates
    // and indices computed when traversing the dom
    mesh = new Tilt.Mesh({
      vertices: new Tilt.VertexBuffer(vertices, 3),
      texCoord: new Tilt.VertexBuffer(texCoord, 2),
      indices: new Tilt.IndexBuffer(indices),
      tint: [1, 1, 1, 1],
      alpha: 1,
      texture: texture,
      visibleNodes: visibleNodes,
      hiddenNodes: hiddenNodes,

      // override the default mesh draw function to use our custom
      // visualization shader, textures and colors
      draw: function() {

        // cache some properties for easy access
        var tilt = Tilt.$renderer,
          vertices = this.vertices,
          texCoord = this.texCoord,
          color = this.color,
          indices = this.indices,
          tint = this.tint,
          alpha = this.alpha,
          texture = this.texture,
          drawMode = this.drawMode,
          program = visualizationShader;

        // use the custom visualization program
        program.use();

        // bind the attributes and uniforms as necessary
        program.bindVertexBuffer("vertexPosition", vertices);
        program.bindVertexBuffer("vertexTexCoord", texCoord);
        program.bindVertexBuffer("vertexColor", color);
        program.bindUniformMatrix("mvMatrix", tilt.mvMatrix);
        program.bindUniformMatrix("projMatrix", tilt.projMatrix);
        program.bindUniformVec4("tint", tint);
        program.bindUniformFloat("alpha", alpha);
        program.bindTexture("sampler", texture);

        // use the necessary shader and draw the vertices as indexed elements
        tilt.drawIndexedVertices(drawMode, indices);

        // save the current model view and projection matrices
        this.mvMatrix = mat4.create(tilt.mvMatrix);
        this.projMatrix = mat4.create(tilt.projMatrix);
      }
    });

    // additionally, create a wireframe representation to make the
    // visualization a bit more pretty
    meshWireframe = new Tilt.Mesh({
      vertices: mesh.vertices,
      indices: new Tilt.IndexBuffer(wireframeIndices),
      color: [0, 0, 0, 0.25],
      drawMode: tilt.LINES
    });

    // set the necessary mesh offsets
    maxWidth = Math.min(maxWidth, window.content.innerWidth);
    maxHeight = Math.min(maxHeight, window.content.innerHeight);
    transforms.offset[0] = -maxWidth * 0.5;
    transforms.offset[1] = -maxHeight * 0.5;

    // call any necessary additional mesh initialization functions
    this.performMeshColorbufferRefresh();
  }.bind(this);

  /**
   * Handle some browser events, e.g. when the tabs are selected or closed.
   */
  var setupBrowserEvents = function() {
    var tabContainer = gBrowser.tabContainer,
      contentWindow = gBrowser.contentWindow,
      sourceEditor = TiltChrome.BrowserOverlay.sourceEditor.panel,
      colorPicker = TiltChrome.BrowserOverlay.colorPicker.panel;

    // useful for updating the visualization
    window.addEventListener("MozAfterPaint", gAfterPaint, false);
    window.addEventListener("devicemotion", gDeviceMotion, false);

    // when the tab is closed or the url changes, destroy visualization
    tabContainer.addEventListener("TabClose", gClose, false);
    tabContainer.addEventListener("TabAttrModified", gClose, false);

    // some other miscellaneous events handling blur, focus, resize etc.
    contentWindow.addEventListener("blur", gBlur, false);
    contentWindow.addEventListener("focus", gFocus, false);
    contentWindow.addEventListener("resize", gResize, false);
    gBrowser.addEventListener("mouseover", gMouseOver, true);
    gBrowser.addEventListener("load", gLoad, true);

    // internal events triggered by the popups used for the user interface
    sourceEditor.addEventListener("popupshown", eEditorShown, false);
    sourceEditor.addEventListener("popuphidden", eEditorHidden, false);
    colorPicker.addEventListener("popupshown", ePickerShown, false);
    colorPicker.addEventListener("popuphidden", ePickerHidden, false);
  }.bind(this);

  /**
   * Event handling the MozAfterPaint event.
   */
  var gAfterPaint = function(e) {
    // don't refresh while resizing, focusing or unfocusing the window
    if (this.$gResizing || this.$gFocusing || this.$gBlurring) {
      return;
    }

    // cache some necessary variables, like boundings, offsets etc.
    var config = TiltChrome.Config.Visualization,
      boundingClientRect = e.boundingClientRect,
      left = boundingClientRect.left,
      top = boundingClientRect.top,
      width = boundingClientRect.width,
      height = boundingClientRect.height,
      offsetLeft = canvas.offsetLeft,
      offsetTop = canvas.offsetTop,
      innerWidth, innerHeight;

    // don't refresh if we don't want to
    if (config.refreshVisualization <= -1) {
      return;
    }

    // the refreshed area is inside the window content rectangle
    if (config.refreshVisualization >= 0 &&
        top > offsetTop && left > offsetLeft && width > 4 && height > 4) {

      this.requestRefreshTexture(boundingClientRect);
    }
    // the entire dom tree has likely changed, so refresh everything
    else if (config.refreshVisualization >= 1 &&
             tilt.frameCount > 100) {

      innerWidth = window.content.innerWidth;
      innerHeight = window.content.innerHeight;

      if (config.refreshVisualization >= 2 ||
          ((left <= 0 && top <= 0) &&
           (left >= -innerWidth || top >= -innerHeight) &&
           (width >= innerWidth || height >= innerHeight))) {

        // multiple refresh events could be triggered at the same time, so in
        // order to minimize the reinitialization calls, set a timeout and
        // check if the mesh or texture is currently refreshed
        window.setTimeout(function() {
          try {
            if (!refreshMesh && !refreshTexture) {
              this.requestRefreshTexture(null);
              this.requestRefreshMesh();
            }
          }
          catch(e) {}
        }.bind(this), 10);
      }
    }
  }.bind(this);

  /**
   * Event handling orientation changes if the device supports them.
   */
  var gDeviceMotion = function(e) {
    if (TiltChrome.Config.Visualization.useAccelerometer) {

      var accelerationIncludingGravity = e.accelerationIncludingGravity,
        x = accelerationIncludingGravity.x - Math.PI * 0.01,
        y = accelerationIncludingGravity.y - Math.PI * 0.01,
        z = accelerationIncludingGravity.z;

      transforms.tilt[0] += (y - transforms.tilt[0]) * 0.5;
      transforms.tilt[1] += (z - transforms.tilt[1]) * 0.5;
      transforms.tilt[2] += (x - transforms.tilt[2]) * 0.5;

      this.requestRedraw();
    }
  }.bind(this);

  /**
   * Event method called when the tab container of the current browser closes.
   */
  var gClose = function() {
    if (TiltChrome.BrowserOverlay.href !== window.content.location.href) {
      TiltChrome.BrowserOverlay.href = null;
      TiltChrome.BrowserOverlay.destroy(true, true);
    }
  }.bind(this);

  /**
   * Event method called when the content of the current browser is unfocused.
   */
  var gBlur = function() {
    // set a flag to signal that the window is currently unfocusing (to avoid
    // doing complex stuff like recreating the visualization mesh)
    this.$gBlurring = true;

    // set a flag to signal that the window has stopped unfocusing
    window.setTimeout(function() {
      this.$gBlurring = false;
    }.bind(this), 250);
  }.bind(this);

  /**
   * Event method called when the content of the current browser is focused.
   */
  var gFocus = function() {
    // set a flag to signal that the window is currently focusing (to avoid
    // doing complex stuff like recreating the visualization mesh)
    this.$gFocusing = true;

    // set a flag to signal that the window has stopped focusing
    window.setTimeout(function() {
      this.$gFocusing = false;
    }.bind(this), 250);
  }.bind(this);

  /**
   * Event method called when the content of the current browser is resized.
   */
  var gResize = function() {
    // set a flag to signal that the window is currently resizing (to avoid
    // doing complex stuff like recreating the visualization mesh)
    this.$gResizing = true;

    this.requestRedraw();
    tilt.width = window.content.innerWidth;
    tilt.height = window.content.innerHeight;

    // resize and update the controller and the user interface accordingly
    if (controller && "function" === typeof controller.resize) {
      controller.resize(tilt.width, tilt.height);
    }
    if (ui && "function" === typeof ui.resize) {
      ui.resize(tilt.width, tilt.height);
    }

    // hide the panel with the editor & picker (to avoid wrong positioning)
    try {
      if ("open" === TiltChrome.BrowserOverlay.sourceEditor.panel.state) {
        TiltChrome.BrowserOverlay.sourceEditor.panel.hidePopup();
      }
      if ("open" === TiltChrome.BrowserOverlay.colorPicker.panel.state) {
        TiltChrome.BrowserOverlay.colorPicker.panel.hidePopup();
      }
    }
    catch(e) {}
  }.bind(this);

  /**
   * Event method called when the mouse comes over the current browser.
   */
  var gMouseOver = function() {
    // set a flag to signal that the window has stopped resizing
    window.setTimeout(function() {
      this.$gResizing = false;
    }.bind(this), 100);

    this.requestRedraw();
    tilt.width = window.content.innerWidth;
    tilt.height = window.content.innerHeight;

    // this happens after the browser window is resized
    if (canvas.width !== tilt.width || canvas.height !== tilt.height) {

      // we need to update the canvas width and height to use full resolution
      // and avoid blurry rendering
      canvas.width = tilt.width;
      canvas.height = tilt.height;

      // update the WebGL viewport and redraw the visualization now
      tilt.gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    }
  }.bind(this);

  /**
   * Event method called when the tab container of the current browser loads.
   */
  var gLoad = function() {
    if ("undefined" === typeof this.$gLoadFinished) {
      this.$gLoadFinished = true;
    }
    else {
      // don't refresh if we don't want to
      if (TiltChrome.Config.Visualization.refreshVisualization <= 0) {
        return;
      }

      window.setTimeout(function() {
        try {
          if (!refreshMesh && !refreshTexture) {
            this.requestRefreshTexture(null);
            this.requestRefreshMesh();
          }
        }
        catch(e) {}
      }.bind(this), 1000);
    }
  }.bind(this);

  /**
   * Event handling the source editor panel popup showing.
   */
  var eEditorShown = function() {
    if ("function" === typeof ui.panelEditorShown) {
      ui.panelEditorShown();
    }

    this.requestRedraw();
  }.bind(this);

  /**
   * Event handling the source editor panel popup hiding.
   */
  var eEditorHidden = function() {
    if ("function" === typeof ui.panelEditorHidden) {
      ui.panelEditorHidden();
    }

    highlightQuad.index = -1;
    TiltChrome.BrowserOverlay.performGC();

    this.requestRedraw();
  }.bind(this);

  /**
   * Event handling the color picker panel popup showing.
   */
  var ePickerShown = function() {
    if ("function" === typeof ui.panelPickerShown) {
      ui.panelPickerShown();
    }

    this.requestRedraw();
  }.bind(this);

  /**
   * Event handling the color picker panel popup hiding.
   */
  var ePickerHidden = function() {
    if ("function" === typeof ui.panelPickerHidden) {
      ui.panelPickerHidden();
    }

    highlightQuad.index = -1;
    TiltChrome.BrowserOverlay.performGC();

    this.requestRedraw();
  }.bind(this);


/* The following are delegate functions used in the controller or the UI.
 * ------------------------------------------------------------------------ */

  /**
   * Redraws the visualization once.
   * Call this from the controller or ui to update rendering.
   */
  this.requestRedraw = function() {
    redraw = true;
  };

  /**
   * Recreates the visualization texture.
   * @param {BoundingClientRect} rect: a rectangle used to refresh the texture
   */
  this.requestRefreshTexture = function(rect) {
    this.$refreshBoundingClientRect = rect;
    redraw = true;
    refreshTexture = true;
  };

  /**
   * Recreates the visualization mesh.
   */
  this.requestRefreshMesh = function() {
    redraw = true;
    refreshMesh = true;
  };

  /**
   * Saves the mesh to a .obj file to be used with an external editor.
   *
   * @param {String} directory: the directory to save the mesh into
   * @param {String} name: the mesh name
   */
  this.performMeshSave = function(directory, name) {
    var s = Tilt.File.separator;

    Tilt.File.saveImage(image, directory + s + name + ".png");
    mesh.save(directory, name);
  };

  /**
   * Refreshes the visualization with the new custom global configuration
   * regarding the color codes for specified html nodes.
   */
  this.performMeshColorbufferRefresh = function() {
    this.requestRedraw();

    var domStrips = TiltChrome.Config.UI.domStrips,
      clamp = Tilt.Math.clamp,
      hex2rgba = Tilt.Math.hex2rgba,
      floor = Math.floor,

      indices = mesh.indices.components,
      nodes = mesh.visibleNodes,
      color = [];

    // each stack is composed of 30 vertices, so there's information
    // about a node once in 30 iterations (to avoid duplication)
    for (var i = 0, len = indices.length; i < len; i += 30) {

      // get the node and the name to decide how to color code the node
      var node = nodes[floor(i / 30)],

      // the head and body use an identical color code by default
      name = (node.localName !== "head" &&
              node.localName !== "body") ?
              node.localName : "head/body",

      // the color settings may or not be specified for the current node name
      settings = domStrips[name] ||
                 domStrips["other"],

      // create a gradient using the current node color code
      hex = hex2rgba(settings.fill),

      f1 = 0.6,
      f2 = 1.0,
      g1 = [clamp(hex[0] * f1, 0, 1),
            clamp(hex[1] * f1, 0, 1),
            clamp(hex[2] * f1, 0, 1)],
      g2 = [clamp(hex[0] * f2, 0, 1),
            clamp(hex[1] * f2, 0, 1),
            clamp(hex[2] * f2, 0, 1)],

      g10 = g1[0],
      g11 = g1[1],
      g12 = g1[2],
      g20 = g2[0],
      g21 = g2[1],
      g22 = g2[2];

      // compute the colors for each vertex in the mesh
      color.unshift(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    g10, g11, g12,
                    g10, g11, g12,
                    g20, g21, g22,
                    g20, g21, g22,
                    g20, g21, g22,
                    g20, g21, g22,
                    g10, g11, g12,
                    g10, g11, g12);
    }

    // create the buffer using the previously computed color array
    mesh.color = new Tilt.VertexBuffer(color, 3);
  };

  /**
   * Picks a stacked dom node at the x and y screen coordinates and highlights
   * the selected node in the mesh.
   */
  this.performMeshPickHighlight = function(x, y) {
    this.performMeshPick(x, y, {

      onpick: function(intersections) {
        if ("open" === TiltChrome.BrowserOverlay.sourceEditor.panel.state) {
          TiltChrome.BrowserOverlay.sourceEditor.panel.hidePopup();
        }

        var config = TiltChrome.Config.UI,
          node = intersections[0].node,
          index = node.index,

        // the head and body use an identical color code by default
        name = (node.localName !== "head" &&
                node.localName !== "body") ?
                node.localName : "head/body",

        // the color settings may not be specified for the current node name
        settings = config.domStrips[name] ||
                   config.domStrips["other"];

        if (name !== "html") {
          highlightQuad.index = index;
          highlightQuad.fill = settings.fill + "66";

          // we'll need to calculate the quad corners to draw a highlighted
          // area around the currently selected node
          var v = highlightQuad.index * 30,
            vertices = mesh.vertices.components,
            indices = mesh.indices.components,

          // the first triangle vertex
          v0 = [vertices[indices[v    ] * 3    ],
                vertices[indices[v    ] * 3 + 1],
                vertices[indices[v    ] * 3 + 2], 1],

          // the second triangle vertex
          v1 = [vertices[indices[v + 1] * 3    ],
                vertices[indices[v + 1] * 3 + 1],
                vertices[indices[v + 1] * 3 + 2], 1],

          // the third triangle vertex
          v2 = [vertices[indices[v + 2] * 3    ],
                vertices[indices[v + 2] * 3 + 1],
                vertices[indices[v + 2] * 3 + 2], 1],

          // the fourth triangle vertex
          v3 = [vertices[indices[v + 5] * 3    ],
                vertices[indices[v + 5] * 3 + 1],
                vertices[indices[v + 5] * 3 + 2], 1];

          highlightQuad.$v0 = v0;
          highlightQuad.$v1 = v1;
          highlightQuad.$v2 = v2;
          highlightQuad.$v3 = v3;

          this.requestRedraw();
        }
      }.bind(this),

      onfail: function() {
        if ("open" === TiltChrome.BrowserOverlay.sourceEditor.panel.state) {
          TiltChrome.BrowserOverlay.sourceEditor.panel.hidePopup();
        }

        highlightQuad.index = -1;
      }
    });
  };

  /**
   * Picks a stacked dom node at the x and y screen coordinates and opens up
   * the source editor with the corresponding information.
   */
  this.performMeshPickEdit = function(x, y) {
    this.performMeshPick(x, y, {

      onpick: function(intersections) {
        this.openEditor(intersections[0].node);
      }.bind(this),

      onfail: function() {
        if ("open" === TiltChrome.BrowserOverlay.sourceEditor.panel.state) {
          TiltChrome.BrowserOverlay.sourceEditor.panel.hidePopup();
          return;
        }
        if ("open" === TiltChrome.BrowserOverlay.colorPicker.panel.state){
          TiltChrome.BrowserOverlay.colorPicker.panel.hidePopup();
          return;
        }
      }
    });
  };

  /**
   * Picks a stacked dom node at the x and y screen coordinates and issues
   * a callback functions with the found intersections
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   * @param {Object} properties: additional properties for this object
   *  @param {Function} onpick: function to be called at intersection
   *  @param {Function} onfail: function to be called if no intersections
   */
  this.performMeshPick = function(x, y, properties) {
    // make sure the properties parameter is a valid object
    properties = properties || {};

    // create a ray following the mouse direction from the near clipping plane
    // to the far clipping plane, to check for intersections with the mesh
    var ray = Tilt.Math.createRay([x, y, 0], [x, y, 1],
                                  [0, 0, tilt.width, tilt.height],
                                  mesh.mvMatrix,
                                  mesh.projMatrix),

    // cache some variables to help with calculating the ray intersections
    intersections = [],
    point = vec3.create(),
    indices = mesh.indices.components,
    vertices = mesh.vertices.components;

    // check each triangle in the visualization mesh for intersections with
    // the mouse ray (using a simple ray picking algorithm)
    for (var i = 0, len = indices.length, v0, v1, v2; i < len; i += 3) {

      // the first triangle vertex
      v0 = [vertices[indices[i    ] * 3    ],
            vertices[indices[i    ] * 3 + 1],
            vertices[indices[i    ] * 3 + 2]];

      // the second triangle vertex
      v1 = [vertices[indices[i + 1] * 3    ],
            vertices[indices[i + 1] * 3 + 1],
            vertices[indices[i + 1] * 3 + 2]];

      // the third triangle vertex
      v2 = [vertices[indices[i + 2] * 3    ],
            vertices[indices[i + 2] * 3 + 1],
            vertices[indices[i + 2] * 3 + 2]];

      // for each triangle in the mesh, check for the exact intersections
      if (Tilt.Math.intersectRayTriangle(v0, v1, v2, ray, point) > 0) {

        // if the ray-triangle intersection is greater than 0, continue and
        // save the intersection, along with the node information
        intersections.push({
          node: mesh.visibleNodes[Math.floor(i / 30)],
          location: vec3.create(point)
          // each stack is composed of 30 vertices, so there's information
          // about a node once in 30 iterations (to avoid duplication)
        });
      }
    }

    // continue only if we actually clicked something
    if (intersections.length > 0) {

      // if there were any intersections, sort them by the distance towards
      // the camera, and show a panel with the node information
      intersections.sort(function(a, b) {
        return a.location[2] < b.location[2] ? 1 : -1;
      });

      if ("function" === typeof properties.onpick) {
        properties.onpick(intersections);
      }
    }
    else {
      if ("function" === typeof properties.onfail) {
        properties.onfail();
      }
    }

    this.requestRedraw();
  };

  /**
   * Opens the editor showing details about a specific node in the dom.
   * @param {Number | Object} uid: the unique node id or the node itself
   */
  this.openEditor = function(uid) {
    if ("number" === typeof uid) {
      var visibleNodes = mesh.visibleNodes,
        hiddenNodes = mesh.hiddenNodes;

      // first check all the visible nodes for the uid
      // we're not using hashtables for this because it's not necessary, as
      // this function is called very few times
      for (var i = 0, len = visibleNodes.length; i < len; i++) {
        var visibleNode = visibleNodes[i];

        // if we found the searched node uid, open the editor with the node
        if (uid === visibleNode.uid) {
          this.openEditor(visibleNode);
          return;
        }
      }

      // second check all the hidden nodes for the uid
      // this will happen when the editor needs to open information about a
      // node that is not rendered (it isn't part of the visualization mesh)
      for (var j = 0, len2 = hiddenNodes.length; j < len2; j++) {
        var hiddenNode = hiddenNodes[j];

        // if we found the searched node uid, open the editor with the node
        if (uid === hiddenNode.uid) {
          this.openEditor(hiddenNode);
          return;
        }
      }
    }
    else if ("object" === typeof uid) {
      var sourceEditor = TiltChrome.BrowserOverlay.sourceEditor.panel,
        node = uid,

      // get and format the inner html text from the node
      html = Tilt.String.trim(style_html(node.innerHTML, {
        'indent_size': 2,
        'indent_char': ' ',
        'max_char': 78,
        'brace_style': 'collapse'
      })).
        replace(/</g, "&lt;").
        replace(/>/g, "&gt;") + "\n",

      // compute the custom css and attributes text from all the properties
      css = Tilt.Document.getModifiedCss(node.style),
      attr = Tilt.Document.getAttributesString(node.attributes),

      // get the elements used by the popup
      label = document.getElementById("tilt-sourceeditor-title"),
      iframe = document.getElementById("tilt-sourceeditor-iframe"),
      code = iframe.contentDocument.getElementById("code");

      // set the title label of the popup panel
      label.value = "<" + node.localName +
        (node.className ? " class=\"" + node.className + "\"" : "") +
        (node.id ? " id=\"" + node.id + "\"" : "") + ">";

      // show the popup panel containing the source editor iframe
      sourceEditor.openPopup(null, "overlap",
        window.innerWidth - iframe.width - 21,
        window.innerHeight - iframe.height - 77, false, false);

      // update the html, css and attributes for the source editor element
      code.html = html;
      code.css = css;
      code.attr = attr;

      // refresh the editor using specific syntax highlighting in each case
      if (node.localName === "img" ||
          node.localName === "input" ||
          node.localName === "button" ||
          code.editorType === "attr") {

        code.innerHTML = attr;
        iframe.contentWindow.refreshCodeEditor("css");
      }
      else if (code.editorType === "css") {
        code.innerHTML = css;
        iframe.contentWindow.refreshCodeEditor("css");
      }
      else {
        code.innerHTML = html;
        iframe.contentWindow.refreshCodeEditor("html");
      }

      var config = TiltChrome.Config.UI,
        index = node.index,

      // the head and body use an identical color code by default
      name = (node.localName !== "head" &&
              node.localName !== "body") ?
              node.localName : "head/body",

      // the color settings may or not be specified for the current node name
      settings = config.domStrips[name] ||
                 config.domStrips["other"];

      if (name !== "html") {
        highlightQuad.index = index;
        highlightQuad.fill = settings.fill + "66";

        // we'll need to calculate the quad corners to draw a highlighted
        // area around the currently selected node
        var v = highlightQuad.index * 30,
          vertices = mesh.vertices.components,
          indices = mesh.indices.components,

        // the first triangle vertex
        v0 = [vertices[indices[v    ] * 3    ],
              vertices[indices[v    ] * 3 + 1],
              vertices[indices[v    ] * 3 + 2], 1],

        // the second triangle vertex
        v1 = [vertices[indices[v + 1] * 3    ],
              vertices[indices[v + 1] * 3 + 1],
              vertices[indices[v + 1] * 3 + 2], 1],

        // the third triangle vertex
        v2 = [vertices[indices[v + 2] * 3    ],
              vertices[indices[v + 2] * 3 + 1],
              vertices[indices[v + 2] * 3 + 2], 1],

        // the fourth triangle vertex
        v3 = [vertices[indices[v + 5] * 3    ],
              vertices[indices[v + 5] * 3 + 1],
              vertices[indices[v + 5] * 3 + 2], 1];

        highlightQuad.$v0 = v0;
        highlightQuad.$v1 = v1;
        highlightQuad.$v2 = v2;
        highlightQuad.$v3 = v3;

        this.requestRedraw();
      }
    }
  };

  /**
   * Show the inner html contents of a dom node in the editor if open.
   */
  this.setHtmlEditor = function() {
    var iframe = document.getElementById("tilt-sourceeditor-iframe"),
      code = iframe.contentDocument.getElementById("code");

    code.innerHTML = code.html;
    code.editorType = "html";
    iframe.contentWindow.refreshCodeEditor("html");
  };

  /**
   * Show the computed css contents of a dom node in the editor if open.
   */
  this.setCssEditor = function() {
    var iframe = document.getElementById("tilt-sourceeditor-iframe"),
      code = iframe.contentDocument.getElementById("code");

    code.innerHTML = code.css;
    code.editorType = "css";
    iframe.contentWindow.refreshCodeEditor("css");
  };

  /**
   * Show the specific attributes for a dom node in the editor if open.
   */
  this.setAttributesEditor = function() {
    var iframe = document.getElementById("tilt-sourceeditor-iframe"),
      code = iframe.contentDocument.getElementById("code");

    code.innerHTML = code.attr;
    code.editorType = "attr";
    iframe.contentWindow.refreshCodeEditor("css");
  };

  /**
   * Delegate translation method, used by the controller.
   * @param {Array} translation: the new translation on the [x, y, z] axis
   */
  this.setTranslation = function(translation) {
    var x = translation[0],
      y = translation[1],
      z = translation[2];

    // only update the translation if it's not already set
    if (transforms.translation[0] != x ||
        transforms.translation[1] != y ||
        transforms.translation[2] != z) {

      vec3.set(translation, transforms.translation);
      this.requestRedraw();
    }
  };

  /**
   * Delegate rotation method, used by the controller.
   * @param {Array} quaternion: the rotation quaternion, as [x, y, z, w]
   */
  this.setRotation = function(quaternion) {
    var x = quaternion[0],
      y = quaternion[1],
      z = quaternion[2],
      w = quaternion[3];

    // only update the rotation if it's not already set
    if (transforms.rotation[0] != x ||
        transforms.rotation[1] != y ||
        transforms.rotation[2] != z ||
        transforms.rotation[3] != w) {

      quat4.set(quaternion, transforms.rotation);
      this.requestRedraw();
    }
  };

  /**
   * Delegate method, setting the color for the visualization wireframe mesh.
   * @param {Array} color: the color expressed as [r, g, b, a] between 0..1
   */
  this.setMeshWireframeColor = function(color) {
    meshWireframe.color = color;
    this.requestRedraw();
  };

  /**
   * Delegate method, setting the alpha for the visualization wireframe mesh.
   * @param {Number} alpha: the alpha expressed as number between 0..1
   */
  this.setMeshWireframeAlpha = function(alpha) {
    meshWireframe.color[3] = alpha;
    this.requestRedraw();
  };

  /**
   * Delegate method, setting the color for the visualization mesh.
   * @param {Array} color: the color expressed as [r, g, b, a] between 0..1
   */
  this.setMeshColor = function(color) {
    mesh.tint = color;
    this.requestRedraw();
  };

  /**
   * Delegate method, setting the color alpha for the visualization mesh.
   * @param {Number} alpha: the alpha expressed as number between 0..1
   */
  this.setMeshAlpha = function(alpha) {
    mesh.tint[3] = alpha;
    this.requestRedraw();
  };

  /**
   * Delegate method, setting the texture alpha for the visualization mesh.
   * @param {Number} alpha: the alpha expressed as number between 0..1
   */
  this.setMeshTextureAlpha = function(alpha) {
    mesh.alpha = alpha;
    this.requestRedraw();
  };

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function() {
    var tabContainer = gBrowser.tabContainer,
      contentWindow = gBrowser.contentWindow,
      sourceEditor = TiltChrome.BrowserOverlay.sourceEditor.panel,
      colorPicker = TiltChrome.BrowserOverlay.colorPicker.panel;

    if (gAfterPaint !== null) {
      window.removeEventListener("MozAfterPaint", gAfterPaint, false);
      gAfterPaint = null;
    }
    if (gDeviceMotion !== null) {
      window.removeEventListener("devicemotion", gDeviceMotion, false);
      gDeviceMotion = null;
    }
    if (gClose !== null) {
      tabContainer.removeEventListener("TabClose", gClose, false);
      tabContainer.removeEventListener("TabAttrModified", gClose, false);
      gClose = null;
    }
    if (gBlur !== null) {
      contentWindow.removeEventListener("blur", gBlur, false);
      gBlur = null;
    }
    if (gFocus !== null) {
      contentWindow.removeEventListener("focus", gFocus, false);
      gFocus = null;
    }
    if (gResize !== null) {
      contentWindow.removeEventListener("resize", gResize, false);
      gResize = null;
    }
    if (gMouseOver !== null) {
      gBrowser.removeEventListener("mouseover", gMouseOver, true);
      gMouseOver = null;
    }
    if (gLoad !== null) {
      gBrowser.removeEventListener("load", gLoad, true);
      gLoad = null;
    }

    if (eEditorShown !== null) {
      sourceEditor.removeEventListener("popupshown", eEditorShown, false);
      eEditorShown = null;
    }
    if (eEditorHidden !== null) {
      sourceEditor.removeEventListener("popuphidden", eEditorHidden, false);
      eEditorHidden = null;
    }
    if (ePickerShown !== null) {
      colorPicker.removeEventListener("popupshown", ePickerShown, false);
      ePickerShown = null;
    }
    if (ePickerHidden !== null) {
      colorPicker.removeEventListener("popuphidden", ePickerHidden, false);
      ePickerHidden = null;
    }

    if (controller && "function" === typeof controller.destroy) {
      controller.destroy(canvas);
      controller = null;
    }
    if (ui && "function" === typeof ui.destroy) {
      ui.destroy(canvas);
      ui = null;
    }

    if (texture !== null) {
      texture.destroy();
      texture = null;
    }
    if (mesh !== null) {
      mesh.destroy();
      mesh = null;
    }
    if (meshWireframe !== null) {
      meshWireframe.destroy();
      meshWireframe = null;
    }
    if (visualizationShader !== null) {
      visualizationShader.destroy();
      visualizationShader = null;
    }
    if (highlightQuad !== null) {
      Tilt.destroyObject(highlightQuad);
      highlightQuad = null;
    }
    if (transforms !== null) {
      Tilt.destroyObject(transforms);
      transforms = null;
    }
    if (tilt !== null) {
      tilt.destroy();
      tilt = null;
    }

    canvas = null;
    controller = null;
    ui = null;

    image = null;
    texture = null;
    thickness = null;
    mesh = null;
    meshWireframe = null;
    visualizationShader = null;
    highlightQuad = null;
    transforms = null;
    redraw = null;
    refreshTexture = null;
    refreshMesh = null;

    setup = null;
    draw = null;
    setupController = null;
    setupUI = null;
    setupTexture = null;
    setupVisualization = null;
    setupBrowserEvents = null;

    tabContainer = null;
    contentWindow = null;
    sourceEditor = null;
    colorPicker = null;

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.Visualization", this);

  // run the setup and draw functions
  setup.call(this);
  draw.call(this);
};
