/*
 * Cube.js - A simple cube primitive geometry
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
var EXPORTED_SYMBOLS = ["Tilt.Cube"];

/**
 * Tilt.Cube constructor.
 *
 * @param {Number} width: the width of the cube
 * @param {Number} height: the height of the cube
 * @param {Number} depth: the depth of the cube
 */
Tilt.Cube = function(width, height, depth) {
  // make sure the width, height and depth are valid number values
  width = width || 1;
  height = height || 1;
  depth = depth || 1;

  /**
   * Buffer of 3-component vertices (x, y, z) as the corners of a cube.
   */
  this.vertices = new Tilt.VertexBuffer([
    -0.5 * width, -0.5 * height,  0.5 * depth, /* front */
     0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth, /* bottom */
     0.5 * width,  0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width, -0.5 * height, -0.5 * depth, /* back */
    -0.5 * width, -0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
    -0.5 * width, -0.5 * height, -0.5 * depth, /* top */
     0.5 * width, -0.5 * height, -0.5 * depth,
     0.5 * width, -0.5 * height,  0.5 * depth,
    -0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width, -0.5 * height,  0.5 * depth, /* right */
     0.5 * width, -0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width, -0.5 * height, -0.5 * depth, /* left */
    -0.5 * width, -0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth], 3);

  /**
   * Buffer of 2-component texture coordinates (u, v) for the cube.
   */
  this.texCoord = new Tilt.VertexBuffer([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1], 2);

  /**
   * Vertex indices for the cube vertices, defining the order for which
   * these points can create a cube from triangles.
   */
  this.indices = new Tilt.IndexBuffer([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23]);
};

Tilt.Cube.prototype = {

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    for (var i in this) {
      if ("function" === typeof this[i].destroy) {
        this[i].destroy();
      }
      delete this[i];
    }
  }
};
