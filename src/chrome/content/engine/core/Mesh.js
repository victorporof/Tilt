/*
 * Mesh.js - An object representing a drawable mesh
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
var EXPORTED_SYMBOLS = ["Tilt.Mesh"];

/**
 * Mesh constructor.
 *
 * @param {Object} parameters: an object containing the following properties
 *  @param {Tilt.VertexBuffer} vertices: the vertices buffer (x, y and z)
 *  @param {Tilt.VertexBuffer} texCoord: the texture coordinates buffer (u, v)
 *  @param {Tilt.VertexBuffer} normals: the normals buffer (m, n, p)
 *  @param {Tilt.IndexBuffer} indices: indices for the passed vertices buffer
 *  @param {String} color: the color to be used by the shader if required
 *  @param {Tilt.Texture} texture: optional texture to be used by the shader
 *  @param {Number} drawMode: WebGL enum, like tilt.TRIANGLES
 * @param {Function} draw: optional function to handle custom drawing
 */
Tilt.Mesh = function(parameters, draw) {

  /**
   * Retain each parameters for easy access.
   */
  for (var i in parameters) {
    this[i] = parameters[i];
  }

  // the color should be a [r, g, b, a] array, check this now
  if ("string" === typeof this.color) {
    this.color = Tilt.Math.hex2rgba(this.color);
  } else if ("undefined" === typeof this.color) {
    this.color = [1, 1, 1, 1];
  }

  // the draw mode should be valid, default to TRIANGLES if unspecified
  if ("undefined" === typeof this.drawMode) {
    this.drawMode = Tilt.$renderer.TRIANGLES;
  }

  // if the draw call is specified in the constructor, overwrite directly
  if ("function" === typeof draw) {
    this.draw = draw;
  }
};

Tilt.Mesh.prototype = {

  /**
   * Draws a custom mesh, using only the built-in shaders.
   * For more complex techniques, create your own shaders and drawing logic.
   * Overwrite this function to handle custom drawing.
   */
  draw: function() {
    // cache some properties for easy access
    var tilt = Tilt.$renderer,
      vertices = this.vertices,
      texCoord = this.texCoord,
      normals = this.normals,
      indices = this.indices,
      color = this.color,
      texture = this.texture,
      drawMode = this.drawMode;

    // use the necessary shader
    if (texture) {
      tilt.useTextureShader(vertices, texCoord, color, texture);
    } else {
      tilt.useColorShader(vertices, color);
    }

    // draw the vertices as indexed elements or simple arrays
    if (indices) {
      tilt.drawIndexedVertices(drawMode, indices);
    } else {
      tilt.drawVertices(drawMode, vertices.numItems);
    }

    // TODO: use the normals buffer, add some lighting
    // save the current model view and projection matrices
    this.mvMatrix = mat4.create(tilt.mvMatrix);
    this.projMatrix = mat4.create(tilt.projMatrix);
  },

  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    for (var i in this) {
      if ("function" === typeof this[i].destroy) {
        this[i].destroy();
      }
      this[i] = null;
    }
  }
};
