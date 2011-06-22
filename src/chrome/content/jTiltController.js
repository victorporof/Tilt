/* 
 * jTiltController.js - Scalable controllers handling various events for Tilt
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
if ("undefined" === typeof(Tilt)) {
  var Tilt = {};
}
if ("undefined" === typeof(Tilt.Controller)) {
  Tilt.Controller = {};
}

var EXPORTED_SYMBOLS = ["TiltEvents"];

/**
 * A mouse and keyboard implementation
 */
Tilt.Controller.MouseAndKeyboard = function() {
  var mousePressed = false;
  var mouseX = 0;
  var mouseY = 0;
  
  this.loop = function() {
    if (mousePressed) {
      var y = mouseX - this.canvas.width / 2;
      var x = mouseY - this.canvas.height / 2;
      
      x /= -500000;
      y /= 500000;
      
      this.visualization.rotate(x, y, 0);
    }
  }
  
  this.mousePressed = function(x, y) {
    mousePressed = true;
  };
  
  this.mouseReleased = function(x, y) {
    mousePressed = false;
  };
  
  this.mouseMoved = function(x, y) {
    mouseX = x;
    mouseY = y;
  };
  
  this.keyPressed = function(key) {
  };
}