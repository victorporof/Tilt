/*
 * Button.js - A simple button
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
var EXPORTED_SYMBOLS = ["Tilt.Button"];

/**
 * Button constructor.
 *
 * @param {Number} x: the x position of the object
 * @param {Number} y: the y position of the object
 * @param {Tilt.Sprite} sprite: the sprite to be drawn as background
 * @param {Function} onclick: optional, function to be called when clicked
 */
Tilt.Button = function(x, y, sprite, onclick) {

  /**
   * The draw coordinates of this object.
   */
  this.x = x || 0;
  this.y = y || 0;
  this.width = sprite.width;
  this.height = sprite.height;

  /**
   * A sprite used as a background for this object.
   */
  this.sprite = sprite;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [this.x, this.y, this.width, this.height];

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
      x = this.x,
      y = this.y,
      width = this.width,
      height = this.height;

    bounds[0] = x;
    bounds[1] = y;
    bounds[2] = width;
    bounds[3] = height;

    sprite.x = x;
    sprite.y = y;
    sprite.width = width;
    sprite.height = height;
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    tilt = tilt || Tilt.$renderer;
    this.sprite.draw(tilt);
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function(canvas) {
    for (var i in this) {
      try {
        if ("function" === typeof this[i].destroy) {
          this[i].destroy();
        }
      }
      catch(e) {}
      finally {
        delete this[i];
      }
    }
  }
};
