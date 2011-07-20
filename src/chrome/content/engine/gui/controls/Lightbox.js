/*
 * Lightbox.js - A light box composed of a full screen rect and a sprite
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
var EXPORTED_SYMBOLS = ["Tilt.Lightbox"];

/**
 * Lightbox constructor.
 *
 * @param {String} color: the background, defined in hex or as rgb() or rgba()
 * @param {Tilt.Sprite} sprite: the sprite to be drawn on top
 */
Tilt.Lightbox = function(color, sprite) {

  /**
   * The color of the full screen rectangle.
   */
  this.color = color;

  /**
   * A texture used as the pixel data for this object.
   */
  this.sprite = sprite;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [sprite.x, sprite.y, sprite.width, sprite.height];
};

Tilt.Lightbox.prototype = {

  /**
   * Updates this object's internal params.
   */
  update: function() {
    var sprite = this.sprite,
      bounds = this.$bounds,
      sbounds = sprite.$bounds;

    sprite.update();
    bounds[0] = sbounds[0];
    bounds[1] = sbounds[1];
    bounds[2] = sbounds[2];
    bounds[3] = sbounds[3];
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    tilt = tilt || Tilt.$renderer;

    tilt.fill(this.color);
    tilt.noStroke();
    tilt.rect(0, 0, tilt.width, tilt.height);

    this.sprite.draw(tilt);
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
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
