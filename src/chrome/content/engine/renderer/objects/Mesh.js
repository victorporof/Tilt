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
 *  @param {Function} draw: optional function to handle custom drawing
 * @return {Tilt.Mesh} the newly created object
 */
Tilt.Mesh = function(parameters) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Mesh", this);

  /**
   * Retain each parameter for easy access.
   */
  for (var i in parameters) {
    if (this[i] !== "draw") {
      this[i] = parameters[i];
    }
  }

  // the color should be [r, g, b, a] array, check this now
  if ("undefined" === typeof this.color) {
    this.color = [1, 1, 1, 1];
  }

  // the draw mode should be valid, default to TRIANGLES if unspecified
  if ("undefined" === typeof this.drawMode) {
    this.drawMode = Tilt.$renderer.TRIANGLES;
  }

  // if the draw call is specified in the constructor, overwrite directly
  if ("function" === typeof parameters.draw) {
    this.draw = parameters.draw;
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
    }
    else {
      tilt.useColorShader(vertices, color);
    }

    // draw the vertices as indexed elements or simple arrays
    if (indices) {
      tilt.drawIndexedVertices(drawMode, indices);
    }
    else {
      tilt.drawVertices(drawMode, vertices.numItems);
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
