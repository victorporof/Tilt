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
 * @param {TiltChrome.GUI} ui: the visualization user interface
 * @return {TiltChrome.Visualization} the newly created object
 */
TiltChrome.Visualization = function(canvas, controller, ui) {

  /**
   * Create the Tilt object, containing useful functions for easy drawing
   */
  var tilt = new Tilt.Renderer(canvas, function failCallback() {
    TiltChrome.BrowserOverlay.destroy(true, true);
    TiltChrome.BrowserOverlay.href = null;
    Tilt.Console.alert("Tilt", Tilt.StringBundle.get("initWebGL.error"));

    gBrowser.selectedTab =
      gBrowser.addTab("http://get.webgl.org/troubleshooting/");
  }),

  /**
   * Variable specifying if the scene should be redrawn.
   * This happens, for example, when the visualization is rotated.
   */
  redraw = true,

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
   * Scene transformations, expressing translation, rotation etc.
   * Modified by events in the controller through delegate functions.
   */
  transforms = {
    translation: vec3.create(), // scene translation, on the [x, y, z] axis
    rotation: quat4.create()    // scene rotation, expressed as a quaternion
  };

  /**
   * The initialization logic.
   */
  function setup() {
    if (tilt === null || tilt.gl === null || "undefined" === typeof tilt.gl) {
      return;
    }

    // use an extension to get the image representation of the document
    // this will be removed once the MOZ_dom_element_texture WebGL extension
    // is finished; currently converting the document image to a texture
    var image = Tilt.Extensions.WebGL.initDocumentImage(window.content);

    // create a static texture using the previously created document image
    texture = new Tilt.Texture(image, {
      fill: "white", stroke: "#aaa", strokeWeight: 8
    });

    // setup the visualization, browser event handlers and the controller
    setupController.call(this);
    setupUI.call(this);
    setupVisualization.call(this);
    setupBrowserEvents.call(this);

    // set the transformations at initialization
    transforms.translation = [0, 0, 0];
    transforms.rotation = [0, 0, 0, 1];
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
    tilt.loop(draw);

    // only update if we really have to
    if (redraw) {
      redraw = true;

      // clear the context and draw a background gradient
      tilt.clear(0, 0, 0, 1);
      ui.background(tilt.frameDelta);

      // apply the preliminary transformations to the model view
      tilt.translate(tilt.width / 2 + 50,
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

      ui.draw(tilt.frameDelta);
    }

    // when rendering is finished, call a loop function in the controller
    if ("function" === typeof controller.loop) {
      controller.loop(tilt.frameDelta);
    }

    // every once in a while, do a garbage collect
    // this is not vital, but it's good to keep things in control
    if ((tilt.frameCount + 1) % 1000 === 0) {
      window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils)
        .garbageCollect();
    }

    // this is because of some weird behavior on Windows, if the visualization
    // has been started from the application menu, the width and height gets
    // messed up, so we need to update almost immediately after it starts
    if (tilt.frameCount === 10) {
      tilt.width = window.content.innerWidth;
      tilt.height = window.content.innerHeight;

      if (canvas.width !== tilt.width || canvas.height !== tilt.height) {
        canvas.width = tilt.width;
        canvas.height = tilt.height;

        if ("function" === typeof controller.resize) {
          controller.resize(tilt.width, tilt.height);
        }
        if ("function" === typeof ui.resize) {
          ui.resize(tilt.width, tilt.height);
        }

        tilt.gl.viewport(0, 0, canvas.width, canvas.height);
        redraw = true;
      }
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
      nodes = [];

    // traverse the document
    Tilt.Document.traverse(function(node, depth, index) {
      // call the node callback in the ui
      if ("function" === typeof ui.nodeCallback) {
        ui.nodeCallback(node, depth, index);
      }

      if (node.nodeType === 3 ||
          node.nodeType === 10 ||
          node.localName === "span" ||
          node.localName === "option" ||
          node.localName === "a" ||
          node.localName === "b" ||
          node.localName === "i" ||
          node.localName === "u") {
        return;
      }

      // get the x, y, width and height coordinates of a node
      var coord = Tilt.Document.getNodeCoordinates(node);

      // use this node only if it actually has any dimensions
      if (coord.width > 4 && coord.height > 4) {
        // the entire mesh's pivot is the screen center
        var x = coord.x - tilt.width / 2,
         y = coord.y - tilt.height / 2,
         z = depth * thickness,
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

        // save the inner html for each triangle
        nodes.push({
          innerHTML: node.innerHTML,
          style: window.getComputedStyle(node),
          localName: node.localName,
          className: node.className,
          id: node.id
        });

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
    });

    mesh = new Tilt.Mesh({
      vertices: new Tilt.VertexBuffer(vertices, 3),
      texCoord: new Tilt.VertexBuffer(texCoord, 2),
      indices: new Tilt.IndexBuffer(indices),
      color: "#fffd",
      texalpha: 255,
      texture: texture,
      nodes: nodes
    });

    meshWireframe = new Tilt.Mesh({
      vertices: mesh.vertices,
      indices: new Tilt.IndexBuffer(wireframeIndices),
      color: "#0004",
      drawMode: tilt.LINES
    });
  };

  /**
   * Handle some browser events, when the tabs are selected or closed.
   */
  function setupBrowserEvents() {
    // when the tab is closed or the url changes, destroy visualization
    gBrowser.tabContainer.addEventListener("TabClose", gClose, 0);
    gBrowser.tabContainer.addEventListener("TabAttrModified", gClose, 0);
    gBrowser.contentWindow.addEventListener("resize", gResize, 0);
    gBrowser.addEventListener("mouseover", gMouseOver, 0);
  };

  /**
   * Setup the controller, referencing this visualization.
   */
  function setupController() {
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
    // set a reference in the user interface for this visualization
    ui.visualization = this;
    ui.controller = controller;

    // call the init function on the user interface if available
    if ("function" === typeof ui.init) {
      ui.init(canvas);
    }
  };

  /**
   * Redraws the visualization once.
   * Call this from the controller or ui to update rendering.
   */
  this.redraw = function() {
    redraw = true;
  };

  /**
   * Delegate translation method, used by the controller.
   * @param {Array} translation: the new translation on the [x, y, z] axis
   */
  this.setTranslation = function(translation) {
    var x = translation[0],
      y = translation[1],
      z = translation[2];

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
      tilt.strokeWeight(0);
    }
    else if (mode === "stroke") {
      mesh.hidden = true;
      meshWireframe.hidden = false;
      tilt.strokeWeight(1);
    }
    else if (mode === "both") {
      mesh.hidden = false;
      meshWireframe.hidden = false;
      tilt.strokeWeight(2);
    }
  };

  /**
   * Delegate click method, issued by the controller.
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   */
  this.click = function(x, y) {
    if ("open" === TiltChrome.BrowserOverlay.panel.state) {
      TiltChrome.BrowserOverlay.panel.hidePopup();
    }

    // set the focus back to the window content if it was somewhere else
    window.content.focus();
    redraw = true;
  };

  /**
   * Delegate double click method, issued by the controller.
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   */
  this.doubleClick = function(x, y) {
    // create a ray following the mouse direction from the near clipping plane
    // to the far clipping plane, to check for intersections with the mesh
    var ray = Tilt.Math.createRay([x, y, 0], [x, y, 1],
                                  [0, 0, tilt.width, tilt.height],
                                  mesh.mvMatrix,
                                  mesh.projMatrix),
      point = vec3.create(),
      intersections = [],
      i, len, v0, v1, v2;

    for (i = 0, len = mesh.indices.length; i < len; i += 3) {
      v0 = [mesh.vertices[mesh.indices[i    ] * 3    ],
            mesh.vertices[mesh.indices[i    ] * 3 + 1],
            mesh.vertices[mesh.indices[i    ] * 3 + 2]];

      v1 = [mesh.vertices[mesh.indices[i + 1] * 3    ],
            mesh.vertices[mesh.indices[i + 1] * 3 + 1],
            mesh.vertices[mesh.indices[i + 1] * 3 + 2]];

      v2 = [mesh.vertices[mesh.indices[i + 2] * 3    ],
            mesh.vertices[mesh.indices[i + 2] * 3 + 1],
            mesh.vertices[mesh.indices[i + 2] * 3 + 2]];

      // for each triangle in the mesh, check to see if the mouse ray
      // intersects the triangle
      if (Tilt.Math.intersectRayTriangle(v0, v1, v2, ray, point) > 0) {
        // save the intersection, along with the node information
        intersections.push({
          location: vec3.create(point),
          node: mesh.nodes[Math.floor(i / 30)]
        });
      }
    }

    // if there were any intersections, sort them by the distance towards the
    // camera, and show a panel with the node information
    if (intersections.length > 0) {
      intersections.sort(function(a, b) {
        if (a.location[2] < b.location[2]) {
          return 1;
        }
        else {
          return -1;
        }
      });

      // use only the first intersection (closest to the camera)
      var intersection = intersections[0],
        node = intersection.node,

      // get and format the inner html text from the node
      html = Tilt.String.trim(
        style_html(intersection.node.innerHTML, {
          'indent_size': 2,
          'indent_char': ' ',
          'max_char': 78,
          'brace_style': 'collapse'
        })
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")) + "\n",

      // compute the custom css text from all the properties
      css = Tilt.Document.getModifiedCss(intersection.node.style),

      // get the elements used by the popup
      label = document.getElementById("tilt-panel-label"),
      iframe = document.getElementById("tilt-panel-iframe"),
      editor = iframe.contentDocument.getElementById("editor");

      // set the title label of the popup panel
      label.value = " <" + node.localName +
        (node.className ? " class=\"" + node.className + "\"" : "") +
        (node.id ? " id=\"" + node.id + "\"" : "") + ">";

      // show the popup panel containing the html editor iframe
      TiltChrome.BrowserOverlay.panel.openPopup(null, "overlap",
        window.innerWidth - iframe.width - 21,
        window.innerHeight - iframe.height - 77, false, false);

      // get the content document containing the html editor, and add the html
      editor.innerHTML = html;
      iframe.contentWindow.refreshEditor("html");
    }

    redraw = true;
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

    if ("function" === typeof controller.resize) {
      controller.resize(tilt.width, tilt.height);
    }
    if ("function" === typeof ui.resize) {
      ui.resize(tilt.width, tilt.height);
    }

    // hide the panel with the html editor (to avoid wrong positioning)
    if ("open" === TiltChrome.BrowserOverlay.panel.state) {
      TiltChrome.BrowserOverlay.panel.hidePopup();
    }
  };

  /**
   * Event method called when the mouse comes over the current browser.
   */
  function gMouseOver() {
    redraw = true;

    if (canvas.width !== tilt.width || canvas.height !== tilt.height) {
      canvas.width = tilt.width;
      canvas.height = tilt.height;

      tilt.gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    }
  }

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function() {
    gBrowser.tabContainer.removeEventListener("TabClose", gClose, 0);
    gBrowser.tabContainer.removeEventListener("TabAttrModified", gClose, 0);
    gBrowser.contentWindow.removeEventListener("resize", gResize, 0);
    gBrowser.removeEventListener("mouseover", gMouseOver, 0);

    try {
      tilt.destroy();
      tilt = null;

      controller.destroy(canvas);
      controller = null;

      ui.destroy(canvas);
      ui = null;

      background.destroy();
      background = null;

      texture.destroy();
      texture = null;

      mesh.destroy();
      mesh = null;

      meshWireframe.destroy();
      meshWireframe = null;

      delete transforms.rotation;
      delete transforms.translation;
      transforms = null;
    }
    catch (e) {}

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.Visualization", this);  

  // run the setup and draw functions
  setup.call(this);
  draw.call(this);
};
