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
 * Portions created boundsY the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision boundsY deleting the provisions above and replace them with the notice
 * and other provisions required boundsY the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 ***** END LICENSE BLOCK *****/
"use strict";

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.View"];

/**
 * View constructor.
 *
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {String} background: color to fill the screen
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Array} offset: the [x, y] offset of the inner contents
 *  @param {Boolean} bounds: the inner drawable bounds for this view
 *  @param {Array} elements: an array of elements to be initially added
 */
Tilt.View = function(properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.View", this); 

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
   * The color of the full screen background rectangle.
   */
  this.background = properties.background || null;

  /**
   * The draw coordinates of this object.
   */
  this.x = properties.x || 0;
  this.y = properties.y || 0;

  /**
   * The offset of the inner contents.
   */
  this.offset = properties.offset || [0, 0];

  /**
   * The inner drawable bounds for this view.
   */
  this.bounds = properties.bounds || [0, 0, 0, 0];

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
Tilt.View.prototype = [];

/**
 * Updates this object's internal params.
 *
 * @param {Number} frameDelta: the delta time elapsed between frames
 * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
 */
Tilt.View.prototype.update = function(frameDelta, tilt) {
  var element, i, len;

  // a view has multiple elements attach, browse and handle each one
  for (i = 0, len = this.length; i < len; i++) {
    element = this[i];

    // some elements don't require an update function, check for it first
    if ("function" === typeof element.update) {

      // update only if the element is visible and enabled
      if (!element.hidden && !element.disabled) {
        element.update(frameDelta, tilt);
      }
    }
  }
};

/**
 * Draws this object using the specified internal params.
 *
 * @param {Number} frameDelta: the delta time elapsed between frames
 * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
 */
Tilt.View.prototype.draw = function(frameDelta, tilt) {
  tilt = tilt || Tilt.$renderer;

  var element,
    background = this.background,
    offset = this.offset,
    offsetX = offset[0] + this.x,
    offsetY = offset[1] + this.y,
    bounds = this.bounds,
    boundsX = bounds[0],
    boundsY = bounds[1],
    boundsWidth = bounds[2],
    boundsHeight = bounds[3],
    ebounds, elementX, elementY, elementWidth, elementHeight,
    r1x1, r1y1, r1x2, r1y2, r2x1, r2y1, r2x2, r2y2, i, len;

  // a view may specify a full screen rectangle as a background
  if (background !== null) {
    tilt.fill(background);
    tilt.noStroke();
    tilt.rect(
      boundsX, boundsY,
      boundsWidth || tilt.width, boundsHeight || tilt.height);
  }

  // translate by the view offset (for example, used in scroll containers)
  tilt.pushMatrix();
  tilt.translate(offsetX, offsetY, 0);

  // a view has multiple elements attach, browse and handle each one
  for (i = 0, len = this.length; i < len; i++) {
    element = this[i];

    // draw only if the element is visible (it may be enabled or not)
    if (!element.hidden) {

      // if the current view bounds do not restrict drawing the child elements
      if (boundsWidth === 0 || boundsHeight === 0) {
        element.draw(frameDelta, tilt);
        continue;
      }

      // otherwise, we need to calculate if the child element is visible
      ebounds = element.$bounds || [1, 1, 1, 1];
      elementX = ebounds[0] + offsetX;
      elementY = ebounds[1] + offsetY;
      elementWidth = ebounds[2];
      elementHeight = ebounds[3];

      // compute the two rectangles representing the element and view bounds
      r1x1 = elementX;
      r1y1 = elementY;
      r1x2 = elementX + elementWidth;
      r1y2 = elementY + elementHeight;
      r2x1 = boundsX;
      r2y1 = boundsY;
      r2x2 = boundsX + boundsWidth;
      r2y2 = boundsY + boundsHeight;

      // check to see if the child UI element is visible inside the bounds
      if (r1x1 > r2x1 && r1x2 < r2x2 && r1y1 > r2y1 && r1y2 < r2y2) {
        element.draw(frameDelta, tilt);
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
Tilt.View.prototype.isMouseOver = function(element) {
  // get the bounds from the element (if it's not set, use default values)
  var ui = Tilt.UI,
    mouseX = ui.mouseX,
    mouseY = ui.mouseY,

    // remember the view offset (for example, used in scroll containers)
    offset = this.offset,
    offsetX = offset[0],
    offsetY = offset[1],

    // get the bounds from the element (if it's not set, use default values)
    bounds = element.$bounds || [-1, -1, -1, -1],
    boundsX = bounds[0] + offsetX,
    boundsY = bounds[1] + offsetY,
    boundsWidth = bounds[2],
    boundsHeight = bounds[3];

  // check to see if the mouse pointer is inside the element bounds
  return mouseX > boundsX && mouseX < boundsX + boundsWidth &&
         mouseY > boundsY && mouseY < boundsY + boundsHeight;
};

/**
 * Destroys this object and deletes all members.
 */
Tilt.View.prototype.destroy = function() {
  Tilt.UI.splice(Tilt.UI.indexOf(this), 1);
  Tilt.destroyObject(this);
};
