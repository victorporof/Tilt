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
function TiltVisualization(canvas, width, height) {
  
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
   * Random texture used for testing.
   */
  var someTexture = undefined;
  
  /**
   * The initialization logic.
   */
  this.setup = function() {
    var engine = draw.getEngine();
    
    var chromePath = "chrome://tilt/skin/texture.jpg";
    var texturePath = "http://bit.ly/khwMvF";
    var npotPath = "http://bit.ly/jsEMaP";
    
    engine.initTexture(npotPath, function ready(texure) {
      someTexture = texure;
    });
  }
  
  /**
   * The rendering animation logic and loop.
   */
  this.loop = function() {
    draw.requestAnimFrame(that.loop);
    
    var width = draw.getCanvasWidth();
    var height = draw.getCanvasHeight();
    var timeCount = draw.getTimeCount();
    var frameCount = draw.getFrameCount();
    var frameRate = draw.getFrameRate();
    var frameDelta = draw.getFrameDelta();
    
    if (draw.isInitialized()) {
      draw.background("rgba(0, 0, 0, 0)");
      
      draw.perspective();
      draw.translate(width / 2, height / 2, 0);
      draw.rotateY(Math.radians(timeCount / 10));
      draw.translate(-150, -150, 0);
      
      if (someTexture != undefined) {
        draw.image(someTexture, 0, 0, 300, 300, "rgba(0, 0.5, 0, 0.75)");    
      }
    }
  }
}