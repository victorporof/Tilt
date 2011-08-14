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
 * The Initial Developer of the Original Code is Victor Porof.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
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
    // if initialization fails because WebGL context coulnd't be created,
    // show a corresponding alert message and open a tab to troubleshooting
    fail: function() {
      TiltChrome.BrowserOverlay.destroy(true, true);
      TiltChrome.BrowserOverlay.href = null;
      Tilt.Console.alert("Firefox", Tilt.StringBundle.get("initWebGL.error"));

      gBrowser.selectedTab =
        gBrowser.addTab("http://get.webgl.org/troubleshooting/");
    }
  }),

  /**
   * Mesh initialization properties.
   */
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
   * Scene transformations, exposing translation, rotation etc.
   * Modified by events in the controller through delegate functions.
   */
  transforms = {
    translation: vec3.create(), // scene translation, on the [x, y, z] axis
    rotation: quat4.create()    // scene rotation, expressed as a quaternion
  },

  /**
   * Variable specifying if the scene should be redrawn.
   * This happens, for example, when the visualization is translated/rotated.
   */
  redraw = true;

  /**
   * The initialization logic.
   */
  function setup() {
    if (!tilt || !tilt.gl) {
      return;
    }

    // use an extension to get the image representation of the document
    // this will be removed once the MOZ_window_region_texture WebGL extension
    // is finished; currently converting the document image to a texture
    var image = Tilt.Extensions.WebGL.initDocumentImage(window.content);

    // create a static texture using the previously created document image
    texture = new Tilt.Texture(image, {
      fill: "white", stroke: "#aaa", strokeWeight: 8
    });

    // create the visualization shaders and program to draw the stacks mesh
    visualizationShader = new Tilt.Program(
      TiltChrome.Shaders.Visualization.vs,
      TiltChrome.Shaders.Visualization.fs);

    // setup the controller, user interface, visualization mesh, and the 
    // browser event handlers
    setupController();
    setupUI();
    setupVisualization();
    setupBrowserEvents();

    // set the transformations at initialization
    transforms.translation = [0, 0, 0];
    transforms.rotation = [0, 0, 0, 1];

    // this is because of some weird behavior on Windows, if the visualization
    // has been started from the application menu, the width and height gets
    // messed up, so we need to update almost immediately after it starts
    window.setTimeout(function() {
      gResize();
      gMouseOver();
    }.bind(this), 100); 
  };

  /**
   * The rendering animation logic and loop.
   */
  function draw() {
    // if the visualization was destroyed, don't continue rendering
    if (!tilt || !tilt.gl) {
      return;
    }

    // prepare for the next frame of the animation loop
    // behind the scenes, this issues a requestAnimFrame call and updates some
    // timing variables, frame count, frame rate etc.
    tilt.loop(draw);

    // only redraw if we really have to
    if (redraw) {
      redraw = false;

      // clear the context to an opaque black background
      tilt.clear(0, 0, 0, 1);

      // apply the preliminary transformations to the model view
      tilt.translate(tilt.width / 2 + 100,
                     tilt.height / 2 - 50, -thickness * 30);

      // calculate the camera matrix using the rotation and translation
      tilt.translate(transforms.translation[0],
                     transforms.translation[1],
                     transforms.translation[2]);

      tilt.transform(quat4.toMat4(transforms.rotation));

      // draw the visualization mesh
      tilt.depthTest(true);
      tilt.strokeWeight(2);
      mesh.draw();
      meshWireframe.draw();

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
      window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils)
        .garbageCollect();
    }
  };

  /**
   * Create the combined mesh representing the document visualization by
   * traversing the document & adding a stack for each node that is drawable.
   */
  var setupVisualization = function() {
    var vertices = [],
      texCoord = [],
      indices = [],
      wireframeIndices = [],
      visibleNodes = [],
      hiddenNodes = [];

    // traverse the document and issue a callback for each node in the dom
    Tilt.Document.traverse(function(node, depth, index, uid) {

      // call the node callback in the ui
      // this is done (in the default implementation) to create a tree-like
      // representation using color coded strips for each node in the dom
      if (ui && "function" === typeof ui.domVisualizationMeshNodeCallback) {
        ui.domVisualizationMeshNodeCallback(node, depth, index, uid);
      }

      // save some information about each node in the dom
      // this will be used when showing the source editor panel popup
      var info = {
        innerHTML: node.innerHTML,
        attributes: node.attributes,
        localName: node.localName,
        className: node.className,
        id: node.id,
        uid: uid
      };

      // if css style is available for the current node, compute it now
      try {
        info.style = window.getComputedStyle(node);
      }
      catch (e) {
        info.style = "";
      }

      // skip some nodes to avoid too bloated visualization meshes
      if (node.nodeType !== 1 ||
          node.localName === "head" ||
          node.localName === "title" ||
          node.localName === "meta" ||
          node.localName === "link" ||
          node.localName === "style" ||
          node.localName === "script" ||
          node.localName === "noscript" ||
          node.localName === "span" ||
          node.localName === "option") {

        // information about these nodes should still be accessible, despite
        // the fact that they're not rendered
        hiddenNodes.push(info);
        return;
      }

      // get the x, y, width and height coordinates of a node
      var coord = Tilt.Document.getNodeCoordinates(node);

      // use this node only if it actually has visible dimensions
      if (coord.width > 4 && coord.height > 4) {
        visibleNodes.push(info);

        // number of vertex points, used for creating the indices array
        var i = vertices.length / 3, // a vertex has 3 coords: x, y & z

        // the entire mesh's pivot is the screen center
        z = depth * thickness + Math.random() / 10,
        x = coord.x - tilt.width / 2 + Math.random() / 10,
        y = coord.y - tilt.height / 2 + Math.random() / 10,
        w = coord.width,
        h = coord.height;

        // compute the vertices
        vertices.push(x,     y,     z,                    /* front */ // 0
                      x + w, y,     z,                                // 1
                      x + w, y + h, z,                                // 2
                      x,     y + h, z,                                // 3

        // we don't duplicate vertices for the left and right faces, because
        // they can be reused from the bottom and top faces; we do, however,
        // duplicate some vertices from front face, because it has custom
        // texture coordinates which are not shared by the other faces
                      x,     y + h, z - thickness,       /* top */    // 4
                      x + w, y + h, z - thickness,                    // 5
                      x + w, y + h, z,                                // 6
                      x,     y + h, z,                                // 7
                      x,     y,     z,                   /* bottom */ // 8
                      x + w, y,     z,                                // 9
                      x + w, y,     z - thickness,                    // 10
                      x,     y,     z - thickness);                   // 11

        // compute the texture coordinates
        texCoord.push((x + tilt.width  / 2    ) / texture.width,
                      (y + tilt.height / 2    ) / texture.height,
                      (x + tilt.width  / 2 + w) / texture.width,
                      (y + tilt.height / 2    ) / texture.height,
                      (x + tilt.width  / 2 + w) / texture.width,
                      (y + tilt.height / 2 + h) / texture.height,
                      (x + tilt.width  / 2    ) / texture.width,
                      (y + tilt.height / 2 + h) / texture.height,
                      -1, -1, -1, -1, -1, -1, -1, -1,
                      -1, -1, -1, -1, -1, -1, -1, -1);

        // compute the indices
        indices.push(i + 0,  i + 1,  i + 2,  i + 0,  i + 2,  i + 3,
                     i + 4,  i + 5,  i + 6,  i + 4,  i + 6,  i + 7,
                     i + 8,  i + 9,  i + 10, i + 8,  i + 10, i + 11,
                     i + 10, i + 9,  i + 6,  i + 10, i + 6,  i + 5,
                     i + 8,  i + 11, i + 4,  i + 8,  i + 4,  i + 7);

        // compute the wireframe indices
        wireframeIndices.push(i + 0,  i + 1,  i + 1,  i + 2,  
                              i + 2,  i + 3,  i + 3,  i + 0,
                              i + 4,  i + 5,  i + 5,  i + 6,  
                              i + 6,  i + 7,  i + 7,  i + 4,
                              i + 8,  i + 9,  i + 9,  i + 10, 
                              i + 10, i + 11, i + 11, i + 8,
                              i + 10, i + 9,  i + 9,  i + 6,  
                              i + 6,  i + 5,  i + 5,  i + 10);
      }
    }, function(maxDepth, totalNodes) {
      // call the ready callback in the ui
      // this is done (in the default implementation) to create a tree-like
      // representation using color coded strips for each node in the dom
      if (ui && "undefined" !== ui.domVisualizationMeshReadyCallback) {
        ui.domVisualizationMeshReadyCallback(maxDepth, totalNodes);
      }
    }.bind(this));

    // create the visualization mesh using the vertices, texture coordinates
    // and indices computed when traversing the dom
    mesh = new Tilt.Mesh({
      vertices: new Tilt.VertexBuffer(vertices, 3),
      texCoord: new Tilt.VertexBuffer(texCoord, 2),
      indices: new Tilt.IndexBuffer(indices),
      tint: [1, 1, 1, 0.85],
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
      color: "#0004",
      drawMode: tilt.LINES
    });

    // call any necessary additional mesh initialization functions
    this.performMeshColorbufferRefresh();
  }.bind(this);

  /**
   * Handle some browser events, e.g. when the tabs are selected or closed.
   */
  var setupBrowserEvents = function() {
    var tabContainer = gBrowser.tabContainer;

    // when the tab is closed or the url changes, destroy visualization
    tabContainer.addEventListener("TabClose", gClose, false);
    tabContainer.addEventListener("TabAttrModified", gClose, false);
    gBrowser.contentWindow.addEventListener("resize", gResize, false);
    gBrowser.addEventListener("mouseover", gMouseOver, false);
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
   * Setup the user interface, referencing this visualization.
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
   * Event method called when the tab container of the current browser closes.
   */
  var gClose = function(e) {
    if (TiltChrome.BrowserOverlay.href !== window.content.location.href) {
      TiltChrome.BrowserOverlay.href = null;
      TiltChrome.BrowserOverlay.destroy(true, true);
    }
  }.bind(this);

  /**
   * Event method called when the content of the current browser is resized.
   */
  var gResize = function(e) {
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

    // hide the panel with the html editor (to avoid wrong positioning)
    if ("open" === TiltChrome.BrowserOverlay.sourceEditor.state) {
      TiltChrome.BrowserOverlay.sourceEditor.hidePopup();
    }
  }.bind(this);

  /**
   * Event method called when the mouse comes over the current browser.
   */
  var gMouseOver = function() {
    this.requestRedraw();

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
   * Refreshes the visualization with the new custom global configuration
   * regarding the color codes for specified html nodes.
   */
  this.performMeshColorbufferRefresh = function() {
    this.requestRedraw();

    var config = TiltChrome.Config.UI,
      indices = mesh.indices.components,
      nodes = mesh.visibleNodes,
      color = [];

    // each stack is composed of 30 vertices, so there's information
    // about a node once in 30 iterations (to avoid duplication)
    for (var i = 0, len = indices.length; i < len; i += 30) {

      // get the node and the name to decide how to color code the node
      var node = nodes[Math.floor(i / 30)],

      // the head and body use an identical color code by default
      name = (node.localName !== "head" &&
              node.localName !== "body") ? 
              node.localName : "head/body",

      // the color settings may or not be specified for the current node name 
      settings = config.domStrips[name] ||
                 config.domStrips["other"],

      // create a gradient using the current node color code
      hex = Tilt.Math.hex2rgba(settings.fill),
      g1 = [hex[0] * 0.6, hex[1] * 0.6, hex[2] * 0.6],
      g2 = [hex[0] * 1.0, hex[1] * 1.0, hex[2] * 1.0];

      // compute the colors for each vertex in the mesh
      color.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                 g1[0], g1[1], g1[2],
                 g1[0], g1[1], g1[2],
                 g2[0], g2[1], g2[2],
                 g2[0], g2[1], g2[2],
                 g2[0], g2[1], g2[2],
                 g2[0], g2[1], g2[2],
                 g1[0], g1[1], g1[2],
                 g1[0], g1[1], g1[2]);
    }

    // create the buffer using the previously computed color array
    mesh.color = new Tilt.VertexBuffer(color, 3);
  };

  /**
   * Picks a stacked dom node at the x and y screen coordinates and opens up
   * the source editor with the corresponding information.
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   */
  this.performMeshPick = function(x, y) {
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

          // each stack is composed of 30 vertices, so there's information
          // about a node once in 30 iterations (to avoid duplication)
          node: mesh.visibleNodes[Math.floor(i / 30)],
          location: vec3.create(point)
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

      // use only the first intersection (closest to the camera)
      this.openEditor(intersections[0].node);
    }
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
          return this.openEditor(visibleNode);
        }
      }

      // second check all the hidden nodes for the uid
      // this will happen when the editor needs to open information about a
      // node that is not rendered (it isn't part of the visualization mesh)
      for (var j = 0, len2 = hiddenNodes.length; j < len2; j++) {
        var hiddenNode = hiddenNodes[j];

        // if we found the searched node uid, open the editor with the node
        if (uid === hiddenNode.uid) {
          return this.openEditor(hiddenNode);
        }
      }
    }
    else if ("object" === typeof uid) {
      var sourceEditor = TiltChrome.BrowserOverlay.sourceEditor,
        node = uid,

      // get and format the inner html text from the node
      html = Tilt.String.trim(style_html(node.innerHTML, {
          'indent_size': 2,
          'indent_char': ' ',
          'max_char': 78,
          'brace_style': 'collapse'
        })
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")) + "\n",

      // compute the custom css and attributes text from all the properties
      css = Tilt.Document.getModifiedCss(node.style),
      attr = Tilt.Document.getAttributesString(node.attributes),

      // get the elements used by the popup
      label = document.getElementById("tilt-sourceeditor-label"),
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
      if (code.editorType === "attr") {
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
    var tabContainer = gBrowser.tabContainer;

    if (gClose !== null) {
      tabContainer.removeEventListener("TabClose", gClose, false);
      tabContainer.removeEventListener("TabAttrModified", gClose, false);
      gClose = null;
    }
    if (gResize !== null) {
      gBrowser.contentWindow.removeEventListener("resize", gResize, false);
      gResize = null;
    }
    if (gMouseOver !== null) {
      gBrowser.removeEventListener("mouseover", gMouseOver, false);
      gMouseOver = null;
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
    if (transforms !== null) {
      delete transforms.rotation;
      delete transforms.translation;
      transforms = null;
    }
    if (tilt !== null) {
      tilt.destroy();
      tilt = null;
    }

    canvas = null;
    setup = null;
    draw = null;
    setupVisualization = null;
    setupBrowserEvents = null;
    setupController = null;
    setupUI = null;
    tabContainer = null;

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.Visualization", this);

  // run the setup and draw functions
  setup.call(this);
  draw.call(this);
};
