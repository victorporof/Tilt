/*
 * Sprite.js - A handy wrapper for a texture
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
var EXPORTED_SYMBOLS = ["Tilt.Sprite"];

/**
 * Sprite constructor.
 *
 * @param {Tilt.Texture} texture: the texture to be used
 * @param {Array} region: the sub-texture coordinates as [x, y, width, height]
 * @param {Number} x: the x position of the object
 * @param {Number} y: the y position of the object
 * @param {Number} width: the width of the object
 * @param {Number} height: the height of the object
 */
Tilt.Sprite = function(texture, region, x, y, width, height) {

  /**
   * A texture used as the pixel data for this object.
   */
  this.texture = texture;

  /**
   * The sub-texture coordinates array.
   */
  this.region = region || [0, 0, texture.width, texture.height];

  /**
   * The draw coordinates of this object.
   */
  this.x = x || 0;
  this.y = y || 0;
  this.width = width || this.region[2];
  this.height = height || this.region[3];

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [this.x, this.y, this.width, this.height];

  /**
   * Buffer of 2-component texture coordinates (u, v) for the sprite.
   */
  this.$texCoord = null;
};

Tilt.Sprite.prototype = {

  /**
   * Clears the generated texture coords, which will be regenerated at draw.
   */
  refresh: function() {
    this.$texCoord = null;
  },

  /**
   * Updates this object's internal params.
   */
  update: function() {
    var bounds = this.$bounds,
      x = this.x,
      y = this.y,
      width = this.width,
      height = this.height;

    bounds[0] = x;
    bounds[1] = y;
    bounds[2] = width;
    bounds[3] = height;
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    tilt = tilt || Tilt.$renderer;

    // initialize the texture coordinates buffer if it was null
    if (this.$texCoord === null && this.texture.loaded) {

      // cache these variables for easy access
      var reg = this.region,
        tex = this.texture;

      // create the texture coordinates representing the sub-texture
      this.$texCoord = new Tilt.VertexBuffer([
        (reg[0]         ) / tex.width, (reg[1]         ) / tex.height,
        (reg[0] + reg[2]) / tex.width, (reg[1]         ) / tex.height,
        (reg[0]         ) / tex.width, (reg[1] + reg[3]) / tex.height,
        (reg[0] + reg[2]) / tex.width, (reg[1] + reg[3]) / tex.height], 2);
    }

    tilt.image(
      this.texture, this.x, this.y, this.width, this.height, this.$texCoord);
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
