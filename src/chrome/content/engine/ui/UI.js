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
 * The Initial Developer of the Original Code is The Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Victor Porof <victor.porof@gmail.com> (original author)
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
 * The top level UI handling events and containing all the views.
 */
Tilt.UI = [];
Tilt.UI.mouseX = 0;
Tilt.UI.mouseY = 0;
Tilt.UI.mousePressed = false;
Tilt.UI.mouseOver = false;
Tilt.UI.mouseScrollAmmount = 0;
Tilt.UI.keyPressed = [];
Tilt.UI.requestRedraw = function() {};

/**
 * Updates and draws each view handled by the UI.
 * @param {Number} frameDelta: the delta time elapsed between frames
 */
Tilt.UI.draw = function(frameDelta) {
  var tilt = Tilt.$renderer,
    i, len, container;

  // before drawing, make sure we're in an orthographic default environment
  tilt.defaults();
  tilt.ortho();

  for (i = 0, len = this.length; i < len; i++) {
    container = this[i];

    if (!container.hidden) {
      if (!container.disabled) {
        container.update(frameDelta, tilt);
      }
      container.draw(frameDelta, tilt);
    }
  }
};

/**
 * Sets a modal view.
 * @param {Tilt.Container} container: the container to be set modal
 */
Tilt.UI.presentModal = function(container) {
  if (container.modal || this.indexOf(container) === -1) {
    return;
  }

  // disable all the other views, so that they become unresponsive to events
  for (var i = 0, len = this.length; i < len; i++) {
    this[i].$prevDisabled = this[i].disabled;
    this[i].disabled = true;
  }

  // a modal view must always be marked as modal, be visible and enabled
  container.modal = true;
  container.hidden = false;
  container.disabled = false;
  this.requestRedraw();
};

/**
 * Unsets a modal view.
 * @param {Tilt.Container} view: the view to be set modal
 */
Tilt.UI.dismissModal = function(container) {
  if (!container.modal || this.indexOf(container) === -1) {
    return;
  }

  // reset the disabled parameter for all the other views
  for (var i = 0, len = this.length; i < len; i++) {
    this[i].disabled = this[i].$prevDisabled;
    delete this[i].$prevDisabled;
  }

  // a non-modal view must always be marked as modal, be hidden and disabled
  container.modal = false;
  container.hidden = true;
  container.disabled = true;
  this.requestRedraw();
};

/**
 * Delegate mouse down method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 * @param {Number} button: which mouse button was pressed
 */
Tilt.UI.mouseDown = function(x, y, button) {
  this.mousePressed = true;
  this.mouseOver = false;
  this.$handleMouseEvent("onmousedown", x, y, button);
};

/**
 * Delegate mouse up method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 * @param {Number} button: which mouse button was released
 */
Tilt.UI.mouseUp = function(x, y, button) {
  this.mousePressed = false;
  this.mouseOver = false;
  this.$handleMouseEvent("onmouseup", x, y, button);
};

/**
 * Delegate click method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 */
Tilt.UI.click = function(x, y) {
  this.$handleMouseEvent("onclick", x, y);
};

/**
 * Delegate double click method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 */
Tilt.UI.doubleClick = function(x, y) {
  this.$handleMouseEvent("ondoubleclick", x, y);
};

/**
 * Delegate mouse move method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 */
Tilt.UI.mouseMove = function(x, y) {
  this.mouseX = x;
  this.mouseY = y;
};

/**
 * Delegate mouse scroll method.
 * @param {Number} scroll: the mouse wheel direction and speed
 */
Tilt.UI.mouseScroll = function(scroll) {
  this.mouseOver = false;
  this.mouseScrollAmmount = scroll;
  this.$handleMouseEvent("onmousescroll", scroll);
};

/**
 * Delegate mouse over method.
 */
Tilt.UI.mouseOver = function() {
};

/**
 * Delegate mouse out method.
 */
Tilt.UI.mouseOut = function() {
};

/**
 * Delegate key down method.
 * @param {Number} code: the code for the currently pressed key
 */
Tilt.UI.keyDown = function(code) {
  this.keyPressed[code] = true;
  this.$handleKeyEvent("onkeydown", code);
};

/**
 * Delegate key up method.
 * @param {Number} code: the code for the currently released key
 */
Tilt.UI.keyUp = function(code) {
  this.keyPressed[code] = false;
  this.$handleKeyEvent("onkeyup", code);
};

/**
 * Delegate focus method.
 */
Tilt.UI.windowFocus = function() {
  this.mouseX = -Number.MAX_VALUE;
  this.mouseY = -Number.MAX_VALUE;
};

/**
 * Internal function, handling a mouse event for each element in a view.
 * @param {String} name: the event name
 */
Tilt.UI.$handleMouseEvent = function(name, x, y, button) {
  var i, e, len, len2, container, element, func,
    offset, contnrX, contnrY, contnrWidth, contnrHeight, left,top,
    bounds, boundsX, boundsY, boundsWidth, boundsHeight,
    mouseX = this.mouseX,
    mouseY = this.mouseY;

  // browse each view handled by the top level UI array
  for (i = 0, len = this.length; i < len; i++) {
    container = this[i];

    // handle mouse events only if the view is visible and enabled
    if (container.hidden || container.disabled) {
      continue;
    }

    contnrX = container.$x || 0;
    contnrY = container.$y || 0;
    contnrWidth = container.$width || 0;
    contnrHeight = container.$height || 0;

    // the container can receive events just like it's child elements
    if (container.standby) {
      if (mouseX > contnrX && mouseX < contnrX + contnrWidth &&
          mouseY > contnrY && mouseY < contnrY + contnrHeight) {

        // the mouse pointer is over a container, set a global flag for this
        this.mouseOver = true;

        // get the event function from the container
        func = container[name];

        // if the event is a valid set function, call it now
        if ("function" === typeof func) {
          func(x, y, button);
        }
      }
    }

    // remember the view offset (for example, used in scroll containers)
    offset = container.$offset || [0, 0];
    left = contnrX + offset[0];
    top = contnrY + offset[1] + 2;

    // each view has multiple container attach, browse and handle each one
    for (e = 0, len2 = container.length; e < len2; e++) {
      if (!(element = container[e])) {
        continue;
      }

      // handle mouse events only if the element is visible and enabled
      if (element.hidden || element.disabled || !element.drawable) {
        continue;
      }

      // get the bounds from the element (if it's not set, use default values)
      bounds = element.$bounds || [-1, -1, -1, -1];
      boundsX = bounds[0] + left;
      boundsY = bounds[1] + top;
      boundsWidth = bounds[2];
      boundsHeight = bounds[3];

      // if the mouse was released (no matter where), the mousePressed flag
      // for that element must be set to false
      if ("onmouseup" === name) {
        element.mousePressed = false;
      }

      // continue only if the mouse pointer is inside the element bounds
      if (mouseX > boundsX && mouseX < boundsX + boundsWidth &&
          mouseY > boundsY && mouseY < boundsY + boundsHeight) {

        // if the mouse is pressed (inside the element), the mousePressed flag
        // for that element must be set to true
        if ("onmousedown" === name) {
          element.mousePressed = true;
        }

        // the mouse pointer is over a gui element, set a global flag for this
        this.mouseOver = true;

        // get the event function from the element
        func = element[name];

        // if the event is a valid set function, call it now
        if ("function" === typeof func) {
          func(x, y, button);
        }
      }
    }
  }
};

/**
 * Internal function, handling a key event for each element in a view.
 * @param {String} name: the event name
 */
Tilt.UI.$handleKeyEvent = function(name, code) {
  var i, e, len, len2, container, element, func;

  // browse each view handled by the top level UI array
  for (i = 0, len = this.length; i < len; i++) {
    container = this[i];

    // handle keyboard events only if the view is visible and enabled
    if (container.hidden || container.disabled) {
      continue;
    }

    // the container can receive events just like it's child elements
    if (container.standby) {
      // get the event function from the element
      func = container[name];

      // if the event is a valid set function, call it now
      if ("function" === typeof func) {
        func(code);
      }
    }

    // each view has multiple container attach, browse and handle each one
    for (e = 0, len2 = container.length; e < len2; e++) {
      if (!(element = container[e])) {
        continue;
      }

      // handle keyboard events only if the element is visible and enabled
      if (element.hidden || element.disabled) {
        continue;
      }

      // get the event function from the element
      func = element[name];

      // if the event is a valid set function, call it now
      if ("function" === typeof func) {
        func(code);
      }
    }
  }
};

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.UI", Tilt.UI);
