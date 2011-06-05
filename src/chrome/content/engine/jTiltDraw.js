/*
 * jTiltDraw.js - Helper drawing functions for WebGL
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
function TiltDraw(aCanvas, width, height, successCallback, failCallback) {

  /**
   * Helper low level functions for WebGL.
   */
  var engine = new TiltEngine();

  /**
   * Canvas element used by the engine.
   */
  var canvas = aCanvas;

  /**
   * WebGL context for the canvas.
   */
  var gl = engine.initWebGL(canvas, width, height,
                            successCallback, failCallback);

  /**
   * A shader useful for drawing vertices with only a color component.
   */
  var colorShader;

  /**
   * A shader useful for drawing vertices with both a color component and
   * texture coordinates.
   */
  var textureShader;

  /**
   * A modelview matrix stack, used for push/pop operations.
   */
  var mvMatrixStack = [];

  /**
   * The current modelview matrix;
   */
  var mvMatrix;

  /**
   * The current projection matrix;
   */
  var projMatrix;

  /**
   * Vertices representing the corners of a rectangle.
   */
  var rectangleVertices;

  /**
   * Vertices representing the corners of a cube.
   */
  var cubeVertices;

  /**
   * Time passed since initialization.
   */
  var timeCount = 0;

  /**
   * Counter for the number of frames passed since initialization.
   */
  var frameCount = 0;

  /**
   * Variable retaining the current frame rate.
   */
  var frameRate = 0;

  /**
   * Variable representing the delta time elapsed between frames.
   * Use this to create smooth animations regardless of framerate.
   */
  var frameDelta = 0;

  /**
   * Performs mandatory initialization of shaders and other objects required
   * for drawing, like vertex buffers and primitives.
   */
  this.initialize = function() {
    var colorShaderPath =
      "chrome://tilt/content/engine/shaders/shader-color";

    var textureShaderPath =
      "chrome://tilt/content/engine/shaders/shader-texture";

    engine.initShader(colorShaderPath, function ready(p) {
      colorShader = p;
      colorShader.vertexPosition = engine.shaderIO(p, "vertexPosition");

      colorShader.mvMatrix = engine.shaderIO(p, "mvMatrix");
      colorShader.projMatrix = engine.shaderIO(p, "projMatrix");
      colorShader.color = engine.shaderIO(p, "color");
    });

    engine.initShader(textureShaderPath, function ready(p) {
      textureShader = p;
      textureShader.vertexPosition = engine.shaderIO(p, "vertexPosition");
      textureShader.vertexTexCoord = engine.shaderIO(p, "vertexTexCoord");

      textureShader.mvMatrix = engine.shaderIO(p, "mvMatrix");
      textureShader.projMatrix = engine.shaderIO(p, "projMatrix");
      textureShader.color = engine.shaderIO(p, "color");
      textureShader.sampler = engine.shaderIO(p, "sampler");
    });

    mat4.identity(mvMatrix = mat4.create());
    mat4.identity(projMatrix = mat4.create());

    rectangleVertices = engine.initBuffer([
      0, 0, 1, 0, 0, 1, 1, 1], 2);
    
    cubeVertices = engine.initBuffer([
      -1.0, -1.0, 1.0, 1.0,
      -1.0, 1.0, 1.0, 1.0,
      1.0, -1.0, 1.0, 1.0,
      -1.0, -1.0, -1.0, -1.0,
      1.0, -1.0, 1.0, 1.0,
      -1.0, 1.0, -1.0, -1.0,
      -1.0, 1.0, -1.0, -1.0,
      1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, -1.0,
      -1.0, -1.0, -1.0, 1.0,
      -1.0, -1.0, 1.0, -1.0,
      1.0, -1.0, -1.0, 1.0,
      1.0, -1.0, -1.0, 1.0,
      1.0, -1.0, 1.0, 1.0,
      1.0, 1.0, -1.0, 1.0,
      -1.0, -1.0, -1.0, -1.0,
      -1.0, 1.0, -1.0, 1.0,
      1.0, -1.0, 1.0, -1.0], 3);
      
    cubeVertices.indices = engine.initIndexBuffer([
      0, 1, 2, 0, 2, 3,
      4, 5, 6, 4, 6, 7,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23]);
      
    return this;
  }

  /**
   * Returns true if the initialization is complete.
   */
  this.isInitialized = function() {
    return colorShader && textureShader;
  }

  /**
   * Returns the engine.
   */
   this.getEngine = function() {
     return engine;
   }

  /**
   * Returns the canvas.
   */
  this.getCanvas = function() {
    return canvas;
  }

  /**
   * Returns the canvas width.
   */
  this.getCanvasWidth = function() {
    return canvas.width;
  }

  /**
   * Returns the canvas height.
   */
  this.getCanvasHeight = function() {
    return canvas.height;
  }

  /**
   * Returns the time count.
   */
  this.getTimeCount = function() {
    return timeCount;
  }

  /**
   * Returns the frame count.
   */
  this.getFrameCount = function() {
    return frameCount;
  }

  /**
   * Returns the framerate.
   */
  this.getFrameRate = function() {
    return frameRate;
  }

  /**
   * Returns the frame delta time.
   */
  this.getFrameDelta = function() {
    return frameDelta;
  }

  /**
   * Helpers for managing variables like frameCount, frameRate, frameDelta.
   */
  var currentTime = 0;
  var lastTime = 0;

  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally.
   */
  this.requestAnimFrame = function(loop) {
    window.requestAnimFrame(loop, canvas);

    currentTime = new Date().getTime();
    if (lastTime != 0) {
      frameDelta = currentTime - lastTime;
    }
    lastTime = currentTime;

    timeCount += frameDelta;
    frameCount++;
    frameRate = 0;
  }

  /**
   * Sets up the WebGL context viewport.
   */
  this.viewport = function(width, height) {
    gl.viewport(0, 0, width, height);
  }

  /**
   * Sets a default perspective projection, with the near frustum rectangle
   * mapped to the canvas width and height bounds.
   */
  this.perspective = function() {
    var fov = 45;
    var w = canvas.width;
    var h = canvas.height;
    var x = w / 2.0;
    var y = h / 2.0;

    var z = y / Math.tan(TiltUtils.Math.radians(45) / 2);
    var znear = z / 10;
    var zfar = z * 10;
    var aspect = w / h;

    this.viewport(canvas.width, canvas.height);
    mat4.perspective(fov, aspect, znear, zfar, projMatrix, true);
    mat4.translate(projMatrix, [-x, -y, -z]);
    mat4.identity(mvMatrix);
  }

  /**
   * Sets a default orthographic projection.
   */
  this.ortho = function() {
    this.viewport(canvas.width, canvas.height);
    mat4.ortho(0, canvas.width, canvas.height, 0, -100, 100, projMatrix);
    mat4.identity(mvMatrix);
  }

  /**
   * Pushes the current modelview matrix on a stack, to be popped out later.
   */
  this.pushMatrix = function() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
  }

  /**
   * Pops an existing model view matrix from stack.
   */
  this.popMatrix = function() {
    if (mvMatrixStack.length > 0) {
      mvMatrix = mvMatrixStack.pop();
    }
  }

  /**
   * Resets the modelview matrix to identity.
   */
  this.origin = function() {
    mat4.identity(mvMatrix);
  }

  /**
   * Translates the modelview by the x, y and z coordinates.
   */
  this.translate = function(x, y, z) {
    mat4.translate(mvMatrix, [x, y, z]);
  }

  /**
   * Rotates the modelview by a specified angle on the x, y and z axis.
   */
  this.rotate = function(x, y, z, angle) {
    mat4.rotate(mvMatrix, angle, [x, y, z]);
  }

  /**
   * Rotates the modelview by a specified angle on the x axis.
   */
  this.rotateX = function(angle) {
    mat4.rotateX(mvMatrix, angle);
  }

  /**
   * Rotates the modelview by a specified angle on the y axis.
   */
  this.rotateY = function(angle) {
    mat4.rotateY(mvMatrix, angle);
  }

  /**
   * Rotates the modelview by a specified angle on the z axis.
   */
  this.rotateZ = function(angle) {
    mat4.rotateZ(mvMatrix, angle);
  }

  /**
   * Scales the modelview by the x, y and z coordinates.
   */
  this.scale = function(x, y, z) {
    mat4.scale(mvMatrix, [x, y, z]);
  }

  /**
   * Clears the canvas context (usually at the beginning of each frame).
   */
  this.background = function(color) {
    if (!color) {
      color = [0, 0, 0, 1];
    }
    else {
      color = TiltUtils.Math.hex2rgba(color);
    }

    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Draws a rectangle using the specified parameters.
   */
  this.rect = function(x, y, width, height, color) {
    engine.useShader(colorShader);
    this.pushMatrix();
    this.translate(x, y, 0);
    this.scale(width, height, 1);

    engine.drawVertices(mvMatrix, projMatrix,
                        rectangleVertices,                    // vertices
                        null,                                 // texture coord
                        color == undefined ?
                        [1, 1, 1, 1] : TiltUtils.Math.hex2rgba(color));
    this.popMatrix();
  }

  /**
   * Draws an image using the specified parameters.
   */
  this.image = function(texture, x, y, width, height, color) {
    if (width == undefined || height == undefined) {
      width = texture.image.width;
      height = texture.image.height;
    }

    engine.useShader(textureShader);
    this.pushMatrix();
    this.translate(x, y, 0);
    this.scale(width, height, 1);

    engine.drawVertices(mvMatrix, projMatrix,
                        rectangleVertices,                    // vertices
                        rectangleVertices,                    // texture coord
                        color == undefined ?
                        [1, 1, 1, 1] : TiltUtils.Math.hex2rgba(color),
                        texture);
    this.popMatrix();
  }
}
