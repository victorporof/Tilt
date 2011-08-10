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
 * @param {Tilt.Sprite} sprite: the sprite to be drawn for the handler
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this object shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} size: the slider size
 *  @param {Number} value: number ranging from 0..100
 *  @param {Array} padding: the inner padding offset for mouse events
 *  @param {Boolean} direction: 0 for horizontal, 1 for vertical
 */
Tilt.Slider = function(sprite, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Slider", this);

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
   * A sprite used as a background for this object.
   */
  this.$sprite = new Tilt.Sprite(sprite.$texture, sprite.$region, {
    padding: sprite.$padding,
    tint: sprite.$tint
  });
  this.$sprite.$x = properties.x || this.$sprite.$x;
  this.$sprite.$y = properties.y || this.$sprite.$y;
  this.$sprite.$width = properties.width || this.$sprite.$width;
  this.$sprite.$height = properties.height || this.$sprite.$height;

  /**
   * The draw coordinates of this object.
   */
  this.$x = this.$sprite.$x;
  this.$y = this.$sprite.$y;

  /**
   * The slider size (area in which the handler is moved).
   */
  this.$size = properties.size || 100;

  /**
   * The inner padding offset for mouse events.
   */
  this.$padding = properties.padding || sprite.$padding || [0, 0, 0, 0];

  /**
   * The slider direction (0 for horizontal, 1 for vertical).
   */
  this.$direction = properties.direction || 0;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [
    this.$sprite.$x + this.$padding[0],
    this.$sprite.$y + this.$padding[1],
    this.$sprite.$width - this.$padding[2],
    this.$sprite.$height - this.$padding[3]];

  /**
   * The slider value (also defining the handler position).
   */
  this.setValue(properties.value || 0);
};

Tilt.Slider.prototype = {

  /**
   * Sets this object's position.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   */
  setPosition: function(x, y) {
    this.$x = x;
    this.$y = y;
    this.$bounds[0] = x + this.$padding[0];
    this.$bounds[1] = y + this.$padding[1];
    this.setValue(this.$value);
  },

  /**
   * Sets the value for this controller.
   * @param {Number} value: the value, ranging from 0..100
   */
  setValue: function(value) {
    var sprite = this.$sprite,
      x = this.$x,
      y = this.$y,
      size = this.$size,
      direction = this.$direction, p;

    this.$value = Tilt.Math.clamp(value, 0, 100);

    if (direction === 0) {
      p = Tilt.Math.map(this.$value, 0, 100, x, x + size);

      sprite.setPosition(p, y);
      this.$bounds[0] = p + this.$padding[0];
    }
    else {
      p = Tilt.Math.map(this.$value, 0, 100, y, y + size);

      sprite.setPosition(x, p);
      this.$bounds[1] = p + this.$padding[1];
    }
  },

  /**
   * Returns the x position of this object.
   * @return {Number} the x position
   */
  get x() {
    return this.$x;
  },

  /**
   * Returns the y position of this object.
   * @return {Number} the y position
   */
  get y() {
    return this.$y;
  },

  /**
   * Returns the size of this object.
   * @return {Number} the size
   */
  get size() {
    return this.$size;
  },

  /**
   * Gets the current value for this controller.
   * @return {Number} the value, ranging from 0..100
   */
  get value() {
    return this.$value;
  },

  /**
   * Updates this object's internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  update: function(frameDelta, tilt) {
    var ui = Tilt.UI;

    if (this.mousePressed) {
      this.$sliding = true;
    }
    else if (!ui.mousePressed) {
      this.$sliding = false;
    }

    if (this.$sliding) {
      var sprite = this.$sprite,
        x = this.$x,
        y = this.$y,
        size = this.$size,
        direction = this.$direction, p;

      if (direction === 0) {
        p = Tilt.Math.clamp(ui.mouseX - sprite.$width / 2, x, x + size);

        sprite.setPosition(p, y);
        this.$value = Tilt.Math.map(p, x, x + size, 0, 100);
        this.$bounds[0] = p + this.$padding[0];
      }
      else {
        p = Tilt.Math.clamp(ui.$mouseY - sprite.height / 2, y, y + size);

        sprite.setPosition(x, p);
        this.$value = Tilt.Math.map(p, y, y + size, 0, 100);
        this.$bounds[1] = p + this.$padding[1];
      }
    }
  },

  /**
   * Draws this object using the specified internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(frameDelta, tilt) {
    tilt = tilt || Tilt.$renderer;

    if ("undefined" !== typeof this.$sprite.$texture) {
      this.$sprite.draw(tilt);
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
