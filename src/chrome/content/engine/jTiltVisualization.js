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
 
/**
 * TiltVisualization constructor.
 * 
 * @param {object} canvas: the canvas element used for rendering
 * @param {object} dom: MOZ_dom_element_texture object
 * @param {object} width: optional, specify the width of the canvas
 * @param {object} height: optional, specify the height of the canvas
 *
 * @return {object} the created object
 */
function TiltVisualization(canvas, dom, width, height) {
  
  /**
   * By convention, we make a private 'that' variable.
   * This is used to make the object available to the private methods, as a
   * workaround for an error in the ECMAScript Language Specification which
   * causes 'this' to be set incorrectly for inner functions.
   */
  var that = this;

  /**
   * Helper functions for easy drawing and abstraction.
   */
  var draw = new TiltDraw(canvas, width, height).initialize(); 

  /**
   * A texture representing the contents of a DOM window.
   */
  var dom_texture = null;
  
  /**
   * The initialization logic.
   */
  this.setup = function() {
    var engine = draw.getEngine();
    
    engine.initTexture(dom, function readyCallback(texure) {
      dom_texture = texure;
    }, "rgb(0, 255, 0)");
  }
  
  /**
   * The rendering animation logic and loop.
   */
  this.loop = function() {
    if (that) {
      draw.requestAnimFrame(that.loop);
      
      var width = draw.getCanvas().width;
      var height = draw.getCanvas().height;
      var timeCount = draw.getTimeCount();
      var frameCount = draw.getFrameCount();
      var frameRate = draw.getFrameRate();
      var frameDelta = draw.getFrameDelta();
      
      if (draw.isInitialized()) {
        draw.background(dom_texture ? 0 : "rgba(0, 0, 0, 0)");
        
        if (dom_texture) {
          draw.translate(width / 2, height / 2, 0);
          draw.rotate(1, 0.5, 0.25, TiltUtils.Math.radians(frameDelta / 16));
          draw.translate(-width / 2, -height / 2, 0);
          draw.image(dom_texture, 0, 0, width, height);    
        }
      }
    }
  }
  
  /**
   * Destroys this object.
   */
  this.destroy = function() {
    that = null;
    
    draw.destroy();
    draw = null;
    dom_texture = null;
  }
}