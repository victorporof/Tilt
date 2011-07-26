/*
 * GUI.js - Handler for all the GUI elements
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
var EXPORTED_SYMBOLS = ["Tilt.GUI"];

/**
 * GUI constructor.
 */
Tilt.GUI = function() {

  /**
   * All the GUI elements will be added to this list for proper handling.
   */
  this.elements = [];
};

Tilt.GUI.prototype = {

  /**
   * Adds a GUI element to the handler stack.
   * @param {Object} a valid Tilt GUI object (ex: Tilt.Button)
   */
  push: function() {
    for (var i = 0, len = arguments.length; i < len; i++) {
      this.elements.push(arguments[i]);
    }
  },

  /**
   * Removes a GUI element from the handler stack.
   * @param {Object} a valid Tilt GUI object (ex: Tilt.Button)
   */
  remove: function() {
    for (var i = 0, len = arguments.length, index = -1; i < len; i++) {
      if ((index = this.elements.indexOf(arguments[i])) !== -1) {
        this.elements.splice(index, 1);
      }
    }
  },

  /**
   * Draws all the GUI handled elements.
   */
  draw: function() {
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
   * Delegate click method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  click: function(x, y) {
    var elements = this.elements,
      element, subelements, i, j, len, len2;

    for (i = 0, len = elements.length; i < len; i++) {
      element = elements[i];

      if (element instanceof Tilt.Container) {
        // a container can have one or more elements, verify each one if it is
        // valid to receive the click event
        subelements = element.elements;

        for (j = 0, len2 = subelements.length; j < len2; j++) {
          this.element$onClick(x, y, subelements[j]);
        }
      }
      else {
        // normally check if the element is valid to receive a click event
        this.element$onClick(x, y, element);
      }
    }
  },

  /**
   * Delegate double click method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  doubleClick: function(x, y) {
    // TODO: implementation
  },

  /**
   * Checks if a GUI element is valid to receive a click event. If this is the
   * case, then the onclick function is called when available.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Object} element: the GUI element to be checked
   */
  element$onClick: function(x, y, element) {
    if ("undefined" === typeof element) {
      return;
    }

    var bounds = element.$bounds || [-1, -1, -1, -1],
      boundsX = bounds[0],
      boundsY = bounds[1],
      boundsWidth = bounds[2],
      boundsHeight = bounds[3];

    if (x > boundsX && x < boundsX + boundsWidth &&
        y > boundsY && y < boundsY + boundsHeight) {

      if ("function" === typeof element.onclick) {
        element.onclick(x, y);
      }
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
