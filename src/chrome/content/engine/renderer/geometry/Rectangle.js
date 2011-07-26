/*
 * Cube.js - A simple rectangle primitive geometry
 * version 0.1
 *
 * Copyright (c) 2011 Victor Porof
 *
 * This software is provided "as-is", without any express or implied
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
var EXPORTED_SYMBOLS = ["Tilt.Rectangle"];

/**
 * Tilt.Rectangle constructor.
 */
Tilt.Rectangle = function(width, height, depth) {

  /**
   * Buffer of 2-component vertices (x, y) as the corners of a rectangle.
   */
  this.vertices = new Tilt.VertexBuffer([0, 0, 1, 0, 0, 1, 1, 1], 2);

  /**
   * Buffer of 2-component texture coordinates (u, v) for the rectangle.
   */
  this.texCoord = new Tilt.VertexBuffer([0, 0, 1, 0, 0, 1, 1, 1], 2);
};

Tilt.Rectangle.prototype = {

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
