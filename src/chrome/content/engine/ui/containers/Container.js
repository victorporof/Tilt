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
var EXPORTED_SYMBOLS = ["Tilt.Container"];

/**
 * View constructor.
 *
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this shouldn't be drawn
 *  @param {Boolean} disabled: true if the children shouldn't receive events
 *  @param {Boolean} standby: true if the container should respond to events
 *  @param {String} background: color to fill the screen
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} width: the width of the object
 *  @param {Number} height: the height of the object
 *  @param {Array} offset: the [x, y] offset of the inner contents
 *  @param {Array} elements: an array of elements to be initially added
 */
Tilt.Container = function(properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Container", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * Variable specifying if this object shouldn't be drawn.
   */
  this.hidden = properties.hidden || false;

  /**
   * Variable specifying if this object shouldn't be responsive to events.
   */
  this.disabled = properties.disabled || false;

  /**
   * Specifies if the container should respond to events.
   */
  this.standby = properties.standby || false;

  /**
   * The color of the full screen background rectangle.
   */
  this.$background = properties.background || null;

  /**
   * The draw coordinates of this object.
   */
  this.$x = properties.x || 0;
  this.$y = properties.y || 0;
  this.$width = properties.width || 0;
  this.$height = properties.height || 0;

  /**
   * The offset of the inner contents.
   */
  this.$offset = properties.offset || [0, 0];

  // if initial elements are specified, add them to this view
  if (properties.elements instanceof Array) {
    properties.elements.forEach(function(e) { this.push(e); }.bind(this));
  }

  // add this view to the top level UI handler.
  Tilt.UI.push(this);
};

/**
 * All the UI elements will be added to a list for proper handling.
 */
Tilt.Container.prototype = [];

/**
 * Sets this object's position.
 *
 * @param {Number} x: the x position of the object
 * @param {Number} y: the y position of the object
 */
Tilt.Container.prototype.setPosition = function(x, y) {
  this.$x = x;
  this.$y = y;
};

/**
 * Sets this object's dimensions.
 *
 * @param {Number} width: the width of the object
 * @param {Number} height: the height of the object
 */
Tilt.Container.prototype.setSize = function(width, height) {
  this.$width = width;
  this.$height = height;
};

/**
 * Sets this object's position.
 * @param {Number} x: the x position of the object
 */
Tilt.Container.prototype.setX = function(x) {
  this.$x = x;
};

/**
 * Sets this object's position.
 * @param {Number} y: the y position of the object
 */
Tilt.Container.prototype.setY = function(y) {
  this.$y = y;
};

/**
 * Sets this object's dimensions.
 * @param {Number} width: the width of the object
 */
Tilt.Container.prototype.setWidth = function(width) {
  this.$width = width;
};

/**
 * Sets this object's dimensions.
 * @param {Number} height: the height of the object
 */
Tilt.Container.prototype.setHeight = function(height) {
  this.$height = height;
};

/**
 * Returns the x position of this object.
 * @return {Number} the x position
 */
Tilt.Container.prototype.getX = function() {
  return this.$x;
};

/**
 * Returns the y position of this object.
 * @return {Number} the y position
 */
Tilt.Container.prototype.getY = function() {
  return this.$y;
};

/**
 * Returns the width of this object.
 * @return {Number} the width
 */
Tilt.Container.prototype.getWidth = function() {
  return this.$width;
};

/**
 * Returns the height of this object.
 * @return {Number} the height
 */
Tilt.Container.prototype.getHeight = function() {
  return this.$height;
};

/**
 * Updates this object's internal params.
 *
 * @param {Number} frameDelta: the delta time elapsed between frames
 * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
 */
Tilt.Container.prototype.update = function(frameDelta, tilt) {
};

/**
 * Draws this object using the specified internal params.
 *
 * @param {Number} frameDelta: the delta time elapsed between frames
 * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
 */
Tilt.Container.prototype.draw = function(frameDelta, tilt) {
  tilt = tilt || Tilt.$renderer;

  var element,
    background = this.$background,
    x = this.$x,
    y = this.$y,
    width = this.$width,
    height = this.$height,
    offset = this.$offset,
    offsetX = offset[0],
    offsetY = offset[1],
    left = x + offsetX,
    top = y + offsetY,
    elementBounds, elementX, elementY, elementWidth, elementHeight,
    r1x1, r1y1, r1x2, r1y2, r2x1, r2y1, r2x2, r2y2, i, len;

  // a view may specify a full screen rectangle as a background
  if (background !== null) {
    tilt.fill(background);
    tilt.noStroke();
    tilt.rect(x, y, width || tilt.width, height || tilt.height);
  }

  // translate by the view offset (for example, used in scroll containers)
  tilt.pushMatrix();
  tilt.translate(left, top, 0);

  // a view has multiple elements attach, browse and handle each one
  for (i = 0, len = this.length; i < len; i++) {
    element = this[i];
    element.drawable = false;
    element.$parentX = x;
    element.$parentY = y;
    element.$parentWidth = width;
    element.$parentHeight = height;

    // draw only if the element is visible (it may be enabled or not)
    if (!element.hidden) {

      // some elements don't require an update function, check for it first
      if ("function" === typeof element.update) {

        // update only if the element is visible and enabled
        if (!element.hidden && !element.disabled) {
          element.update(frameDelta, tilt);
        }
      }

      // if the current view bounds do not restrict drawing the child elements
      if (width === 0 || height === 0) {
        element.draw(frameDelta, tilt);
        element.drawable = true;
        continue;
      }

      // otherwise, we need to calculate if the child element is visible
      elementBounds = element.$bounds || [1, 1, 1, 1];
      elementX = elementBounds[0] + left;
      elementY = elementBounds[1] + top;
      elementWidth = elementBounds[2];
      elementHeight = elementBounds[3];

      // compute the two rectangles representing the element and view bounds
      r1x1 = elementX;
      r1y1 = elementY;
      r1x2 = elementX + elementWidth;
      r1y2 = elementY + elementHeight;
      r2x1 = x;
      r2y1 = y;
      r2x2 = x + width;
      r2y2 = y + height;

      // check to see if the child UI element is visible inside the bounds
      if (r1x1 > r2x1 && r1x2 < r2x2 && r1y1 > r2y1 && r1y2 < r2y2) {
        element.draw(frameDelta, tilt);
        element.drawable = true;
      }
    }
  }

  tilt.popMatrix();
};

/**
 * Checks to see if the mouse is over an element handled boundsY this view.
 *
 * @param {Object} element: the element to check
 * @return {Boolean} true if the mouse is over the element
 */
Tilt.Container.prototype.isMouseOver = function(element) {
  // get the bounds from the element (if it's not set, use default values)
  var ui = Tilt.UI,
    mouseX = ui.mouseX,
    mouseY = ui.mouseY,

    // remember the view offset (for example, used in scroll containers)
    offset = this.$offset || [0, 0],
    left = this.$x || 0 + offset[0],
    top = this.$y || 0 + offset[1],

    // get the bounds from the element (if it's not set, use default values)
    bounds = element.$bounds || [-1, -1, -1, -1],
    boundsX = bounds[0] + left,
    boundsY = bounds[1] + top,
    boundsWidth = bounds[2],
    boundsHeight = bounds[3];

  // check to see if the mouse pointer is inside the element bounds
  return mouseX > boundsX && mouseX < boundsX + boundsWidth &&
         mouseY > boundsY && mouseY < boundsY + boundsHeight;
};

/**
 * Removes all the children from the container.
 */
Tilt.Container.prototype.clear = function() {
  for (var i = 0, len = this.length; i < len; i++) {
    this[i].destroy();
    this[i] = null;
  }

  this.splice(0, this.length);
};

/**
 * Destroys this object and deletes all members.
 */
Tilt.Container.prototype.destroy = function() {
  Tilt.UI.splice(Tilt.UI.indexOf(this), 1);
  Tilt.destroyObject(this);
};
