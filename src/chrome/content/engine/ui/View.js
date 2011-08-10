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
var EXPORTED_SYMBOLS = ["Tilt.View"];

/**
 * View constructor.
 *
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {String} background: color to fill the screen
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

  var background = this.background,
    offset = this.offset,
    bounds = this.bounds,
    x = bounds[0] + offset[0],
    y = bounds[1] + offset[1],
    w = bounds[2],
    h = bounds[3],
    element, ebounds, ex, ey, ew, eh,
    r1x1, r1y1, r1x2, r1y2, r2x1, r2y1, r2x2, r2y2, i, len;

  // a view may specify a full screen rectangle as a background
  if (background !== null) {
    tilt.fill(background);
    tilt.noStroke();
    tilt.rect(x, y, w || tilt.width, h || tilt.height);
  }

  // translate by the view offset (for example, used in scroll containers)
  tilt.pushMatrix();
  tilt.translate(offset[0], offset[1], 0);

  // a view has multiple elements attach, browse and handle each one
  for (i = 0, len = this.length; i < len; i++) {
    element = this[i];

    // draw only if the element is visible (it may be enabled or not)
    if (!element.hidden) {

      // if the current view bounds do not restrict drawing the child elements
      if (w === 0 || h === 0) {
        element.draw(frameDelta, tilt);
        continue;
      }

      // otherwise, we need to calculate if the child element is visible
      ebounds = element.$bounds || [1, 1, 1, 1];
      ex = ebounds[0] + offset[0];
      ey = ebounds[1] + offset[1];
      ew = ebounds[2];
      eh = ebounds[3];

      // compute the two rectangles representing the element and view bounds
      r1x1 = ex;
      r1y1 = ey;
      r1x2 = ex + ew;
      r1y2 = ey + eh;
      r2x1 = x;
      r2y1 = y;
      r2x2 = x + w;
      r2y2 = y + h;

      // check to see if the child UI element is visible inside the bounds
      if (r1x1 > r2x1 && r1x2 < r2x2 && r1y1 > r2y1 && r1y2 < r2y2) {
        element.draw(frameDelta, tilt);
      }
    }
  }

  tilt.popMatrix();
};

/**
 * Destroys this object and deletes all members.
 */
Tilt.View.prototype.destroy = function() {
  Tilt.UI.splice(Tilt.UI.indexOf(this), 1);
  Tilt.destroyObject(this);
};
