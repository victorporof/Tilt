/*
 * TiltChromeVisualization.js - Visualization logic and drawing loop for Tilt
 * version 0.1
 *
 * Copyright (c) 2011 Victor Porof
 *
 * This software is provided "as-is", without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */
"use strict";

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.Visualization"];

/**
 * TiltChrome visualization constructor.
 *
 * @param {HTMLCanvasElement} canvas: the canvas element used for rendering
 * @param {TiltChrome.Controller} controller: the controller handling events
 * @param {TiltChrome.GUI} controller: the visualization user interface
 * @return {TiltChrome.Visualization} the newly created object
 */
TiltChrome.Visualization = function(canvas, controller, gui) {

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
   * A background texture.
   */
  background = null,

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
    setupVisualization.call(this);
    setupBrowserEvents.call(this);
    setupController.call(this);
    setupGUI.call(this);

    // load the background
    background = new Tilt.Texture("chrome://tilt/skin/tilt-background.png");

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

    if (background.loaded) {
      // only update if we really have to
      if (redraw) {
        redraw = false;

        // clear the context and draw a background gradient
        tilt.clear(0, 0, 0, 1);
        tilt.depthTest(false);
        tilt.image(background, 0, 0, tilt.width, tilt.height);

        // apply the necessary transformations to the model view
        tilt.translate(tilt.width / 2,
                       tilt.height / 2 - 30,
                       transforms.translation[2] - thickness * 25);

        tilt.transform(quat4.toMat4(transforms.rotation));
        tilt.translate(transforms.translation[0],
                       transforms.translation[1], 0);

        // draw the visualization mesh
        tilt.depthTest(true);
        tilt.strokeWeight(2);
        mesh.draw();
        meshWireframe.draw();

        gui.draw(tilt.frameDelta);
      }

      // when rendering is finished, call a loop function in the controller
      if ("function" === typeof controller.loop) {
        controller.loop(tilt.frameDelta);
      }
    }

    // every once in a while, do a garbage collect
    // this is not vital, but it's good to keep things in control
    if ((tilt.frameCount + 1) % 1000 === 0) {
      window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils)
        .garbageCollect();
    }

    // this is because of some weird behaviour on Windows, if the visualization 
    // has been started from the application menu, the width and height gets
    // messed up, so we need to update almost immediately after it starts
    if (tilt.frameCount === 10) {
      tilt.width = window.content.innerWidth;
      tilt.height = window.content.innerHeight;

      if (canvas.width !== tilt.width || canvas.height !== tilt.height) {
        canvas.width = tilt.width;
        canvas.height = tilt.height;

        controller.resize(tilt.width, tilt.height);
        tilt.gl.viewport(0, 0, canvas.width, canvas.height);

        redraw = true;
      }
    }
  };

  // run the setup and draw functions
  setup.call(this);
  draw.call(this);

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
    Tilt.Document.traverse(function(node, depth) {
      if (node.localName === "a" ||
          node.localName === "b" ||
          node.localName === "i" ||
          node.localName === "u" ||
          node.localName === "img") {
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
        vertices.push(x,     y,     z);                     /* front */ // 0
        vertices.push(x + w, y,     z);                                 // 1
        vertices.push(x + w, y + h, z);                                 // 2
        vertices.push(x,     y + h, z);                                 // 3

        // we don't duplicate vertices for the left and right faces, because
        // they can be reused from the bottom and top faces; we do, however,
        // duplicate some vertices from front face, because it has custom
        // texture coordinates which are not shared by the other faces
        vertices.push(x,     y + h, z - thickness);         /* top */    // 4
        vertices.push(x + w, y + h, z - thickness);                      // 5
        vertices.push(x + w, y + h, z);                                  // 6
        vertices.push(x,     y + h, z);                                  // 7
        vertices.push(x,     y,     z);                     /* bottom */ // 8
        vertices.push(x + w, y,     z);                                  // 9
        vertices.push(x + w, y,     z - thickness);                      // 10
        vertices.push(x,     y,     z - thickness);                      // 11

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
          name: node.localName,
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
        wireframeIndices.push(
          i + 8,  i + 11, i + 11, i + 4,  i + 4,  i + 7,  i + 7,  i + 8);
      }
    });

    mesh = new Tilt.Mesh({
      vertices: new Tilt.VertexBuffer(vertices, 3),
      texCoord: new Tilt.VertexBuffer(texCoord, 2),
      indices: new Tilt.IndexBuffer(indices),
      color: "#fff",
      texture: texture,
      nodes: nodes
    });

    meshWireframe = new Tilt.Mesh({
      vertices: mesh.vertices,
      indices: new Tilt.IndexBuffer(wireframeIndices),
      color: "#999",
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
  function setupGUI() {
    // set a reference in the user interface for this visualization
    gui.visualization = this;

    // call the init function on the user interface if available
    if ("function" === typeof gui.init) {
      gui.init(canvas);
    }
  };
  
  /**
   * Delegate method, sending a redraw signal.
   */
  this.redraw = function() {
    redraw = true;
  };

  /**
   * Delegate translation method, used by the controller.
   *
   * @param {Number} x: the new translation on the x axis
   * @param {Number} y: the new translation on the y axis
   * @param {Number} z: the new translation on the z axis
   */
  this.setTranslation = function(x, y, z) {
    if (transforms.translation[0] != x ||
        transforms.translation[1] != y ||
        transforms.translation[2] != z) {

      transforms.translation[0] = x;
      transforms.translation[1] = y;
      transforms.translation[2] = z;
      redraw = true;
    }
  };

  /**
   * Delegate rotation method, used by the controller.
   * @param {Array} quaternion: the rotation quaternion, as [x, y, z, w]
   */
  this.setRotation = function(quaternion) {
    if (transforms.rotation[0] != quaternion[0] ||
        transforms.rotation[1] != quaternion[1] ||
        transforms.rotation[2] != quaternion[2] ||
        transforms.rotation[3] != quaternion[3]) {

      quat4.set(quaternion, transforms.rotation);
      redraw = true;
    }
  };

  /**
   * Delegate click method, used by the controller.
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   */
  this.click = function(x, y) {
    if ("function" === typeof gui.click) {
      gui.click(x, y);
    }

    // set the focus back to the window content if it was somewhere else
    TiltChrome.BrowserOverlay.panel.hidePopup();
    window.content.focus();

    redraw = true;
  };

  /**
   * Delegate double click method, used by the controller.
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   */
  this.doubleClick = function(x, y) {
    if ("function" === typeof gui.doubleClick) {
      gui.doubleClick(x, y);
    }

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
        html = Tilt.String.trim(
          style_html(intersection.node.innerHTML, {
            'indent_size': 2,
            'indent_char': ' ',
            'max_char': 78,
            'brace_style': 'collapse'
          })
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")),

      // get the elements used by the popup
      label = document.getElementById("tilt-panel-label"),
      iframe = document.getElementById("tilt-panel-iframe"),
      editor = iframe.contentDocument.getElementById("editor");

      // set the title label of the popup panel
      label.value = " <" + node.name +
        (node.className ? " class=\"" + node.className + "\"" : "") +
        (node.id ? " id=\"" + node.id + "\"" : "") + ">";

      // show the popup panel containing the html editor iframe
      TiltChrome.BrowserOverlay.panel.openPopup(null, "overlap",
        window.innerWidth - iframe.width - 21,
        window.innerHeight - iframe.height - 77, false, false);

      // get the content document containing the html editor, and add the html
      editor.innerHTML = html;
      iframe.contentWindow.onload();
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

    // hide the panel with the html editor (to avoid wrong positioning) 
    TiltChrome.BrowserOverlay.panel.hidePopup();
  };

  /**
   * Event method called when the mouse comes over the current browser.
   */
  function gMouseOver() {
    redraw = true;

    if (canvas.width !== tilt.width || canvas.height !== tilt.height) {
      canvas.width = tilt.width;
      canvas.height = tilt.height;

      controller.resize(tilt.width, tilt.height);
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

      gui.destroy(canvas);
      gui = null;

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

    for (var i in this) {
      try {
        if ("function" === typeof this[i].destroy) {
          this[i].destroy();
        }
      }
      catch(e) {}
      finally {
        delete this[i];
      }
    }
  };
};
