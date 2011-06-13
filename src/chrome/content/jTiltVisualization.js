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
 * @param {object} image: image representing the document object model
 * @param {object} canvas: the canvas element used for rendering
 * @param {object} width: optional, specify the width of the canvas
 * @param {object} height: optional, specify the height of the canvas
 *
 * @return {object} the created object
 */
function TiltVisualization(image, canvas, width, height) {
  
  /**
   * By convention, we make a private 'that' variable.
   */
  var that = this;
  
  /**
   * A texture representing the contents of a document object model window.
   */
  var dom = null;
  
  /**
   * Helper functions for easy drawing and abstraction.
   */
  var draw = new TiltDraw(canvas, width, height);
  
  /**
   * The combined mesh representing the document visualization.
   */
  var mesh = {
    vertices: [],
    texCoord: [],
    indices: []
  }
  
  /**
   * The initialization logic.
   */
  this.setup = function() {
    // initialize shaders, matrices and other components required for drawing
    draw.initialize();
        
    // convert the dom image to a texture
    draw.initTexture(image, function readyCallback(texture) {
      dom = texture;
    }, "white", "gray", 8); // using a white background & gray margins of 8px
    
    // get some variables from the draw object for easier access
    var width = draw.getWidth();
    var height = draw.getHeight();
    
    // create the combined mesh representing the document visualization by
    // traversing the dom and adding a shape for each node that is drawable    
    TiltUtils.Document.traverse(function nodeCallback(node, depth) {
      // get the x, y, width and height of a node
      var coord = TiltUtils.Document.getNodeCoordinates(node);

      // use this node only if it actually has any dimensions
      if (coord.x || coord.y || coord.width || coord.height && depth) {
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
          (x    ) / width, (y    ) / height, 
          (x + w) / width, (y    ) / height,
          (x + w) / width, (y + h) / height, 
          (x    ) / width, (y + h) / height);
        
        // compute the indices
        mesh.indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
      }
    }, function readyCallback() {
      // when finished, initialize the buffers
      mesh.vertexBuffer = draw.initBuffer(mesh.vertices, 3);
      mesh.vertexBuffer.texCoord = draw.initBuffer(mesh.texCoord, 2);
      mesh.vertexBuffer.indices = draw.initIndexBuffer(mesh.indices);
    });
    
    // use additive blending without depth testing enabled
    draw.blendMode("add");
    draw.depthTest(false);
  }
  
  /**
   * The rendering animation logic and loop.
   */
  this.loop = function() {
    if (that) {
      // prepare for the next frame of the animation loop
      draw.requestAnimFrame(that.loop);
      
      // get some variables from the draw object for easier access
      var width = draw.getWidth();
      var height = draw.getHeight();
      var timeCount = draw.getTimeCount();
      var frameCount = draw.getFrameCount();
      var frameRate = draw.getFrameRate();
      var frameDelta = draw.getFrameDelta();
      
      // only after the draw object has finished initializing
      if (draw.isInitialized()) {
        // set a default (white) background if the dom texture has finished 
        // loading, or transparent otherwise
        draw.background("#000" + (dom ? "" : "0"));
        draw.origin();
        
        // if the dom texture is available, the visualization can be drawn
        if (dom) {
          // this is just a test case for now, actual implementation later
          draw.translate(width / 2, height / 2 - 100, -400);
          draw.rotate(0, 1, 0, TiltUtils.Math.radians(timeCount / 32));
          draw.translate(-width / 2, -height / 2, 0);
          
          draw.mesh(mesh.vertexBuffer,
                    mesh.vertexBuffer.texCoord, null, "rgba(14, 16, 22, 255)",
                    mesh.vertexBuffer.indices, "triangles");
        }
      }
    }
  }
  
  /**
   * Destroys this object.
   *
   * @param readyCallback: function to be called when finished
   */
  this.destroy = function(readyCallback) {
    that = null;
    dom = null;
    
    draw.destroy();
    draw = null;
    
    if (readyCallback) {
      readyCallback();
    }
  }
}