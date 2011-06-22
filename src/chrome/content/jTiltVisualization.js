/* 
 * jTiltVisualization.js - Visualization logic and drawing loop for Tilt
 * version 0.1
 *
 * Copyright (c) 2011 Victor Porof
 *
 * This software is provided 'as-is', without any express or implied
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

var EXPORTED_SYMBOLS = ["TiltVisualization"];

/**
 * TiltVisualization constructor.
 * 
 * @param {object} tilt: helper functions for easy drawing and abstraction
 * @param {object} canvas: the canvas element used for rendering
 * @param {object} image: image representing the document object model
 * @param {object} controller: the controller responsable for handling events
 * @return {object} the created object
 */
function TiltVisualization(tilt, canvas, image, controller) {
  
  /**
   * A texture representing the contents of a document object model window.
   */
  var dom = null;
  
  /**
   * The combined mesh representing the document visualization.
   */
  var mesh = {
    vertices: [],
    texCoord: [],
    indices: []
  };
  
  /**
   * The initialization logic.
   */
  tilt.setup = function() {
    // convert the dom image to a texture
    tilt.initTexture(image, function(texture) {
      dom = texture;
    }, "white", "gray", 8); // using a white background & gray margins of 8px
    
    // create the combined mesh representing the document visualization by
    // traversing the dom and adding a shape for each node that is drawable    
    TiltUtils.Document.traverse(function(node, depth) {
      // get the x, y, width and height of a node
      var coord = TiltUtils.Document.getNodeCoordinates(node);

      // use this node only if it actually has any dimensions
      if ((coord.x || coord.y || coord.width || coord.height) && depth) {
        var x = coord.x;
        var y = coord.y;
        var z = depth * 8;
        var w = coord.width;
        var h = coord.height;
        
        // number of vertex points, used for creating the indices array
        var i = mesh.vertices.length / 3; // a vertex has 3 coords: x, y and z
        
        // compute the vertices
        mesh.vertices.push(x,     y,     z);
        mesh.vertices.push(x + w, y,     z);
        mesh.vertices.push(x + w, y + h, z);
        mesh.vertices.push(x,     y + h, z);
        
        // compute the texture coordinates
        mesh.texCoord.push(
          (x    ) / canvas.clientWidth, (y    ) / canvas.clientHeight, 
          (x + w) / canvas.clientWidth, (y    ) / canvas.clientHeight,
          (x + w) / canvas.clientWidth, (y + h) / canvas.clientHeight, 
          (x    ) / canvas.clientWidth, (y + h) / canvas.clientHeight);
        
        // compute the indices
        mesh.indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
      }
    }, function() {
      // when finished, initialize the buffers
      mesh.vertices = tilt.initBuffer(mesh.vertices, 3);
      mesh.texCoord = tilt.initBuffer(mesh.texCoord, 2);
      mesh.indices = tilt.initIndexBuffer(mesh.indices);
    });
    
    // use additive blending without depth testing enabled
    tilt.blendMode("add");
    tilt.depthTest(false);
  };
  
  /**
   * The rendering animation logic and loop.
   */
  tilt.draw = function() {
    // if the visualization was destroyed, don't continue rendering
    if (!tilt) {
      return;
    }

    // prepare for the next frame of the animation loop
    tilt.requestAnimFrame(tilt.draw);
    
    // get some variables from the draw object for easier access
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    var elapsedTime = tilt.getElapsedTime();
    var frameCount = tilt.getFrameCount();
    var frameRate = tilt.getFrameRate();
    var frameDelta = tilt.getFrameDelta();
    
    // only after the draw object has finished initializing
    if (tilt.isInitialized()) {
      // set a transparent black background if the dom texture has not 
      // finished loading, or opaque otherwise
      if (!dom) {
        tilt.background("#0000");
      }
      else {
        tilt.clear();
      }
      
      // reset the model view matrix to identity
      tilt.origin();

      // if the dom texture is available, the visualization can be drawn
      if (dom) {
        // this is just a test case for now, actual implementation later
        tilt.translate(width / 2, height / 2 - 50, -400);
        tilt.rotate(0, 1, 0, TiltUtils.Math.radians(elapsedTime / 32));
        tilt.translate(-width / 2, -height / 2, 0);
        
        tilt.mesh(mesh.vertices,
                  mesh.texCoord, null, 
                  "triangles", "rgba(14, 16, 22, 255)", dom,
                  mesh.indices);
      }
    }
  };
  
  /**
   * Override the mousePressed function to handle the event.
   */
  tilt.mousePressed = function(x, y) {
    if ("function" === typeof(controller.mousePressed)) {
      controller.mousePressed(x, y);
    }
  };
  
  /**
   * Override the mouseMoved function to handle the event.
   */
  tilt.mouseMoved = function(x, y) {
    if ("function" === typeof(controller.mouseMoved)) {
      controller.mouseMoved(x, y);
    }
  };
  
  /**
   * Override the keyPressed function to handle the event.
   */
  tilt.keyPressed = function(key) {
    if ("function" === typeof(controller.keyPressed)) {
      controller.keyPressed(key);
    }
  };
    
  /**
   * Destroys this object.
   *
   * @param {function} readyCallback: function to be called when finished
   */
  this.destroy = function(readyCallback) {
    dom = null;
    mesh = null;
    
    tilt.destroy();
    tilt = null;
    
    if ("function" === typeof(readyCallback)) {
      readyCallback();
    }
  };
}