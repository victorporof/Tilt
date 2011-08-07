/***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Tilt: A WebGL-based 3D visualization of a webpage.
 *
 * The Initial Developer of the Original Code is Victor Porof.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 ***** END LICENSE BLOCK *****/
"use strict";

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.UI"];

/**
 * UI constructor.
 * This is a handler for all the UI elements. Any widgets need to be pushed
 * in this object to be properly updated and drawn. Achieve this using the 
 * push() and remove() functions from the prototype.
 */
Tilt.UI = function() {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.UI", this);  

  /**
   * All the UI elements will be added to this list for proper handling.
   */
  this.elements = [];
};

Tilt.UI.prototype = {

  /**
   * Adds UI elements to the handler stack.
   *
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Array} container: optional, the container array for the objects
   */
  push: function(elements, container) {
    var i, len, element, index;

    if ("undefined" === typeof container) {
      container = this.elements;
    }
    if (elements instanceof Array) {
      for (i = 0, len = elements.length; i < len; i++) {

        // get the current element from the array
        element = elements[i];

        if (element instanceof Array) {
          this.push(element, container);
        }
        else {
          if ("undefined" === typeof element || element === null) {
            continue;
          }
          if ((index = container.indexOf(element)) === -1) {             
            element.$ui = this;
            container.push(element);
          }
        }
      }
    }
    else {
      element = elements;

      if ("undefined" === typeof element || element === null) {
        return;
      }
      if ((index = container.indexOf(element)) === -1) {             
        element.$ui = this;
        container.push(element);
      }
    }
  },

  /**
   * Removes UI elements from the handler stack.
   *
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Array} container: optional, the container array for the objects
   */
  remove: function(elements, container) {
    var i, len, element, index;

    if ("undefined" === typeof elements) {
      this.elements = [];
      return;
    }

    if ("undefined" === typeof container) {
      container = this.elements;
    }
    if (elements instanceof Array) {
      for (i = 0, len = elements.length, index = -1; i < len; i++) {

        // get the current element from the array
        element = elements[i];

        if (element instanceof Array) {
          this.remove(element, container);
        }
        else {
          if ("undefined" === typeof element || element === null) {
            continue;
          }
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

      if ("undefined" === typeof element || element === null) {
        return;
      }
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
   * Draws all the stacked elements.
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  draw: function(frameDelta) {
    var tilt = Tilt.$renderer,
      elements = this.elements,
      element, bounds,
      w = window.content.innerWidth,
      h = window.content.innerHeight, i, len;

    tilt.ortho();
    tilt.defaults();
    tilt.depthTest(false);

    for (i = 0, len = elements.length; i < len; i++) {
      element = elements[i];
      bounds = element.$bounds || [0, 0, w, h];

      if (!element.hidden && bounds[0] < w && bounds[1] < h) {
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
    this.$handleEvent(x, y, this.$mouseEvent, "mousedown");

    return this.$mousePressedOver;
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
    this.$mousePressedOver = false;
    this.$handleEvent(x, y, this.$mouseEvent, "mouseup");
  },

  /**
   * Delegate click method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  click: function(x, y) {
    this.$handleEvent(x, y, this.$mouseEvent, "click");
  },

  /**
   * Delegate double click method.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  doubleClick: function(x, y) {
    this.$handleEvent(x, y, this.$mouseEvent, "dblclick");
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
  $handleEvent: function(x, y, handle, e) {
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
  $mouseEvent: function(x, y, element, e) {
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
