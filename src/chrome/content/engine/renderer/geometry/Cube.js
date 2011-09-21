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
var EXPORTED_SYMBOLS = ["Tilt.Cube"];

/**
 * Tilt.Cube constructor.
 *
 * @param {Number} width: the width of the cube
 * @param {Number} height: the height of the cube
 * @param {Number} depth: the depth of the cube
 * @return {Tilt.Cube} the newly created object
 */
Tilt.Cube = function(width, height, depth) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Cube", this);

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
    Tilt.destroyObject(this);
  }
};
