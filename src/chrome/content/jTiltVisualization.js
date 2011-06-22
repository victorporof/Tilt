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
if ("undefined" === typeof(TiltChrome)) {
  var TiltChrome = {};
}

var EXPORTED_SYMBOLS = ["TiltChrome.Visualization"];

/**
 * Tilt visualization constructor.
 * 
 * @param {object} tilt: helper functions for easy drawing and abstraction
 * @param {object} canvas: the canvas element used for rendering
 * @param {object} image: image representing the document object model
 * @param {object} controller: the controller responsable for handling events
 * @return {object} the created object
 */
TiltChrome.Visualization = function(tilt, canvas, image, controller) {

  /**
   * By convention, we make a private 'that' variable.
   */
  var that = this;
  
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
   * Scene transformations, expressing translation, rotation etc.
   * Modified by events in the controller through delegate functions.
   */
  var transforms = {
    translation: [], // scene translation, on the [x, y, z] axis
    rotation: []     // scene rotation, expressed in radians as [x, y, z]
  };
  
  /**
   * The initialization logic.
   */
  tilt.setup = function() {
    // set a reference in the controller for this visualization
    controller.visualization = that;
    controller.canvas = canvas;
    
    // convert the dom image to a texture
    tilt.initTexture(image, function(texture) {
      dom = texture;
    }, "white", "gray", 8); // using a white background & gray margins of 8px
    
    // create the combined mesh representing the document visualization by
    // traversing the dom and adding a shape for each node that is drawable    
    Tilt.Utils.Document.traverse(function(node, depth) {
      // get the x, y, width and height of a node
      var coord = Tilt.Utils.Document.getNodeCoordinates(node);

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
    
    // set the transformations at initialization
    transforms.translation = [0, -50, -400];
    transforms.rotation = [0, 0, 0];
    
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
        // this is just a test case for now, actual implementation soon
        tilt.translate(transforms.translation[0] + canvas.clientWidth / 2,
                       transforms.translation[1] + canvas.clientHeight / 2,
                       transforms.translation[2]);

        tilt.rotateY(transforms.rotation[1]);
        tilt.rotateX(transforms.rotation[0]);
        tilt.rotateZ(transforms.rotation[2]);
        
        tilt.translate(-canvas.clientWidth / 2, -canvas.clientHeight / 2, 0);
        
        tilt.mesh(mesh.vertices,
                  mesh.texCoord, null, 
                  "triangles", "rgba(14, 16, 22, 255)", dom,
                  mesh.indices);
      }
    }
    
    if ("function" === typeof(controller.loop)) {
      controller.loop();
    }
  };
  
  /**
   * Delegate translation method, used by the controller.
   */
  this.translate = function(x, y, z) {
    transforms.translation[0] += x * tilt.getFrameDelta();
    transforms.translation[1] += y * tilt.getFrameDelta();
    transforms.translation[2] += z * tilt.getFrameDelta();
  };
  
  /**
   * Delegate rotation method, used by the controller.
   */
  this.rotate = function(x, y, z) {
    transforms.rotation[0] += x * tilt.getFrameDelta();
    transforms.rotation[1] += y * tilt.getFrameDelta();
    transforms.rotation[2] += z * tilt.getFrameDelta();
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
   * Override the mouseReleased function to handle the event.
   */
  tilt.mouseReleased = function(x, y) {
    if ("function" === typeof(controller.mouseReleased)) {
      controller.mouseReleased(x, y);
    }
  };

  /**
   * Override the mouseClicked function to handle the event.
   */
  tilt.mouseClicked = function(x, y) {
    if ("function" === typeof(controller.mouseClicked)) {
      controller.mouseClicked(x, y);
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
   * Override the mouseOver function to handle the event.
   */
  tilt.mouseOver = function(x, y) {
    if ("function" === typeof(controller.mouseOver)) {
      controller.mouseOver(x, y);
    }
  };
  
  /**
   * Override the mouseMoved function to handle the event.
   */
  tilt.mouseOut = function(x, y) {
    if ("function" === typeof(controller.mouseOut)) {
      controller.mouseOut(x, y);
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
    
    that = null;
  };
}