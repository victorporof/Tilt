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
var EXPORTED_SYMBOLS = ["Tilt.Renderer"];

/*global vec3, mat3, mat4, quat4 */

/**
 * Tilt.Renderer constructor.
 *
 * @param {HTMLCanvasElement} canvas: the canvas element used for rendering
 * @param {Object} properties: additional properties for this object
 *  @param {Function} onsuccess: to be called if initialization worked
 *  @param {Function} onfail: to be called if initialization failed
 * @return {Tilt.Renderer} the newly created object
 */
Tilt.Renderer = function(canvas, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Renderer", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * The WebGL context obtained from the canvas element, used for drawing.
   */
  this.canvas = canvas;
  this.gl = this.create3DContext(canvas);

  // first, clear the cache
  Tilt.clearCache();
  Tilt.$gl = this.gl;
  Tilt.$renderer = this;

  // check if the context was created successfully
  if ("undefined" !== typeof this.gl && this.gl !== null) {

    // if successful, run a success callback function if available
    if ("function" === typeof properties.onsuccess) {
      properties.onsuccess();
    }

    // set up some global enums
    this.TRIANGLES = this.gl.TRIANGLES;
    this.TRIANGLE_STRIP = this.gl.TRIANGLE_STRIP;
    this.TRIANGLE_FAN = this.gl.TRIANGLE_FAN;
    this.LINES = this.gl.LINES;
    this.LINE_STRIP = this.gl.LINE_STRIP;
    this.LINE_LOOP = this.gl.LINE_LOOP;
    this.POINTS = this.gl.POINTS;
    this.COLOR_BUFFER_BIT = this.gl.COLOR_BUFFER_BIT;
    this.DEPTH_BUFFER_BIT = this.gl.DEPTH_BUFFER_BIT;
    this.STENCIL_BUFFER_BIT = this.gl.STENCIL_BUFFER_BIT;

    // set the default clear color and depth buffers
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clearDepth(1);
  }
  else {
    // if unsuccessful, log the error and run a fail callback if available
    Tilt.Console.log(Tilt.StringBundle.get("initWebGL.error"));

    if ("function" === typeof properties.onfail) {
      properties.onfail();
      return;
    }
  }

  /**
   * Helpers for managing variables like frameCount, frameRate, frameDelta,
   * used internally, in the requestAnimFrame function.
   */
  this.$lastTime = 0;
  this.$currentTime = null;

  /**
   * Time passed since initialization.
   */
  this.elapsedTime = 0;

  /**
   * Counter for the number of frames passed since initialization.
   */
  this.frameCount = 0;

  /**
   * Variable retaining the current frame rate.
   */
  this.frameRate = 0;

  /**
   * Variable representing the delta time elapsed between frames.
   * Use this to create smooth animations regardless of the frame rate.
   */
  this.frameDelta = 0;

  /**
   * Variables representing the current framebuffer width and height.
   */
  this.width = canvas.width;
  this.height = canvas.height;

  /**
   * A model view matrix stack, used for push/pop operations.
   */
  this.mvMatrixStack = [];

  /**
   * The current model view matrix;
   */
  this.mvMatrix = mat4.identity(mat4.create());

  /**
   * The current projection matrix;
   */
  this.projMatrix = mat4.identity(mat4.create());

  /**
   * The current clear color used to clear the color buffer bit.
   */
  this.$clearColor = [0, 0, 0, 0];

  /**
   * The current tint color applied to any objects which can be tinted.
   * These mostly represent images or primitives which are textured.
   */
  this.$tintColor = [1, 1, 1, 1];

  /**
   * The current fill color applied to any objects which can be filled.
   * These are rectangles, circles, boxes, 2d or 3d primitives in general.
   */
  this.$fillColor = [1, 1, 1, 1];

  /**
   * The current stroke color applied to any objects which can be stroked.
   * This property mostly refers to lines.
   */
  this.$strokeColor = [0, 0, 0, 1];

  /**
   * Variable representing the current stroke weight.
   */
  this.$strokeWeightValue = 1;

  /**
   * A shader useful for drawing vertices with only a color component.
   */
  this.colorShader = new Tilt.Program(
    Tilt.Shaders.Color.vs, Tilt.Shaders.Color.fs);

  /**
   * A shader useful for drawing vertices with both a color component and
   * texture coordinates.
   */
  this.textureShader = new Tilt.Program(
    Tilt.Shaders.Texture.vs, Tilt.Shaders.Texture.fs);

  /**
   * Vertices buffer representing the corners of a rectangle.
   */
  this.$rectangle = new Tilt.Rectangle();
  this.$rectangleWireframe = new Tilt.RectangleWireframe();

  /**
   * Vertices buffer representing the corners of a cube.
   */
  this.$cube = new Tilt.Cube();
  this.$cubeWireframe = new Tilt.CubeWireframe();

  // set the default model view and projection matrices
  this.origin();
  this.perspective();

  // set the default tint, fill, stroke and other visual properties
  this.defaults();

  // cleanup
  canvas = null;
  properties = null;
};

Tilt.Renderer.prototype = {

  /**
   * Clears the color and depth buffers to a specific color.
   * The color components are represented in the 0..1 range.
   *
   * @param {Number} r: the red component of the clear color
   * @param {Number} g: the green component of the clear color
   * @param {Number} b: the blue component of the clear color
   * @param {Number} a: the alpha component of the clear color
   */
  clear: function(r, g, b, a) {
    // cache some variables for easy access
    var col = this.$clearColor,
      gl = this.gl;

    if (col[0] !== r || col[1] !== g || col[2] !== b || col[3] !== a) {
      col[0] = r;
      col[1] = g;
      col[2] = b;
      col[3] = a;
      gl.clearColor(r, g, b, a);

      r *= 255;
      g *= 255;
      b *= 255;
      a *= 255;
      this.canvas.setAttribute("style", [
        "background: rgba(", r, ", ", g, ", ", b, ", ", a, "); ",
        "width: 100%; height: 100%;"].join(""));
    }

    // clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  },

  /**
   * Clears the canvas context (usually at the beginning of each frame).
   * If the color is undefined, it will default to opaque black.
   * It is not recommended but possible to pass a number as a parameter,
   * in which case the color will be [n, n, n, 255], or directly an array of
   * [r, g, b, a] values, all in the 0..255 interval.
   *
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  background: function(color) {
    var rgba;

    if ("string" === typeof color) {
      rgba = Tilt.Math.hex2rgba(color);
    }
    else if ("undefined" === typeof color) {
      rgba = [0, 0, 0, 1];
    }
    else if ("number" === typeof color) {
      rgba = [color / 255, color / 255, color / 255, 1];
    }
    else {
      rgba = [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
    }

    // clear the color and depth buffers
    this.clear(rgba[0], rgba[1], rgba[2], rgba[3]);
  },

  /**
   * Sets a default perspective projection, with the near frustum rectangle
   * mapped to the canvas width and height bounds.
   */
  perspective: function() {
    var fov = 45,
      w = this.width,
      h = this.height,
      x = w / 2,
      y = h / 2,
      z = y / Math.tan(Tilt.Math.radians(45) / 2),
      znear = z / 10,
      zfar = z * 10,
      aspect = w / h;

    mat4.perspective(fov, aspect, znear, zfar, this.projMatrix, true);
    mat4.translate(this.projMatrix, [-x, -y, -z]);
    mat4.identity(this.mvMatrix);
    this.depthTest(true);
  },

  /**
   * Sets a default orthographic projection (recommended for 2d rendering).
   */
  ortho: function() {
    var clip = 1000000;

    mat4.ortho(0, this.width, this.height, 0, -clip, clip, this.projMatrix);
    mat4.translate(this.projMatrix, [0, 0, -clip + 1]);
    mat4.identity(this.mvMatrix);
    this.depthTest(false);
  },

  /**
   * Sets a custom projection matrix.
   * @param {Array} matrix: the custom projection matrix to be used
   */
  projection: function(matrix) {
    mat4.set(matrix, this.projMatrix);
  },

  /**
   * Pushes the current model view matrix on a stack, to be popped out later.
   * This can be used, for example, to create complex animations and be able
   * to revert back to the current model view.
   */
  pushMatrix: function() {
    this.mvMatrixStack.push(mat4.create(this.mvMatrix));
  },

  /**
   * Pops an existing model view matrix from stack.
   * Use this only after pushMatrix() has been previously called.
   */
  popMatrix: function() {
    if (this.mvMatrixStack.length > 0) {
      this.mvMatrix = this.mvMatrixStack.pop();
    }
  },

  /**
   * Resets the model view matrix to identity.
   * This is a default matrix with no rotation, no scaling, at (0, 0, 0);
   */
  origin: function() {
    mat4.identity(this.mvMatrix);
  },

  /**
   * Transforms the model view matrix with a new matrix.
   * Useful for creating custom transformations.
   *
   * @param {Array} matrix: the matrix to be multiply the model view with
   */
  transform: function(matrix) {
    mat4.multiply(this.mvMatrix, matrix);
  },

  /**
   * Translates the model view by the x, y and z coordinates.
   *
   * @param {Number} x: the x amount of translation
   * @param {Number} y: the y amount of translation
   * @param {Number} z: the z amount of translation
   */
  translate: function(x, y, z) {
    mat4.translate(this.mvMatrix, [x, y, z || 0]);
  },

  /**
   * Rotates the model view by a specified angle on the x, y and z axis.
   *
   * @param {Number} angle: the angle expressed in radians
   * @param {Number} x: the x axis of the rotation
   * @param {Number} y: the y axis of the rotation
   * @param {Number} z: the z axis of the rotation
   */
  rotate: function(angle, x, y, z) {
    mat4.rotate(this.mvMatrix, angle, [x, y, z]);
  },

  /**
   * Rotates the model view by a specified angle on the x axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateX: function(angle) {
    mat4.rotateX(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the y axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateY: function(angle) {
    mat4.rotateY(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the z axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateZ: function(angle) {
    mat4.rotateZ(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by specified angles on the x, y, and z axis.
   *
   * @param {Number} x: the x axis rotation
   * @param {Number} y: the y axis rotation
   * @param {Number} z: the z axis rotation
   */
  rotateXYZ: function(x, y, z) {
    mat4.rotateX(this.mvMatrix, x);
    mat4.rotateY(this.mvMatrix, y);
    mat4.rotateZ(this.mvMatrix, z);
  },

  /**
   * Scales the model view by the x, y and z coordinates.
   *
   * @param {Number} x: the x amount of scaling
   * @param {Number} y: the y amount of scaling
   * @param {Number} z: the z amount of scaling
   */
  scale: function(x, y, z) {
    mat4.scale(this.mvMatrix, [x, y, z || 0]);
  },

  /**
   * Sets the current tint color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  tint: function(color) {
    var rgba = Tilt.Math.hex2rgba(color),
      tint = this.$tintColor;

    tint[0] = rgba[0];
    tint[1] = rgba[1];
    tint[2] = rgba[2];
    tint[3] = rgba[3];
  },

  /**
   * Disables the current tint color value.
   */
  noTint: function() {
    var tint = this.$tintColor;
    tint[0] = 1;
    tint[1] = 1;
    tint[2] = 1;
    tint[3] = 1;
  },

  /**
   * Sets the current fill color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  fill: function(color) {
    var rgba = Tilt.Math.hex2rgba(color),
      fill = this.$fillColor;

    fill[0] = rgba[0];
    fill[1] = rgba[1];
    fill[2] = rgba[2];
    fill[3] = rgba[3];
  },

  /**
   * Disables the current fill color value.
   */
  noFill: function() {
    var fill = this.$fillColor;
    fill[0] = 0;
    fill[1] = 0;
    fill[2] = 0;
    fill[3] = 0;
  },

  /**
   * Sets the current stroke color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  stroke: function(color) {
    var rgba = Tilt.Math.hex2rgba(color),
      stroke = this.$strokeColor;

    stroke[0] = rgba[0];
    stroke[1] = rgba[1];
    stroke[2] = rgba[2];
    stroke[3] = rgba[3];
  },

  /**
   * Disables the current stroke color value.
   */
  noStroke: function() {
    var stroke = this.$strokeColor;
    stroke[0] = 0;
    stroke[1] = 0;
    stroke[2] = 0;
    stroke[3] = 0;
  },

  /**
   * Sets the current stroke weight (line width).
   * @param {Number} weight: the stroke weight
   */
  strokeWeight: function(value) {
    if (this.$strokeWeightValue !== value) {
      this.$strokeWeightValue = value;
      this.gl.lineWidth(value);
    }
  },

  /**
   * Sets blending, either "alpha" or "add" (additive blending).
   * Anything else disables blending.
   *
   * @param {String} mode: blending, either "alpha", "add" or falsy
   */
  blendMode: function(mode) {
    var gl = this.gl;

    if ("alpha" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    else if ("add" === mode || "additive" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }
    else {
      gl.disable(gl.BLEND);
    }
  },

  /**
   * Sets if depth testing should be enabled or not.
   * Disabling could be useful when handling transparency (for example).
   *
   * @param {Boolean} enabled: true if depth testing should be enabled
   */
  depthTest: function(enabled) {
    var gl = this.gl;

    if (enabled) {
      gl.enable(gl.DEPTH_TEST);
    }
    else {
      gl.disable(gl.DEPTH_TEST);
    }
  },

  /**
   * Sets if stencil testing should be enabled or not.
   * @param {Boolean} enabled: true if stencil testing should be enabled
   */
  stencilTest: function(enabled) {
    var gl = this.gl;

    if (enabled) {
      gl.enable(gl.STENCIL_TEST);
    }
    else {
      gl.disable(gl.STENCIL_TEST);
    }
  },

  /**
   * Resets the drawing style to default.
   */
  defaults: function(depthTest, blendMode) {
    this.tint("#fff");
    this.fill("#fff");
    this.stroke("#000");
    this.strokeWeight(1);
    this.depthTest(true);
    this.stencilTest(false);
    this.blendMode("alpha");
  },

  /**
   * Helper function to set active the color shader with required params.
   *
   * @param {Tilt.VertexBuffer} verticesBuffer: a buffer of vertices positions
   * @param {Array} color: the color used, as [r, g, b, a] with 0..1 range
   */
  useColorShader: function(vertices, color) {
    var program = this.colorShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", vertices);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
  },

  /**
   * Helper function to set active the texture shader with required params.
   *
   * @param {Tilt.VertexBuffer} verticesBuffer: a buffer of vertices positions
   * @param {Tilt.VertexBuffer} texCoordBuffer: a buffer of texture coords
   * @param {Array} color: the color used, as [r, g, b, a] with 0..1 range
   * @param {Tilt.Texture} texture: the texture to be applied
   */
  useTextureShader: function(vertices, texCoord, color, texture) {
    var program = this.textureShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", vertices);
    program.bindVertexBuffer("vertexTexCoord", texCoord);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
    program.bindTexture("sampler", texture);
  },

  /**
   * Draw a single triangle.
   * Do not abuse this function, it is quite slow, use for debugging only!
   *
   * @param {Array} v0: the [x, y, z] position of the first triangle point
   * @param {Array} v1: the [x, y, z] position of the second triangle point
   * @param {Array} v2: the [x, y, z] position of the third triangle point
   */
  triangle: function(v0, v1, v2) {
    var fill = this.$fillColor,
      stroke = this.$strokeColor,
      vertices = new Tilt.VertexBuffer([v0[0], v0[1], v0[2] || 0,
                                        v1[0], v1[1], v1[2] || 0,
                                        v2[0], v2[1], v2[2] || 0], 3);

    // draw the triangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, stroke);
      this.drawVertices(this.LINE_LOOP, vertices.numItems);
    }

    vertices.destroy();
    vertices = null;
  },

  /**
   * Draw a quad composed of four vertices.
   * Vertices must be in clockwise order, or else drawing will be distorted.
   *
   * @param {Array} v0: the [x, y, z] position of the first triangle point
   * @param {Array} v1: the [x, y, z] position of the second triangle point
   * @param {Array} v2: the [x, y, z] position of the third triangle point
   * @param {Array} v3: the [x, y, z] position of the fourth triangle point
   */
  quad: function(v0, v1, v2, v3) {
    var fill = this.$fillColor,
      stroke = this.$strokeColor,
      vertices = new Tilt.VertexBuffer([v0[0], v0[1], v0[2] || 0,
                                        v1[0], v1[1], v1[2] || 0,
                                        v2[0], v2[1], v2[2] || 0,
                                        v3[0], v3[1], v3[2] || 0], 3);

    // draw the quad only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_FAN, vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, stroke);
      this.drawVertices(this.LINE_LOOP, vertices.numItems);
    }

    vertices.destroy();
    vertices = null;
  },

  /**
   * Modifies the location from which rectangles draw. The default mode is
   * rectMode("corner"), which specifies the location to be the upper left
   * corner of the shape and uses the third and fourth parameters of rect() to
   * specify the width and height. Use rectMode("center") to draw centered
   * at the given x and y position.
   *
   * @param {String} mode: either "corner" or "center"
   */
  rectMode: function(mode) {
    this.$rectangle.rectModeValue = mode;
  },

  /**
   * Draws a rectangle using the specified parameters.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   */
  rect: function(x, y, width, height) {
    var rectangle = this.$rectangle,
      wireframe = this.$rectangleWireframe,
      fill = this.$fillColor,
      stroke = this.$strokeColor,
      vertices = rectangle.vertices,
      wvertices = wireframe.vertices;

    // if rectMode is set to "center", we need to offset the origin
    if ("center" === this.$rectangle.rectModeValue) {
      x -= width / 2;
      y -= height / 2;
    }

    // in memory, the rectangle is represented as a perfect 1x1 square, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.translate(x, y, 0);
    this.scale(width, height, 1);

    // draw the rectangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wvertices, stroke);
      this.drawVertices(this.LINE_LOOP, wvertices.numItems);
    }

    this.popMatrix();
  },

  /**
   * Modifies the location from which images draw. The default mode is
   * imageMode("corner"), which specifies the location to be the upper left
   * corner and uses the fourth and fifth parameters of image() to set the
   * image"s width and height. Use imageMode("center") to draw images centered
   * at the given x and y position.
   *
   * @param {String} mode: either "corner" or "center"
   */
  imageMode: function(mode) {
    this.$rectangle.imageModeValue = mode;
  },

  /**
   * Draws an image using the specified parameters.
   *
   * @param {Tilt.Texture} tex: the texture to be used
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   * @param {Tilt.VertexBuffer} texCoord: optional, custom texture coordinates
   */
  image: function(tex, x, y, width, height, texCoord) {
    if (!tex.loaded) {
      return;
    }

    var rectangle = this.$rectangle,
      tint = this.$tintColor,
      stroke = this.$strokeColor,
      vertices = rectangle.vertices,
      texCoordBuffer = texCoord || rectangle.texCoord;

    // if the width and height are not specified, we use the embedded
    // texture dimensions, from the source image or framebuffer
    if ("undefined" === typeof width || "undefined" === typeof height) {
      width = tex.width;
      height = tex.height;
    }

    // if imageMode is set to "center", we need to offset the origin
    if ("center" === rectangle.imageModeValue) {
      x -= width * 0.5;
      y -= height * 0.5;
    }

    // draw the image only if the tint alpha channel is not transparent
    if (tint[3]) {
      // in memory, the rectangle is represented as a perfect 1x1 square, so
      // some transformations are applied to achieve the desired shape
      this.pushMatrix();
      this.translate(x, y, 0);
      this.scale(width, height, 1);

      // use the necessary shader and draw the vertices
      this.useTextureShader(vertices, texCoordBuffer, tint, tex);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);

      this.popMatrix();
    }
  },

  /**
   * Draws a box using the specified parameters.
   *
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   * @param {Number} depth: the depth of the object
   * @param {Tilt.Texture} tex: the texture to be used
   */
  box: function(width, height, depth, tex) {
    var cube = this.$cube,
      wireframe = this.$cubeWireframe,
      tint = this.$tintColor,
      fill = this.$fillColor,
      stroke = this.$strokeColor;

    // in memory, the box is represented as a simple perfect 1x1 cube, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.scale(width, height, depth);

    if (tex) {
      // draw the box only if the tint alpha channel is not transparent
      if (tint[3]) {
        // use the necessary shader and draw the vertices
        this.useTextureShader(cube.vertices, cube.texCoord, tint, tex);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    }
    else {
      // draw the box only if the fill alpha channel is not transparent
      if (fill[3]) {
        // use the necessary shader and draw the vertices
        this.useColorShader(cube.vertices, fill);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wireframe.vertices, stroke);
      this.drawIndexedVertices(this.LINES, wireframe.indices);
    }

    this.popMatrix();
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   *
   * @param {Number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {Number} count: the number of indices to be rendered
   */
  drawVertices: function(drawMode, count) {
    this.gl.drawArrays(drawMode, 0, count);
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   * This function also makes use of an index buffer.
   *
   * @param {Number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {Tilt.IndexBuffer} indicesBuffer: indices for the vertices buffer
   */
  drawIndexedVertices: function(drawMode, indicesBuffer) {
    var gl = this.gl;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.$ref);
    gl.drawElements(drawMode, indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  },

  /**
   * Helper function to create a 3D context in a cross browser way.
   *
   * @param {HTMLCanvasElement} canvas: the canvas to get the WebGL context
   * @param {Object} opt_attribs: optional attributes used for initialization
   * @reuturn {Object} the WebGL context, or undefined if anything failed
   */
  create3DContext: function(canvas, opt_attribs) {
    var names = ["experimental-webgl", "webgl", "webkit-3d", "moz-webgl"],
      context, i, len;

    for (i = 0, len = names.length; i < len; i++) {
      try { context = canvas.getContext(names[i], opt_attribs); } catch(e) {}
      finally {
        if (context) {
          return context;
        }
      }
    }

    return undefined;
  },

  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally,
   * and resets the model view and projection matrices.
   * Use it at the beginning of your loop function, like this:
   *
   *      function draw() {
   *        tilt.loop(draw);
   *
   *        // do rendering
   *        ...
   *      };
   *      draw();
   *
   * @param {Function} draw: the function to be called each frame
   * @param {Boolean} debug: true if params like frame rate and frame delta
   * should be calculated
   */
  loop: function(draw, debug) {
    window.requestAnimFrame(draw);

    // reset the model view and projection matrices
    this.perspective();

    // increment the total frame count
    this.frameCount++;

    // only compute debugging variables if we really want to
    if (debug) {

      // calculate the frame delta and frame rate using the current time
      this.$currentTime = new Date().getTime();
      if (this.$lastTime !== 0) {
        this.frameDelta = this.$currentTime - this.$lastTime;
        this.frameRate = 1000 / this.frameDelta;
      }

      // increase the elapsed time based on the frame delta
      this.$lastTime = this.$currentTime;
      this.elapsedTime += this.frameDelta;
    }
  },

  /**
   * Clears the Tilt cache, destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.clearCache();
    Tilt.destroyObject(this);
  }
};
