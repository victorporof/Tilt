/*
 * Slider.js - A simple horizontal slider
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
var EXPORTED_SYMBOLS = ["Tilt.Slider"];

/**
 * Slider constructor.
 *
 * @param {Number} x: the x position of the object
 * @param {Number} y: the y position of the object
 * @param {Tilt.Sprite} sprite: the sprite to be drawn for the handler
 * @param {Function} onclick: optional, function to be called when clicked
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: true if this object should be hidden
 */
Tilt.Slider = function(x, y, width, sprite, properties) {

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
  this.width = width || 100;

  /**
   * A sprite used as a background for this object.
   */
  this.sprite = sprite || { width: 0, height: 0 };
  this.sprite.x = this.x;
  this.sprite.y = this.y;

  /**
   * The slider value (also defining the handler position).
   */
  this.value = 0;

  /**
   * Variable specifying if this object shouldn't be drawn.
   */
  this.hidden = properties.hidden || false;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [this.x, this.y, this.sprite.width, this.sprite.height];

  /**
   * 
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
      ui = this.$ui,
      mx = ui.$mouseX - sprite.width / 2;

    if (ui.$mousePressed) {
      if (this.$mousePressed) {
        this.value = Tilt.Math.map(mx, this.x, this.x + this.width, 0, 100);
      }
    }
    else {
      this.$mousePressed = false;
    }

    sprite.x = Tilt.Math.map(this.value, 0, 100, this.x, this.x + this.width);
    sprite.y = this.y;

    bounds[0] = sprite.x;
    bounds[1] = sprite.y;
    bounds[2] = sprite.width;
    bounds[3] = sprite.height;
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
