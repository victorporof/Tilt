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
var EXPORTED_SYMBOLS = ["Tilt.Button"];

/**
 * Button constructor.
 *
 * @param {Number} x: the x position of the object
 * @param {Number} y: the y position of the object
 * @param {Tilt.Sprite} sprite: the sprite to be drawn as background
 * @param {Function} onclick: optional, function to be called when clicked
 * @param {Object} properties: additional properties for this object
 */
Tilt.Button = function(x, y, sprite, onclick, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Button", this);  

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * The draw coordinates of this object.
   */
  this.x = x || 0;
  this.y = y || 0;

  /**
   * A sprite used as a background for this object.
   */
  this.sprite = sprite || { width: 10, height: 10 };

  /**
   * Variable specifying if this object shouldn't be drawn.
   */
  this.hidden = properties.hidden || false;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [this.x, this.y, this.sprite.width, this.sprite.height];

  // if the onclick closure is specified in the constructor, save it here
  if ("function" === typeof onclick) {
    this.onclick = onclick;
  }
};

Tilt.Button.prototype = {

  /**
   * Updates this object's internal params.
   */
  update: function() {
    var sprite = this.sprite,
      bounds = this.$bounds,
      padding = sprite.padding || [0, 0, 0, 0],
      x = this.x,
      y = this.y;

    bounds[0] = x + padding[0];
    bounds[1] = y + padding[1];
    bounds[2] = sprite.width - padding[2];
    bounds[3] = sprite.height - padding[3];

    sprite.x = x;
    sprite.y = y;
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    tilt = tilt || Tilt.$renderer;
    var sprite = this.sprite;

    if ("undefined" !== typeof sprite.texture) {
      sprite.draw(tilt);
    }
    else if ("undefined" !== typeof sprite.fill &&
             "undefined" !== typeof sprite.stroke) {

      tilt.fill(sprite.fill);
      tilt.stroke(sprite.stroke);
      tilt.rect(sprite.x, sprite.y, sprite.width, sprite.height);

      var $fill = tilt.$fillColor,
        $stroke = tilt.$strokeColor;

      $fill[0] = 1;
      $fill[1] = 1;
      $fill[2] = 1;
      $fill[3] = 1;
      $stroke[0] = 0;
      $stroke[1] = 0;
      $stroke[2] = 0;
      $stroke[3] = 1;
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
