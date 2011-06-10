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
 * @param {object} dom: MOZ_dom_element_texture object
 * @param {object} canvas: the canvas element used for rendering
 * @param {object} width: optional, specify the width of the canvas
 * @param {object} height: optional, specify the height of the canvas
 *
 * @return {object} the created object
 */
function TiltVisualization(dom, canvas, width, height) {
  
  /**
   * By convention, we make a private 'that' variable.
   */
  var that = this;
  
  /**
   * A texture representing the contents of a DOM window.
   */
  var domTexture = null;
  
  /**
   * Helper functions for easy drawing and abstraction.
   */
  var draw = new TiltDraw(canvas, width, height);
  
  /**
   * The initialization logic.
   */
  this.setup = function() {
    // initialize shaders, matrices and other components required for drawing
    draw.initialize();
    
    // we require a particular way of mapping textures for the box objects
    // representing each node (only the front and back cube faces are textured
    // and not the margins), so we override the default cube texture coords
    // for the default cube vertices
    draw.getCubeVertices().texCoord = draw.getEngine().initBuffer([
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 0, 0,	0, 0, 0, 0,
      1, 1, 0, 1,	0, 0, 1, 0,
      0, 0, 0, 0,	0, 0, 0, 0,
      0, 0, 0, 0,	0, 0, 0, 0,
      0, 0, 0, 0,	0, 0, 0, 0], 2);

    // convert the dom image to a texture
    draw.requestTexture(dom, function readyCallback(loadedTexture) {
      domTexture = loadedTexture;
    }, "white", "gray", 8); // using a white background & gray margins of 8px
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
        draw.background(domTexture ? "#fff" : "#0000");

        // if the dom texture is available, the visualization can be drawn
        if (domTexture) {
          // this is just a test case for now, actual implementation later
          draw.translate(width / 2, height / 2, 0);
          draw.rotate(1, 0.5, 0.25, TiltUtils.Math.radians(frameDelta / 32));
          draw.box(0, 0, 0, width, height, 16, domTexture);
          draw.translate(-width / 2, -height / 2, 0);
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
    domTexture = null;
    
    draw.destroy();
    draw = null;
    
    if (readyCallback) {
      readyCallback();
    }
  }
}