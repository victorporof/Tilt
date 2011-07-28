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
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Array} container: optional, the container array for the objects
   */
  push: function(elements, container) {
    var i, len, element;

    if ("undefined" === typeof container) {
      container = this.elements;
    }
    if (elements instanceof Array) {
      for (i = 0, len = elements.length; i < len; i++) {

        // get the current element from the array
        element = elements[i];

        if (element instanceof Array) {
          this.push(element);
        }
        else {
          element.$ui = this;
          container.push(element);
        }
      }
    }
    else {
      element = elements;
      element.$ui = this;
      container.push(element);
    }
  },

  /**
   * Removes a UI element from the handler stack.
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Array} container: optional, the container array for the objects
   */
  remove: function(elements, container) {
    var i, len, element, index;

    if ("undefined" === typeof container) {
      container = this.elements;
    }
    if (elements instanceof Array) {
      for (i = 0, len = elements.length, index = -1; i < len; i++) {

        // get the current element from the array
        element = elements[i];

        if (element instanceof Array) {
          this.remove(element);
        }
        else {
          if ((index = this.elements.indexOf(element)) !== -1) {             
            element.$ui = null;
            container.splice(index, 1);

            if (element.elements instanceof Array) {
              this.remove(element.elements);
            }
          }
        }
      }
    }
    else {
      element = elements;

      if ((index = this.elements.indexOf(element)) !== -1) {             
        element.$ui = null;
        container.splice(index, 1);

        if (element.elements instanceof Array) {
          this.remove(element.elements);
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

      if (!element.hidden) {
        element.update();
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
   * @return {Boolean} true if the mouse is over a handled element
   */
  mouseDown: function(x, y, b) {
    this.$mousePressed = true;
    this.ui$handleEvent(x, y, this.element$handleMouseEvent, "mousedown");

    return this.$mousePressedOver;
  },

  /**
   * Delegate mouse up method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Number} b: which mouse button was released
   * @return {Boolean} true if the mouse was pressed over a handled element
   */
  mouseUp: function(x, y, b) {
    this.$mousePressed = false;
    this.ui$handleEvent(x, y, this.element$handleMouseEvent, "mouseup");

    try {
      return this.$mousePressedOver;
    }
    finally {
      this.$mousePressedOver = false;
    }
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
          handle.call(this, x, y, subelements[j], "on" + e);
        }
      }
      else {
        // normally check if the element is valid to receive a click event
        handle.call(this, x, y, element, "on" + e);
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

      if (e === "onmousedown") {
        this.$mousePressedOver = true;
      }
      element[e](x, y);
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    for (var i in this.elements) {
      Tilt.destroyObject(this.elements[i]);
    }

    Tilt.destroyObject(this);
  }
};
