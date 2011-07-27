/*
 * UI.js - Handler for all the user interface elements
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

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.UI"];

/**
 * UI constructor.
 */
Tilt.UI = function() {

  /**
   * All the UI elements will be added to this list for proper handling.
   */
  this.elements = [];
};

Tilt.UI.prototype = {

  /**
   * Adds a UI element to the handler stack.
   * @param {Object} a valid Tilt UI object (ex: Tilt.Button)
   */
  push: function() {
    var i, j, len, len2, argument;
    
    for (i = 0, len = arguments.length; i < len; i++) {
      argument = arguments[i];

      if (argument instanceof Array) {
        for (j = 0, len2 = argument.length; j < len2; j++) {
          argument[j].$ui = this;
          this.elements.push(argument[j]);
        }
      }
      else {
        argument.$ui = this;
        this.elements.push(argument);
      }
    }
  },

  /**
   * Removes a UI element from the handler stack.
   * @param {Object} a valid Tilt UI object (ex: Tilt.Button)
   */
  remove: function() {
    var i, j, len, len2, argument, index;
    
    for (i = 0, len = arguments.length, index = -1; i < len; i++) {
      argument = arguments[i];

      if (argument instanceof Array) {
        for (j = 0, len2 = argument.length, index = -1; j < len2; j++) {
          if ((index = this.elements.indexOf(argument[j])) !== -1) {
            argument[j].$ui = null;
            this.elements.splice(index, 1);
          }
        }
      }
      else {
        if ((index = this.elements.indexOf(argument)) !== -1) {             
          argument.$ui = null;
          this.elements.splice(index, 1);
        }
      }
    }
  },

  /**
   * Draws all the handled elements.
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  draw: function(frameDelta) {
    var tilt = Tilt.$renderer,
      elements = this.elements,
      element, i, len;

    tilt.ortho();
    tilt.origin();
    tilt.blendMode("alpha");
    tilt.depthTest(false);

    for (i = 0, len = elements.length; i < len; i++) {
      element = elements[i];
      element.update();

      if (!element.hidden) {
        element.draw(tilt);
      }
    }
  },

  /**
   * Delegate mouse down method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Number} b: which mouse button was pressed
   */
  mouseDown: function(x, y, b) {
    this.$mousePressed = true;
    this.ui$handleEvent(x, y, this.element$handleMouseEvent, "mousedown");
  },

  /**
   * Delegate mouse up method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Number} b: which mouse button was released
   */
  mouseUp: function(x, y, b) {
    this.$mousePressed = false;
    this.ui$handleEvent(x, y, this.element$handleMouseEvent, "mouseup");
  },

  /**
   * Delegate click method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  click: function(x, y) {
    this.ui$handleEvent(x, y, this.element$handleMouseEvent, "click");
  },

  /**
   * Delegate double click method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  doubleClick: function(x, y) {
    this.ui$handleEvent(x, y, this.element$handleMouseEvent, "dblclick");
  },

  /**
   * Delegate mouse move method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  mouseMove: function(x, y) {
    this.$mouseX = x;
    this.$mouseY = y;
  },

  /**
   * Follows all the elements handled by this object and checks if the element
   * is valid to receive a custom event, in which case the event is fired.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {String} e: the name of the event function
   */
  ui$handleEvent: function(x, y, handle, e) {
    var elements = this.elements,
      element, subelements, i, j, len, len2;

    for (i = 0, len = elements.length; i < len; i++) {
      element = elements[i];

      // a container can have one or more elements, verify each one if it is
      // valid to receive the click event
      if (element instanceof Tilt.Container) {
        subelements = element.elements;

        for (j = 0, len2 = subelements.length; j < len2; j++) {
          handle(x, y, subelements[j], "on" + e);
        }
      }
      else {
        // normally check if the element is valid to receive a click event
        handle(x, y, element, "on" + e);
      }
    }
  },

  /**
   * Checks if a UI element is valid to receive an event. If this is the case
   * then the event function is called when available.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Object} element: the UI element to be checked
   * @param {String} e: the name of the event function
   */
  element$handleMouseEvent: function(x, y, element, e) {
    if ("undefined" === typeof element) {
      return;
    }
    if ("function" !== typeof element[e]) {
      return;
    }

    var bounds = element.$bounds || [-1, -1, -1, -1],
      boundsX = bounds[0],
      boundsY = bounds[1],
      boundsWidth = bounds[2],
      boundsHeight = bounds[3];

    if (x > boundsX && x < boundsX + boundsWidth &&
        y > boundsY && y < boundsY + boundsHeight) {

      element[e](x, y);
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    for (var i in this.elements) {
      Tilt.destroyObject(elements[i]);
    }

    Tilt.destroyObject(this);
  }
};
