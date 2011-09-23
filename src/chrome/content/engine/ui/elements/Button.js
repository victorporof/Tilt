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
var EXPORTED_SYMBOLS = ["Tilt.Button"];

/**
 * Button constructor.
 *
 * @param {Tilt.Sprite} sprite: the sprite to be drawn as background
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this object shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} width: the width of the object
 *  @param {Number} height: the height of the object
 *  @param {Array} padding: the inner padding offset for mouse events
 *  @param {String} fill: fill color for the rect bounding this object
 *  @param {String} stroke: stroke color for the rect bounding this object
 *  @param {Function} onmousedown: function called when the event is triggered
 *  @param {Function} onmouseup: function called when the event is triggered
 *  @param {Function} onclick: function called when the event is triggered
 * @return {Tilt.Button} the newly created object
 */
Tilt.Button = function(sprite, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Button", this);

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
   * Functions called when the specific event is triggered.
   */
  this.onmousedown = properties.onmousedown || undefined;
  this.onmouseup = properties.onmouseup || undefined;
  this.onclick = properties.onclick || undefined;

  /**
   * A sprite used as a background for this object.
   */
  this.$sprite = sprite || { $x: -1, $y: -1, $width: -1, $height: -1 };
  this.$sprite.$x = properties.x || this.$sprite.$x;
  this.$sprite.$y = properties.y || this.$sprite.$y;
  this.$sprite.$width = properties.width || this.$sprite.$width;
  this.$sprite.$height = properties.height || this.$sprite.$height;
  this.$sprite.disabled = true;

  /**
   * The inner padding offset for mouse events.
   */
  this.$padding = properties.padding || [0, 0, 0, 0];

  /**
   * The fill color for the rectangle bounding this object.
   */
  this.$fill = properties.fill || null;

  /**
   * The stroke color for the rectangle bounding this object.
   */
  this.$stroke = properties.stroke || null;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [
    this.$sprite.$x + this.$padding[0],
    this.$sprite.$y + this.$padding[1],
    this.$sprite.$width - this.$padding[0] - this.$padding[2],
    this.$sprite.$height - this.$padding[1] - this.$padding[3]];
};

Tilt.Button.prototype = {

  /**
   * Sets this object's position.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   */
  setPosition: function(x, y) {
    if ("function" === typeof this.$sprite.setPosition) {
      this.$sprite.setPosition(x, y);
    }
    else {
      this.$sprite.$x = x;
      this.$sprite.$y = y;
    }
    this.$bounds[0] = x + this.$padding[0];
    this.$bounds[1] = y + this.$padding[1];
  },

  /**
   * Sets this object's dimensions.
   *
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   */
  setSize: function(width, height) {
    if ("function" === typeof this.$sprite.setSize) {
      this.$sprite.setSize(width, height);
    }
    else {
      this.$sprite.$width = width;
      this.$sprite.$height = height;
    }
    this.$bounds[2] = width - this.$padding[0] - this.$padding[2];
    this.$bounds[3] = height - this.$padding[1] - this.$padding[3];
  },

  /**
   * Sets the x position of this object.
   * @param {Number} x: the x position
   */
  setX: function(x) {
    this.setPosition(x, this.$sprite.$y);
  },

  /**
   * Sets the y position of this object.
   * @param {Number} y: the y position
   */
  setY: function(y) {
    this.setPosition(this.$sprite.$x, y);
  },

  /**
   * Sets the width of this object.
   * @param {Number} width: the width
   */
  setWidth: function(width) {
    this.setSize(width, this.$sprite.$height);
  },

  /**
   * Sets the height of this object.
   * @param {Number} height: the height
   */
  setHeight: function(height) {
    this.setSize(this.$sprite.$width, height);
  },

  /**
   * Sets a new sprite to be drawn as a background for this object.
   */
  setSprite: function(sprite) {
    var x = this.$sprite.$x,
      y = this.$sprite.$y,
      width = this.$sprite.$width,
      height = this.$sprite.$height,
      padding = this.$sprite.$padding;

    this.$sprite = sprite;
    this.$sprite.$padding = padding;
    this.$sprite.setPosition(x, y);
    this.$sprite.setSize(width, height);
    this.$sprite.disabled = true;
  },

  /**
   * Sets the fill color for the rectangle bounding this object.
   * @param {String} color: the fill color
   */
  setFill: function(color) {
    this.$fill = color;
  },

  /**
   * Sets the stroke color for the rectangle bounding this object.
   * @param {String} color: the stroke color
   */
  setStroke: function(color) {
    this.$stroke = color;
  },

  /**
   * Returns the x position of this object.
   * @return {Number} the x position
   */
  getX: function() {
    return this.$sprite.$x;
  },

  /**
   * Returns the y position of this object.
   * @return {Number} the y position
   */
  getY: function() {
    return this.$sprite.$y;
  },

  /**
   * Returns the width of this object.
   * @return {Number} the width
   */
  getWidth: function() {
    return this.$sprite.$width;
  },

  /**
   * Returns the height of this object.
   * @return {Number} the height
   */
  getHeight: function() {
    return this.$sprite.$height;
  },

  /**
   * Gets the fill color for the rectangle bounding this object.
   * @return {String} the fill color
   */
  getFill: function() {
    return this.$fill;
  },

  /**
   * Gets the stroke color for the rectangle bounding this object.
   * @return {String} the stroke color
   */
  getStroke: function() {
    return this.$stroke;
  },

  /**
   * Draws this object using the specified internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(frameDelta, tilt) {
    tilt = tilt || Tilt.$renderer;

    // a button may not have a sprite attached, so check before drawing
    if ("undefined" !== typeof this.$sprite.$texture) {
      this.$sprite.draw(tilt);
    }

    var bounds, padding,
      fill = this.$fill,
      stroke = this.$stroke;

    // if fill and stroke params are specified, draw a rectangle using the
    // current bounds around the object
    if (fill || stroke) {
      bounds = this.$bounds;
      padding = this.$padding;

      tilt.fill(fill || "#fff0");
      tilt.stroke(stroke || "#0000");
      tilt.rect(
        bounds[0] - padding[0],
        bounds[1] - padding[1],
        bounds[2] + padding[0] + padding[2],
        bounds[3] + padding[1] + padding[3]);
    }

    if (Tilt.UI.debug) {
      tilt.fill("#fff2");
      tilt.stroke("#00f");
      tilt.rect(
        this.$sprite.$x,
        this.$sprite.$y,
        this.$sprite.$width,
        this.$sprite.$height);

      if (!this.disabled) {
        tilt.fill("#0f04");
        tilt.rect(
          this.$bounds[0], this.$bounds[1], this.$bounds[2], this.$bounds[3]);
      }
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
