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
"use strict";

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.Controller.MouseAndKeyboard"];

/**
 * A mouse and keyboard implementation.
 * Any controller will have access to the visualization public methods, the 
 * width and height of the canvas, but not at the engine or canvas directly.
 */
TiltChrome.Controller = {};
TiltChrome.Controller.MouseAndKeyboard = function() {
  
  /**
   * Arcball used to control the visualization using the mouse.
   */
  this.arcball = null;
  
  /**
   * Visualization translation and rotation on the X and Y axis.
   */
  this.translationX = 0;
  this.translationY = 0;
  this.rotationX = 0;
  this.rotationY = 0;
  this.euler = quat4.create();
  
  /**
   * Retain the mouse drag state and position, to manipulate the arcball.
   */  
  this.mouseDragged = false;
  this.mouseX = 0;
  this.mouseY = 0;
  
  /**
   * Retain the keyboard state.
   */
  this.keyChar = [];
  this.keyCode = [];
};

TiltChrome.Controller.MouseAndKeyboard.prototype = {
  
  /**
   * Function called automatically by the visualization at the setup().
   */
  init: function() {
    this.arcball = new Tilt.Arcball(this.width, this.height);
  },
  
  /**
   * Function called automatically by the visualization each frame in draw().
   * 
   * @param {number} frameDelta: the delta time elapsed between frames
   */
  loop: function(frameDelta) {
    // handle mouse dragged events
    if (this.mouseDragged) {
      this.arcball.mouseDragged(this.mouseX, this.mouseY);
    }
    
    // handle key pressed events
    if (this.keyCode[37]) { // left
      this.translationX += 5;
    }
    if (this.keyCode[39]) { // right
      this.translationX -= 5;
    }
    if (this.keyCode[38]) { // up
      this.translationY += 5;
    }
    if (this.keyCode[40]) { // down
      this.translationY -= 5;
    }
    if (this.keyCode[65]) { // w
      this.rotationY -= Tilt.Math.radians(frameDelta) / 10;
    }
    if (this.keyCode[68]) { // s
      this.rotationY += Tilt.Math.radians(frameDelta) / 10;
    }
    if (this.keyCode[87]) { // a
      this.rotationX += Tilt.Math.radians(frameDelta) / 10;
    }
    if (this.keyCode[83]) { // d
      this.rotationX -= Tilt.Math.radians(frameDelta) / 10;
    }
    
    // get the arcball rotation and zoom coordinates
    let coord = this.arcball.loop(frameDelta);
    
    // create another custom rotation
    Tilt.Math.quat4fromEuler(this.rotationY, this.rotationX, 0, this.euler);
    
    // update the visualization
    this.setRotation(quat4.multiply(this.euler, coord.rotation));
    this.setTranslation(this.translationX, this.translationY, coord.zoom);
  },
  
  /**
   * Called once after every time a mouse button is pressed.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */  
  mousePressed: function(x, y) {
    this.arcball.mousePressed(x, y);
    this.mouseDragged = true;
  },
  
  /**
   * Called every time a mouse button is released.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  mouseReleased: function(x, y) {
    this.mouseDragged = false;
  },
  
  /**
   * Called every time the mouse moves.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  mouseMoved: function(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  },
  
  /**
   * Called when the the mouse enters the visualization bounds.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  mouseOver: function(x, y) {
  },
  
  /**
   * Called when the the mouse leaves the visualization bounds.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  mouseOut: function(x, y) {
    this.mouseDragged = false;
  },
  
  /**
   * Called when the the mouse wheel is used.
   *
   * @param {number} scroll: the mouse wheel direction and speed
   */
  mouseScroll: function(scroll) {
    this.arcball.mouseScroll(scroll);
  },
  
  /**
   * Called when a key is pressed.
   *
   * @param {string} char: the key character as a string
   * @param {number} code: the corresponding character code for the key
   */
  keyPressed: function(char, code) {
    this.keyChar[char] = true;
    this.keyCode[code] = true;
  },
  
  /**
   * Called when a key is released.
   *
   * @param {string} char: the key character as a string
   * @param {number} code: the corresponding character code for the key
   */
  keyReleased: function(char, code) {
    this.keyChar[char] = false;
    this.keyCode[code] = false;
    
    if (code === 27) { // escape
      TiltChrome.BrowserOverlay.href = null;
      TiltChrome.BrowserOverlay.destroy();
    }
  },
  
  /**
   * Overriding the resize function to handle the event.
   *
   * @param {number} width: the new canvas width
   * @param {number} height: the new canvas height
   */
  resize: function(width, height) {
    this.width = width;
    this.height = height;
    this.arcball.resize(width, height);
  },
  
  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    for (var i in this) {
      this[i] = null;
    }
  }
};