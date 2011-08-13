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
  var tilt = new Tilt.Renderer(canvas, function failCallback() {

    // if initialization fails because WebGL context coulnd't be created,
    // show a corresponding alert message and open a tab to troubleshooting
    TiltChrome.BrowserOverlay.destroy(true, true);
    TiltChrome.BrowserOverlay.href = null;
    Tilt.Console.alert("Firefox", Tilt.StringBundle.get("initWebGL.error"));

    gBrowser.selectedTab =
      gBrowser.addTab("http://get.webgl.org/troubleshooting/");
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
    if (tilt === null || tilt.gl === null || "undefined" === typeof tilt.gl) {
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

    // setup the controller, user interface, visualization mesh, and the 
    // browser event handlers
    setupController.call(this);
    setupUI.call(this);
    setupVisualization.call(this);
    setupBrowserEvents.call(this);

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
    if (tilt === null || tilt.gl === null || "undefined" === typeof tilt.gl) {
      return;
    }

    // prepare for the next frame of the animation loop
    // behind the scenes, this issues a requestAnimFrame and updates some
    // timing variables, frame count, frame rate etc.
    tilt.loop(draw);

    // only redraw if we really have to
    if (redraw) {
      redraw = true;

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
      ui ? ui.draw(tilt.frameDelta) : 0;
    }

    // when rendering is finished, call a loop function in the controller
    if (controller && "function" === typeof controller.loop) {
      controller.loop(tilt.frameDelta);
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
  function setupVisualization() {
    // reset the mesh arrays
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
      if (node.nodeType === 3 ||  // TEXT_NODE
          node.nodeType === 10 || // DOCUMENT_TYPE_NODE
          node.localName === "head" ||
          node.localName === "title" ||
          node.localName === "meta" ||
          node.localName === "script" ||
          node.localName === "noscript" ||
          node.localName === "style" ||
          node.localName === "link" ||
          node.localName === "span" ||
          node.localName === "option" ||
          node.localName === "a" ||
          node.localName === "b" ||
          node.localName === "i" ||
          node.localName === "u") {

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

        // the entire mesh's pivot is the screen center
        var x = coord.x - tilt.width / 2 + Math.random() / 10,
         y = coord.y - tilt.height / 2 + Math.random() / 10,
         z = depth * thickness + Math.random() / 10,
         w = coord.width,
         h = coord.height;

        // number of vertex points, used for creating the indices array
        var i = vertices.length / 3; // a vertex has 3 coords: x, y & z

        // compute the vertices
        vertices.push(x,     y,     z);                   /* front */ // 0
        vertices.push(x + w, y,     z);                               // 1
        vertices.push(x + w, y + h, z);                               // 2
        vertices.push(x,     y + h, z);                               // 3

        // we don't duplicate vertices for the left and right faces, because
        // they can be reused from the bottom and top faces; we do, however,
        // duplicate some vertices from front face, because it has custom
        // texture coordinates which are not shared by the other faces
        vertices.push(x,     y + h, z - thickness);      /* top */    // 4
        vertices.push(x + w, y + h, z - thickness);                   // 5
        vertices.push(x + w, y + h, z);                               // 6
        vertices.push(x,     y + h, z);                               // 7
        vertices.push(x,     y,     z);                  /* bottom */ // 8
        vertices.push(x + w, y,     z);                               // 9
        vertices.push(x + w, y,     z - thickness);                   // 10
        vertices.push(x,     y,     z - thickness);                   // 11

        // compute the texture coordinates
        texCoord.push(
          (x + tilt.width  / 2    ) / texture.width,
          (y + tilt.height / 2    ) / texture.height,
          (x + tilt.width  / 2 + w) / texture.width,
          (y + tilt.height / 2    ) / texture.height,
          (x + tilt.width  / 2 + w) / texture.width,
          (y + tilt.height / 2 + h) / texture.height,
          (x + tilt.width  / 2    ) / texture.width,
          (y + tilt.height / 2 + h) / texture.height);

        // the stack margins should not be textured
        for (var k = 0; k < 2; k++) {
          texCoord.push(0, 0, 0, 0, 0, 0, 0, 0);
        }

        // compute the indices
        indices.push(i + 0,  i + 1,  i + 2,  i + 0,  i + 2,  i + 3);
        indices.push(i + 4,  i + 5,  i + 6,  i + 4,  i + 6,  i + 7);
        indices.push(i + 8,  i + 9,  i + 10, i + 8,  i + 10, i + 11);
        indices.push(i + 10, i + 9,  i + 6,  i + 10, i + 6,  i + 5);
        indices.push(i + 8,  i + 11, i + 4,  i + 8,  i + 4,  i + 7);

        // close the stack adding a back face if it's the first layer
        // if (depth === 0) {
        //   indices.push(11, 10, 5, 11, 5, 4);
        // }

        // compute the wireframe indices
        wireframeIndices.push(
          i + 0,  i + 1,  i + 1,  i + 2,  i + 2,  i + 3,  i + 3,  i + 0);
        wireframeIndices.push(
          i + 4,  i + 5,  i + 5,  i + 6,  i + 6,  i + 7,  i + 7,  i + 4);
        wireframeIndices.push(
          i + 8,  i + 9,  i + 9,  i + 10, i + 10, i + 11, i + 11, i + 8);
        wireframeIndices.push(
          i + 10, i + 9,  i + 9,  i + 6,  i + 6,  i + 5,  i + 5,  i + 10);
      }
    }, function(maxDepth, totalNodes) {
      // call the ready callback in the ui
      // this is done (in the default implementation) to create a tree-like
      // representation using color coded strips for each node in the dom
      if (ui && "undefined" !== ui.domVisualizationMeshReadyCallback) {
        ui.domVisualizationMeshReadyCallback(maxDepth, totalNodes);
      }
    });

    // create the visualization mesh using the vertices, texture coordinates
    // and indices computed when traversing the dom
    mesh = new Tilt.Mesh({
      vertices: new Tilt.VertexBuffer(vertices, 3),
      texCoord: new Tilt.VertexBuffer(texCoord, 2),
      indices: new Tilt.IndexBuffer(indices),
      color: "#fffd",
      texalpha: 255,
      texture: texture,
      visibleNodes: visibleNodes,
      hiddenNodes: hiddenNodes
    });

    // additionally, create a wireframe representation to make the 
    // visualization a bit more pretty
    meshWireframe = new Tilt.Mesh({
      vertices: mesh.vertices,
      indices: new Tilt.IndexBuffer(wireframeIndices),
      color: "#0004",
      drawMode: tilt.LINES
    });
  };

  /**
   * Handle some browser events, e.g. when the tabs are selected or closed.
   */
  function setupBrowserEvents() {
    var tabContainer = gBrowser.tabContainer;

    // when the tab is closed or the url changes, destroy visualization
    tabContainer.addEventListener("TabClose", gClose, false);
    tabContainer.addEventListener("TabAttrModified", gClose, false);
    gBrowser.contentWindow.addEventListener("resize", gResize, false);
    gBrowser.addEventListener("mouseover", gMouseOver, false);
  };

  /**
   * Setup the controller, referencing this visualization.
   */
  function setupController() {
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
  };

  /**
   * Setup the user interface, referencing this visualization.
   */
  function setupUI() {
    // we might have the interface undefined (not passed as a parameter in 
    // the constructor, in which case the interface won't be used)
    if ("undefined" === typeof ui) {
      return;
    }

    // set a reference in the ui for this visualization and the controller
    ui.visualization = this;
    ui.controller = controller;

    // call the init function on the user interface if available
    if ("function" === typeof ui.init) {
      ui.init(canvas);
    }
  };

  /**
   * Event method called when the tab container of the current browser closes.
   */
  function gClose(e) {
    if (TiltChrome.BrowserOverlay.href !== window.content.location.href) {
      TiltChrome.BrowserOverlay.href = null;
      TiltChrome.BrowserOverlay.destroy(true, true);
    }
  };

  /**
   * Event method called when the content of the current browser is resized.
   */
  function gResize(e) {
    tilt.width = window.content.innerWidth;
    tilt.height = window.content.innerHeight;
    redraw = true;

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
  };

  /**
   * Event method called when the mouse comes over the current browser.
   */
  function gMouseOver() {
    redraw = true;

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
  };

/* The following are delegate functions used in the controller or the UI.
 * ------------------------------------------------------------------------ */

  /**
   * Redraws the visualization once.
   * Call this from the controller or ui to update rendering.
   */
  this.performRedraw = function() {
    redraw = true;
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
      point = vec3.create(),
      intersections = [],
      indices = mesh.indices.components,
      vertices = mesh.vertices.components,
      i, len, v0, v1, v2;

    // check each triangle in the visualization mesh for intersections with
    // the mouse ray (using a simple ray picking algorithm)
    for (i = 0, len = indices.length; i < len; i += 3) {

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
          location: vec3.create(point),
          node: mesh.visibleNodes[Math.floor(i / 30)]
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
        hiddenNodes = mesh.hiddenNodes,
        node, i, len;

      // first check all the visible nodes for the uid
      // we're not using hashtables for this because it's not necessary, as
      // this function is called very few times
      for (i = 0, len = visibleNodes.length; i < len; i++) {
        node = visibleNodes[i];

        // if we found the searched node uid, open the editor with the node
        if (uid === node.uid) {
          return this.openEditor(node);
        }
      }

      // second check all the hidden nodes for the uid
      // this will happen when the editor needs to open information about a
      // node that is not rendered (it isn't part of the visualization mesh)
      for (i = 0, len = hiddenNodes.length; i < len; i++) {
        node = hiddenNodes[i];

        // if we found the searched node uid, open the editor with the node
        if (uid === node.uid) {
          return this.openEditor(node);
        }
      }
    }
    else if ("object" === typeof uid) {
      var node = uid,

      // get and format the inner html text from the node
      html = Tilt.String.trim(
        style_html(node.innerHTML, {
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
      TiltChrome.BrowserOverlay.sourceEditor.openPopup(null, "overlap",
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
  };

  /**
   * Show the computed css contents of a dom node in the editor if open.
   */
  this.setCssEditor = function() {
    var iframe = document.getElementById("tilt-sourceeditor-iframe"),
      code = iframe.contentDocument.getElementById("code");

    code.innerHTML = code.css;
    code.editorType = "css";
  };

  /**
   * Show the specific attributes for a dom node in the editor if open.
   */
  this.setAttributesEditor = function() {
    var iframe = document.getElementById("tilt-sourceeditor-iframe"),
      code = iframe.contentDocument.getElementById("code");

    code.innerHTML = code.attr;
    code.editorType = "attr";
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
      redraw = true;
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
      redraw = true;
    }
  };

  /**
   * Delegate method, setting the color for the visualization wireframe mesh.
   * @param {Array} color: the color expressed as [r, g, b, a] between 0..1
   */
  this.setMeshWireframeColor = function(color) {
    meshWireframe.color = color;
  };

  /**
   * Delegate method, setting the alpha for the visualization wireframe mesh.
   * @param {Number} alpha: the alpha expressed as number between 0..1
   */
  this.setMeshWireframeAlpha = function(alpha) {
    meshWireframe.color[3] = alpha;
  };

  /**
   * Delegate method, setting the color for the visualization mesh.
   * @param {Array} color: the color expressed as [r, g, b, a] between 0..1
   */
  this.setMeshColor = function(color) {
    mesh.color = color;
  };

  /**
   * Delegate method, setting the color alpha for the visualization mesh.
   * @param {Number} alpha: the alpha expressed as number between 0..1
   */
  this.setMeshAlpha = function(alpha) {
    mesh.color[3] = alpha;
  };

  /**
   * Delegate method, setting the texture alpha for the visualization mesh.
   * @param {Number} alpha: the alpha expressed as number between 0..1
   */
  this.setMeshTextureAlpha = function(alpha) {
    mesh.texalpha = alpha;
  };

  /**
   * Sets the current draw mode for the mesh.
   * @param {String} mode: either 'fill', 'stroke' or 'both'
   */
  this.setMeshDrawMode = function(mode) {
    if (mode === "fill") {
      mesh.hidden = false;
      meshWireframe.hidden = true;
    }
    else if (mode === "stroke") {
      mesh.hidden = true;
      meshWireframe.hidden = false;
    }
    else if (mode === "both") {
      mesh.hidden = false;
      meshWireframe.hidden = false;
    }
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

    if (controller !== null && "function" === typeof controller.destroy) {
      controller.destroy(canvas);
      controller = null;
    }
    if (ui !== null && "function" === typeof ui.destroy) {
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
