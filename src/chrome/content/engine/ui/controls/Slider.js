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
var EXPORTED_SYMBOLS = ["Tilt.Slider"];

/**
 * Slider constructor.
 *
 * @param {Number} x: the x position of the object
 * @param {Number} y: the y position of the object
 * @param {Number} size: the slider size
 * @param {Tilt.Sprite} sprite: the sprite to be drawn for the handler
 * @param {Function} onclick: optional, function to be called when clicked
 * @param {Object} properties: additional properties for this object
 *  @param {Number} value: number ranging from 0..100
 *  @param {Boolean} direction: 0 for horizontal, 1 for vertical
 */
Tilt.Slider = function(x, y, size, sprite, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Slider", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * The draw coordinates of this object.
   */
  this.x = x || 0;
  this.y = y || 0;

  /**
   * The slider size (area in which the handler is moved).
   */
  this.size = size || 100;

  /**
   * A sprite used as a background for this object.
   */
  this.sprite = sprite || { width: 0, height: 0 };
  this.sprite.x = this.x;
  this.sprite.y = this.y;

  /**
   * The slider value (also defining the handler position).
   */
  this.value = properties.value || 0;

  /**
   * The slider direction (0 for horizontal, 1 for vertical).
   */
  this.direction = properties.direction || 0;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [this.x, this.y, this.sprite.width, this.sprite.height];

  /**
   * Handling the mouse down event.
   */
  this.onmousedown = function() {
    this.$mousePressed = true;
  };
};

Tilt.Slider.prototype = {

  /**
   * Updates this object's internal params.
   */
  update: function() {
    var sprite = this.sprite,
      bounds = this.$bounds,
      direction = this.direction,
      padding = sprite.padding,
      ui = Tilt.$ui,
      x = this.x,
      y = this.y,
      size = this.size,
      v = direction === 0 ? ui.$mouseX - sprite.width / 2 :
                            ui.$mouseY - sprite.height / 2;

    if (this.$mousePressed) {
      if (ui.$mousePressed) {
        if (direction === 0) {
          this.value = Tilt.Math.map(v, x, x + size, 0, 100);
        }
        else {
          this.value = Tilt.Math.map(v, y, y + size, 0, 100);
        }
      }
      else {
        this.$mousePressed = false;
      }
    }

    if (direction === 0) {
      sprite.x = Tilt.Math.map(this.value, 0, 100, x, x + size);
      sprite.y = this.y;
    }
    else {
      sprite.x = this.x;
      sprite.y = Tilt.Math.map(this.value, 0, 100, y, y + size);
    }

    bounds[0] = sprite.x + padding[0];
    bounds[1] = sprite.y + padding[1];
    bounds[2] = sprite.width - padding[2];
    bounds[3] = sprite.height - padding[3];
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    tilt = tilt || Tilt.$renderer;

    if ("undefined" !== typeof this.sprite.texture) {
      this.sprite.draw(tilt);
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
