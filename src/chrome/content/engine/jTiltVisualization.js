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
   * This is used to make the object available to the private methods, as a
   * workaround for an error in the ECMAScript Language Specification which
   * causes 'this' to be set incorrectly for inner functions.
   */
  var that = this;
  
  /**
   * A texture representing the contents of a DOM window.
   */
  var domTexture = null;
  
  /**
   * Helper functions for easy drawing and abstraction.
   */
  var draw = new TiltDraw(canvas, width, height, function failCallback() {
    TiltUtils.Console.log(TiltUtils.StringBundle.get("webgl.error"));
  }).initialize();
  
  /**
   * The initialization logic.
   */
  this.setup = function() {
    var engine = draw.getEngine();
    
    engine.initTexture(dom, function readyCallback(texure) {
      domTexture = texure;
    }, "white");
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
        draw.background(domTexture ? 0 : "rgba(0, 0, 0, 0)");
        
        if (domTexture) {
          draw.translate(width / 2, height / 2, 0);
          draw.rotate(1, 0.5, 0.25, TiltUtils.Math.radians(frameDelta / 16));
          draw.translate(-width / 2, -height / 2, 0);
          draw.image(domTexture, 0, 0, width, height);    
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