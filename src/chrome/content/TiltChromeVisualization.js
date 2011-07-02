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

if ("undefined" === typeof(TiltChrome)) {
  var TiltChrome = {};
}

var EXPORTED_SYMBOLS = ["TiltChrome.Visualization"];

/**
 * TiltChrome visualization constructor.
 * 
 * @param {object} tilt: helper functions for easy drawing and abstraction
 * @param {object} canvas: the canvas element used for rendering
 * @param {object} controller: the controller responsible for handling events
 * @return {object} the created object
 */
TiltChrome.Visualization = function(tilt, canvas, controller) {
  
  /**
   * By convention, we make a private "that" variable.
   */
  let that = this;
  
  /**
   * Variable specifying if the scene should be redrawn.
   * This happens, for example, when the visualization is rotated.
   */
  let redraw = true;
  
  /**
   * A background texture.
   */
  let background = null;
  
  /**
   * The combined mesh representing the document visualization.
   */
  let mesh = {
    vertices: [],
    texCoord: [],
    indices: [],
    wireframeIndices: [],
    thickness: 12,
    texture: null
  };
  
  /**
   * Scene transformations, expressing translation, rotation etc.
   * Modified by events in the controller through delegate functions.
   */
  let transforms = {
    translation: vec3.create(), // scene translation, on the [x, y, z] axis
    rotation: quat4.create()    // scene rotation, expressed as a quaternion
  };
  
  /**
   * The initialization logic.
   */
  tilt.setup = function() {
    // use an extension to get the image representation of the document
    Tilt.Extensions.WebGL.initDocumentImage(function(image) {
      // this will be removed once the MOZ_dom_element_texture WebGL extension
      // is finished; currently converting the document image to a texture
      tilt.initTexture(image, function(texture) {
        mesh.texture = texture;
        
        // setup the visualization, browser event handlers and the controller
        setupVisualization();
        setupBrowserEvents();
        setupController();
        
        // use a white background & gray margins of 8 pixels
      }, "white", "#aaa", 8);
    });
    
    // load the background
    tilt.initTexture("chrome://tilt/skin/background.png", function(texture) {
      background = texture;
    });
    
    // set the transformations at initialization
    transforms.translation = [0, 0, 0];
    transforms.rotation = [0, 0, 0, 1];
    tilt.strokeWeight(2);
  };
  
  /**
   * The rendering animation logic and loop.
   */
  tilt.draw = function() {
    // if the visualization was destroyed, don't continue rendering
    if (tilt === null) {
      return;
    }
    // prepare for the next frame of the animation loop
    tilt.requestAnimFrame(tilt.draw);
    
    // clear context with a transparent black background if the dom texture 
    // has not finished loading, or opaque grayish otherwise
    if (mesh.texture === null) {
      tilt.clear(0, 0, 0, 0);
    }
    else if (background !== null) {
      // only update if we really have to
      if (redraw) {
        redraw = false;
        
        // clear the context and draw a background gradient
        tilt.clear(0, 0, 0, 1);
        tilt.depthTest(false);
        tilt.image(background, 0, 0, tilt.width, tilt.height);
        
        // apply the necessary transformations to the model view
        tilt.translate(tilt.width / 2, tilt.height / 2,
                       transforms.translation[2] - mesh.thickness * 15);
                       
        tilt.transform(quat4.toMat4(transforms.rotation));
        tilt.translate(transforms.translation[0],
                       transforms.translation[1], 0);
                       
        // draw the visualization mesh
        tilt.depthTest(true);
        tilt.mesh(mesh.verticesBuff,
                  mesh.texCoordBuff, null, 
                  GL.TRIANGLES, "#fff", mesh.texture,
                  mesh.indicesBuff);
                  
        tilt.mesh(mesh.verticesBuff, null, null, 
                  GL.LINES, "#899", null,
                  mesh.wireframeIndicesBuff);
      }
      // when rendering is finished, call a loop function in the controller
      if ("function" === typeof(controller.loop)) {
        controller.loop(tilt.frameDelta);
      }
    }
  };
  
  /**
   * Create the combined mesh representing the document visualization by
   * traversing the document & adding a stack for each node that is drawable.
   */
  function setupVisualization() {
    // reset the mesh arrays
    mesh.vertices = [];
    mesh.texCoord = [];
    mesh.indices = [];
    mesh.wireframeIndices = [];
    
    // traverse the document
    Tilt.Document.traverse(function(node, depth) {
      // get the x, y, width and height coordinates of a node
      let coord = Tilt.Document.getNodeCoordinates(node);
      
      // use this node only if it actually has any dimensions
      if ((coord.width > 1 && coord.height > 1) && depth) {
        // the entire mesh's pivot is the screen center
        let x = coord.x - tilt.width / 2;
        let y = coord.y - tilt.height / 2;
        let z = depth * mesh.thickness;
        let w = coord.width;
        let h = coord.height;
        
        // number of vertex points, used for creating the indices array
        let i = mesh.vertices.length / 3; // a vertex has 3 coords: x, y & z
        
        // compute the vertices
        mesh.vertices.push(x,     y,     z);                /* front */ // 0
        mesh.vertices.push(x + w, y,     z);                            // 1
        mesh.vertices.push(x + w, y + h, z);                            // 2
        mesh.vertices.push(x,     y + h, z);                            // 3
        
        // we don't duplicate vertices for the left and right faces, because
        // they can be reused from the bottom and top faces; we do, however,
        // duplicate some vertices from front face, because it has custom
        // texture coordinates which are not shared by the other faces
        mesh.vertices.push(x,     y + h, z - mesh.thickness); /* top */ // 4
        mesh.vertices.push(x + w, y + h, z - mesh.thickness);           // 5
        mesh.vertices.push(x + w, y + h, z);                            // 6
        mesh.vertices.push(x,     y + h, z);                            // 7
        mesh.vertices.push(x,     y,     z);               /* bottom */ // 8
        mesh.vertices.push(x + w, y,     z);                            // 9
        mesh.vertices.push(x + w, y,     z - mesh.thickness);           // 10
        mesh.vertices.push(x,     y,     z - mesh.thickness);           // 11

        // compute the texture coordinates
        mesh.texCoord.push(
          (x + tilt.width  / 2    ) / mesh.texture.width,
          (y + tilt.height / 2    ) / mesh.texture.height, 
          (x + tilt.width  / 2 + w) / mesh.texture.width,
          (y + tilt.height / 2    ) / mesh.texture.height,
          (x + tilt.width  / 2 + w) / mesh.texture.width,
          (y + tilt.height / 2 + h) / mesh.texture.height, 
          (x + tilt.width  / 2    ) / mesh.texture.width,
          (y + tilt.height / 2 + h) / mesh.texture.height);
          
        // the stack margins should not be textured
        for (let k = 0; k < 2; k++) {
          mesh.texCoord.push(0, 0, 0, 0, 0, 0, 0, 0);
        }
        
        // compute the indices
        mesh.indices.push(i + 0,  i + 1,  i + 2,  i + 0,  i + 2,  i + 3);
        mesh.indices.push(i + 4,  i + 5,  i + 6,  i + 4,  i + 6,  i + 7);
        mesh.indices.push(i + 8,  i + 9,  i + 10, i + 8,  i + 10, i + 11);
        mesh.indices.push(i + 10, i + 9,  i + 6,  i + 10, i + 6,  i + 5);
        mesh.indices.push(i + 8,  i + 11, i + 4,  i + 8,  i + 4,  i + 7);
        
        // close the stack adding a back face if it's the first layer
        // if (depth === 1) {
        //   mesh.indices.push(11, 10, 5, 11, 5, 4);
        // }
        
        // compute the wireframe indices
        mesh.wireframeIndices.push(
          i + 0,  i + 1,  i + 1,  i + 2,  i + 2,  i + 3,  i + 3,  i + 0);
        mesh.wireframeIndices.push(
          i + 4,  i + 5,  i + 5,  i + 6,  i + 6,  i + 7,  i + 7,  i + 4);
        mesh.wireframeIndices.push(
          i + 8,  i + 9,  i + 9,  i + 10, i + 10, i + 11, i + 11, i + 8);
        mesh.wireframeIndices.push(
          i + 10, i + 9,  i + 9,  i + 6,  i + 6,  i + 5,  i + 5,  i + 10);
        mesh.wireframeIndices.push(
          i + 8,  i + 11, i + 11, i + 4,  i + 4,  i + 7,  i + 7,  i + 8);
      }
    }, function() {
      // when finished, initialize the buffers
      mesh.verticesBuff = tilt.initBuffer(mesh.vertices, 3);
      mesh.texCoordBuff = tilt.initBuffer(mesh.texCoord, 2);
      mesh.indicesBuff = tilt.initIndexBuffer(mesh.indices);
      mesh.wireframeIndicesBuff = tilt.initIndexBuffer(mesh.wireframeIndices);
    });
  };
  
  /**
   * Handle some browser events, when the tabs are selected or closed.
   */
  function setupBrowserEvents() {
    let tabContainer = gBrowser.tabContainer;
    
    // when another tab is focused or the tab is closed, destroy visualization
    tabContainer.addEventListener("TabSelect", destroy, false);
    tabContainer.addEventListener("TabClose", destroy, false);
    
    function destroy(e) {
      if (TiltChrome.BrowserOverlay.href !== window.content.location.href) {
        TiltChrome.BrowserOverlay.destroy();
        
        // remove event listeners
        tabContainer.removeEventListener("TabSelect", destroy, false);
        tabContainer.removeEventListener("TabClose", destroy, false);
      }
    }
  }
  
  /**
   * Setup the controller, referencing this visualization.
   */
  function setupController() {
    // set a reference in the controller for this visualization
    controller.visualization = that;
    controller.width = tilt.width;
    controller.height = tilt.height;
    
    // call the init function on the controller if available
    if ("function" === typeof(controller.init)) {
      controller.init();
    }
    
    // bind commonly used mouse and keyboard events with the controller
    if ("function" === typeof(controller.mousePressed)) {
      tilt.mousePressed = controller.mousePressed;
    }
    if ("function" === typeof(controller.mouseReleased)) {
      tilt.mouseReleased = controller.mouseReleased;
    }
    if ("function" === typeof(controller.mouseClicked)) {
      tilt.mouseClicked = controller.mouseClicked;
    }
    if ("function" === typeof(controller.mouseMoved)) {
      tilt.mouseMoved = controller.mouseMoved;
    }
    if ("function" === typeof(controller.mouseOver)) {
      tilt.mouseOver = controller.mouseOver;
    }
    if ("function" === typeof(controller.mouseOut)) {
      tilt.mouseOut = controller.mouseOut;
    }
    if ("function" === typeof(controller.mouseScroll)) {
      tilt.mouseScroll = controller.mouseScroll;
    }
    if ("function" === typeof(controller.keyPressed)) {
      tilt.keyPressed = controller.keyPressed;
    }
    if ("function" === typeof(controller.keyTyped)) {
      tilt.keyReleased = controller.keyTyped;
    }
    if ("function" === typeof(controller.keyReleased)) {
      tilt.keyReleased = controller.keyReleased;
    }
    if ("function" === typeof(controller.resize)) {
      tilt.resize = controller.resize;
    }
  };
  
  /**
   * Delegate translation method, used by the controller.
   *
   * @param {number} x: the new translation on the x axis
   * @param {number} y: the new translation on the y axis
   * @param {number} z: the new translation on the z axis
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
   *
   * @param {array} quaternion: the rotation quaternion, as [x, y, z, w]
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
   * Destroys this object and sets all members to null.
   *
   * @param {function} readyCallback: function to be called when finished
   */
  this.destroy = function(readyCallback) {
    for (var i in that) {
      that[i] = null;
    }
    
    redraw = false;
    background = null;
    mesh = null;
    transforms = null;
    
    tilt.destroy();
    tilt = null;
    canvas = null;
    
    if ("function" === typeof(controller.destroy)) {
      controller.destroy();
    }
    
    if ("function" === typeof(readyCallback)) {
      readyCallback();
      readyCallback = null;
    }
    
    controller = null;
    that = null;
  };
}