/* 
 * TiltChromeControllers.js - Controller implementations handling events
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
if ("undefined" === typeof(TiltChrome.Controller)) {
  TiltChrome.Controller = {};
}

var EXPORTED_SYMBOLS = ["TiltChrome.Controller.MouseAndKeyboard"];

/**
 * A mouse and keyboard implementation.
 * Any controller will have access to the visualization public methods, the 
 * width and height of the canvas, but not at the engine or canvas directly.
 */
TiltChrome.Controller.MouseAndKeyboard = function() {

  /**
   * Arcball used to control the visualization using the mouse.
   */
  let arcball = null;
  
  /**
   * Visualization translation on the X and Y axis.
   */
  let translationX = 0;
  let translationY = 0;

  /**
   * Retain the mouse drag state and position, to manipulate the arcball.
   */  
  let mouseDragged = false;
  let mouseX = 0;
  let mouseY = 0;
  
  /**
   * Retain the keyboard state.
   */
  let keyPressed = false;
  let keyChar = [];
  let keyCode = [];
    
  /**
   * Function called automatically by the visualization at the setup().
   */  
  this.init = function() {
    arcball = new Tilt.Arcball(this.width, this.height);
  };
  
  /**
   * Function called automatically by the visualization each frame in draw().
   * 
   * @param {number} frameDelta: the delta time elapsed between frames
   */
  this.loop = function(frameDelta) {
    // handle mouse dragged events
    if (mouseDragged) {
      arcball.mouseDragged(mouseX, mouseY);
    }
    
    // handle key pressed events
    if (keyPressed) {
      if (keyCode[37] || keyCode[65]) {
        translationX += 5;
      }
      if (keyCode[39] || keyCode[68]) {
        translationX -= 5;
      }
      if (keyCode[38] || keyCode[87]) {
        translationY += 5;
      }
      if (keyCode[40] || keyCode[83]) {
        translationY -= 5;
      }
    }
    
    // update the visualization
    let coord = arcball.loop(frameDelta);
    this.visualization.setRotation(coord.rotation);
    this.visualization.setTranslation(translationX, translationY, coord.zoom);
  };

  /**
   * Called once after every time a mouse button is pressed.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */  
  this.mousePressed = function(x, y) {
    arcball.mousePressed(x, y);
    mouseDragged = true;
  };
  
  /**
   * Called every time a mouse button is released.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */  
  this.mouseReleased = function(x, y) {
    mouseDragged = false;
  };
  
  /**
   * Called every time the mouse moves.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  this.mouseMoved = function(x, y) {
    mouseX = x;
    mouseY = y;
  };
  
  /**
   * Called when the the mouse enters the visualization bounds.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  this.mouseOver = function(x, y) {
  };
  
  /**
   * Called when the the mouse leaves the visualization bounds.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  this.mouseOut = function(x, y) {
    mouseDragged = false;
  };
  
  /**
   * Called when the the mouse wheel is used.
   *
   * @param {number} scroll: the mouse wheel direction and speed
   */
  this.mouseScroll = function(scroll) {
    arcball.mouseScroll(scroll);
  };
  
  /**
   * Called when a key is pressed.
   * 
   * @param {string} char: the key character as a string
   * @param {number} code: the corresponding character code for the key
   */
  this.keyPressed = function(char, code) {
    keyPressed = true;
    keyChar[char] = true;
    keyCode[code] = true;
  };
  
  /**
   * Called when a key is released.
   *
   * @param {string} char: the key character as a string
   * @param {number} code: the corresponding character code for the key
   */
  this.keyReleased = function(char, code) {
    keyPressed = false;
    keyChar[char] = false;
    keyCode[code] = false;
    
    if (code === 27) {
      TiltChrome.BrowserOverlay.destroy();
    }
  };
  
  /**
   * Overriding the resize function to handle the event.
   *
   * @param {number} width: the new canvas width
   * @param {number} height: the new canvas height
   */
  this.resize = function(width, height) {
    this.width = width;
    this.height = height;
    
    arcball.resize(width, height);
  };
}