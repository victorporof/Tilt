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

var EXPORTED_SYMBOLS = ["TiltDraw"];

/**
 * TiltDraw constructor.
 * 
 * @param {object} canvas: the canvas element used for rendering
 * @param {function} successCallback: to be called if initialization worked
 * @param {function} failCallback: to be called if initialization failed
 *
 * @return {object} the created object
 */ 
function TiltDraw(canvas, failCallback, successCallback) {

  /**
   * By convention, we make a private 'that' variable.
   */
  var that = this;
  
  /**
   * Helper low level functions for WebGL.
   */
  var engine = new TiltEngine();

  /**
   * WebGL context for the canvas.
   */
  var gl = engine.initWebGL(canvas, failCallback, successCallback);

  /**
   * A shader useful for drawing vertices with only a color component.
   */
  var colorShader = null;

  /**
   * A shader useful for drawing vertices with both a color component and
   * texture coordinates.
   */
  var textureShader = null;
  
  /**
   * A modelview matrix stack, used for push/pop operations.
   */
  var mvMatrixStack = [];

  /**
   * The current modelview matrix;
   */
  var mvMatrix = null;

  /**
   * The current projection matrix;
   */
  var projMatrix = null;

  /**
   * Vertices representing the corners of a rectangle.
   */
  var rectangleVertexBuffer = null;

  /**
   * Vertices representing the corners of a cube.
   */
  var cubeVertexBuffer = null;

  /**
   * The current tint color applied to any objects which can be tinted.
   * These mostly represent images or texturable primitives.
   */
  var tint = [];

  /**
   * The current fill color applied to any objects which can be filled.
   * These are rectangles, circles, 2d primitives in general.
   */
  var fill = [];
  
  /**
   * The current stroke color applied to any objects which can be stroked.
   * This property mostly refers to lines.
   */
  var stroke = [];

  /**
   * The current stroke weight.
   * This property also refers to lines.
   */
  var strokeWeight = 0;

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
   * 
   * @return {object} this object initialized
   */
  this.initialize = function() {
    // initializing a color shader
    engine.initProgram(TiltShaders.Color.vs, 
                       TiltShaders.Color.fs, function readyCallback(p) {
      colorShader = p;
      colorShader.vertexPosition = engine.shaderIO(p, "vertexPosition");

      colorShader.mvMatrix = engine.shaderIO(p, "mvMatrix");
      colorShader.projMatrix = engine.shaderIO(p, "projMatrix");
      colorShader.color = engine.shaderIO(p, "color");
      
      colorShader.setAttributes = function(verticesBuffer) {
        engine.bindVertexBuffer(colorShader.vertexPosition, verticesBuffer);
      };
      
      colorShader.setUniforms = function(mvMatrix, projMatrix, color) {
        engine.bindUniformMatrix(colorShader.mvMatrix, mvMatrix);
        engine.bindUniformMatrix(colorShader.projMatrix, projMatrix);
        engine.bindUniformVec4(colorShader.color, color);
      };
      
      colorShader.use = function(verticesBuffer,
                                 mvMatrix, projMatrix, color) {
        
        engine.useProgram(colorShader, 
          [colorShader.vertexPosition]);
        
        colorShader.setAttributes(verticesBuffer);
        colorShader.setUniforms(mvMatrix, projMatrix, color);
      };
    });
    
    // initializing a texture shader
    engine.initProgram(TiltShaders.Texture.vs,
                       TiltShaders.Texture.fs, function readyCallback(p) {
      textureShader = p;
      textureShader.vertexPosition = engine.shaderIO(p, "vertexPosition");
      textureShader.vertexTexCoord = engine.shaderIO(p, "vertexTexCoord");

      textureShader.mvMatrix = engine.shaderIO(p, "mvMatrix");
      textureShader.projMatrix = engine.shaderIO(p, "projMatrix");
      textureShader.color = engine.shaderIO(p, "color");
      textureShader.sampler = engine.shaderIO(p, "sampler");
            
      textureShader.setAttributes = function(verticesBuffer, texCoordBuffer) {
        engine.bindVertexBuffer(textureShader.vertexPosition, verticesBuffer);
        engine.bindVertexBuffer(textureShader.vertexTexCoord, texCoordBuffer);
      };
      
      textureShader.setUniforms = function(mvMatrix, projMatrix, col, tex) {
        engine.bindUniformMatrix(textureShader.mvMatrix, mvMatrix);
        engine.bindUniformMatrix(textureShader.projMatrix, projMatrix);
        engine.bindUniformVec4(textureShader.color, col);
        engine.bindTexture(textureShader.sampler, tex);
      };

      textureShader.use = function(verticesBuffer, texCoordBuffer,
                                   mvMatrix, projMatrix, color, texture) {

        engine.useProgram(textureShader, 
          [textureShader.vertexPosition, textureShader.vertexTexCoord]);
        
        textureShader.setAttributes(verticesBuffer, texCoordBuffer);
        textureShader.setUniforms(mvMatrix, projMatrix, color, texture);
      };
    });
    
    // modelview and projection matrices used for transformations
    mat4.identity(mvMatrix = mat4.create());
    mat4.identity(projMatrix = mat4.create());
    
    // set the default modelview and projection matrices
    that.origin();
    that.perspective();
    
    // set the default rendering properties
    that.blendMode("alpha");
    that.depthTest(true);
    
    // set the default tint, fill, stroke and stroke weight
    that.tint("#fff");
    that.fill("#fff");
    that.stroke("#000");
    that.strokeWeight(1);
    
    // buffer of 2-component vertices (x, y) as the corners of a rectangle
    rectangleVertexBuffer = engine.initBuffer([
      0, 0, 1, 0, 0, 1, 1, 1], 2);
      
    // buffer of 2-component texture coordinates (u, v) for the rectangle
    rectangleVertexBuffer.texCoord = engine.initBuffer([
      0, 0, 1, 0, 0, 1, 1, 1], 2);
    
    // buffer of 3-component vertices (x, y, z) as the corners of a cube
    cubeVertexBuffer = engine.initBuffer([
      -0.5, -0.5,  0.5, // front
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5, // top
       0.5,  0.5,  0.5,
       0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5, // back
       0.5,  0.5, -0.5,
       0.5, -0.5, -0.5,
      -0.5, -0.5, -0.5,
      -0.5, -0.5, -0.5, // bottom
       0.5, -0.5, -0.5,
       0.5, -0.5,  0.5,
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5, // right
       0.5, -0.5, -0.5,
       0.5,  0.5, -0.5,
       0.5,  0.5,  0.5,
      -0.5, -0.5, -0.5, // left
      -0.5, -0.5,  0.5,
      -0.5,  0.5,  0.5,
      -0.5,  0.5, -0.5], 3);
    
    // buffer of 2-component texture coordinates (u, v) for the cube
    cubeVertexBuffer.texCoord = engine.initBuffer([
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0,	1, 1, 0, 1,
      1, 1, 0, 1,	0, 0, 1, 0,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0,	1, 1, 0, 1,
      0, 0, 1, 0,	1, 1, 0, 1], 2);
      
    // vertex indices for the cube vertices, defining the order for which
    // these points can create a cube from triangles
    cubeVertexBuffer.indices = engine.initIndexBuffer([
      0, 1, 2, 0, 2, 3,
      4, 5, 6, 4, 6, 7,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23]);

    return that;
  };
  
  /**
   * Returns true if the initialization is complete (currently, this means 
   * that both the color and the texture shader are loaded).
   *
   * @return {boolean} true if the initialization is complete
   */
  this.isInitialized = function() {
    return colorShader && textureShader;
  };
  
  /**
   * Returns the time count.
   * This represents the total time passed since initialization.
   *
   * @return {number} the time count
   */
  this.getTimeCount = function() {
    return timeCount;
  };

  /**
   * Returns the frame count.
   * This is a counter for the number of frames passed since initialization.
   *
   * @return {number} the frame count
   */
  this.getFrameCount = function() {
    return frameCount;
  };

  /**
   * Returns the framerate.
   * This is a variable retaining the current frame rate.
   *
   * @return {number} the framerate
   */
  this.getFrameRate = function() {
    return frameRate;
  };

  /**
   * Returns the frame delta time.
   * Represents the delta time elapsed between frames.
   *
   * @return {number} the frame delta time
   */
  this.getFrameDelta = function() {
    return frameDelta;
  };

  // Helpers for managing variables like frameCount, frameRate, frameDelta
  // Used internally, in the requestAnimFrame function
  var currentTime = 0;
  var lastTime = 0;

  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally.
   * Use this at the beginning of your loop function, like this:
   *
   *      function draw() {
   *        window.requestAnimFrame(draw, canvas);
   *
   *        // do rendering
   *        ...
   *      }
   *      draw();
   *
   * @param {function} loop: the function to be called each frame
   */
  this.requestAnimFrame = function(draw) {
    window.requestAnimFrame(draw, canvas);

    if (that.isInitialized()) {
      currentTime = new Date().getTime();
      
      if (lastTime !== 0) {
        frameDelta = currentTime - lastTime;
        frameRate = 1000 / frameDelta;
      }
      lastTime = currentTime;
      
      timeCount += frameDelta;
      frameCount++;
    }
  };

  /**
   * Sets up the WebGL context viewport.
   * This defines the width and height of the gl drawing canvas context (but
   * not the size of the actual canvas element).
   *
   * @param {number} width: the width of the viewport area
   * @param {number} height: the height of the viewport area
   */
  this.viewport = function(width, height) {
    gl.viewport(0, 0, width, height);
  };

  /**
   * Sets a default perspective projection, with the near frustum rectangle
   * mapped to the canvas width and height bounds.
   */
  this.perspective = function() {
    var fov = 45;
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var x = w / 2.0;
    var y = h / 2.0;

    var z = y / Math.tan(TiltUtils.Math.radians(45) / 2);
    var znear = z / 10;
    var zfar = z * 10;
    var aspect = w / h;
    
    that.viewport(canvas.width, canvas.height);
    mat4.perspective(fov, aspect, znear, zfar, projMatrix, true);
    mat4.translate(projMatrix, [-x, -y, -z]);
  };

  /**
   * Sets a default orthographic projection.
   * This is recommended for 2d rendering.
   */
  this.ortho = function() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;

    that.viewport(canvas.width, canvas.height);
    mat4.ortho(0, w, h, 0, -100, 100, projMatrix);
  };
  
  /**
   * Sets a custom projection matrix.
   *
   * @param {object} matrix the custom projection matrix to be used
   */
   this.projection = function(matrix) {
     that.viewport(canvas.width, canvas.height);
     mat4.set(matrix, projMatrix);
   };

  /**
   * Pushes the current modelview matrix on a stack, to be popped out later.
   * This can be used, for example, to create complex animations and be able 
   * to revert back to the current modelview later.
   */
  this.pushMatrix = function() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
  };

  /**
   * Pops an existing model view matrix from stack.
   * Use this only after pushMatrix() has been previously called.
   */
  this.popMatrix = function() {
    if (mvMatrixStack.length > 0) {
      mvMatrix = mvMatrixStack.pop();
    }
  };

  /**
   * Resets the modelview matrix to identity.
   * This is a default matrix with no rotation, no scaling, at (0, 0, 0);
   */
  this.origin = function() {
    mat4.identity(mvMatrix);
  };

  /**
   * Translates the modelview by the x, y and z coordinates.
   *
   * @param {number} x: the x ammount of translation
   * @param {number} y: the y ammount of translation
   * @param {number} z: the z ammount of translation
   */
  this.translate = function(x, y, z) {
    mat4.translate(mvMatrix, [x, y, z]);
  };

  /**
   * Rotates the modelview by a specified angle on the x, y and z axis.
   *
   * @param {number} x: the x axis of the rotation
   * @param {number} y: the y axis of the rotation
   * @param {number} z: the z axis of the rotation
   * @param {number} angle: the angle expressed in radians
   */
  this.rotate = function(x, y, z, angle) {
    mat4.rotate(mvMatrix, angle, [x, y, z]);
  };

  /**
   * Rotates the modelview by a specified angle on the x axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  this.rotateX = function(angle) {
    mat4.rotateX(mvMatrix, angle);
  };

  /**
   * Rotates the modelview by a specified angle on the y axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  this.rotateY = function(angle) {
    mat4.rotateY(mvMatrix, angle);
  };

  /**
   * Rotates the modelview by a specified angle on the z axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  this.rotateZ = function(angle) {
    mat4.rotateZ(mvMatrix, angle);
  };

  /**
   * Scales the modelview by the x, y and z coordinates.
   *
   * @param {number} x: the x ammount of scaling
   * @param {number} y: the y ammount of scaling
   * @param {number} z: the z ammount of scaling
   */
  this.scale = function(x, y, z) {
    mat4.scale(mvMatrix, [x, y, z]);
  };

  /**
   * Sets the current tint color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  this.tint = function(color) {
    tint = TiltUtils.Math.hex2rgba(color);
  };

  /**
   * Disables the current tint color value.
   */
  this.noTint = function() {
    tint = [1, 1, 1, 1];
  };

  /**
   * Sets the current fill color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  this.fill = function(color) {
    fill = TiltUtils.Math.hex2rgba(color);
  };

  /**
   * Disables the current fill color value.
   */
  this.noFill = function() {
    fill = [0, 0, 0, 0];
  };

  /**
   * Sets the current stroke color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  this.stroke = function(color) {
    stroke = TiltUtils.Math.hex2rgba(color);
  };

  /**
   * Disables the current stroke color value.
   */
  this.noStroke = function() {
    stroke = [0, 0, 0, 0];
  };
  
  /**
   * Sets the current stroke weight.
   *
   * @param {number} weight: the stroke weight
   */
  this.strokeWeight = function(weight) {
    strokeWeight = weight;
  };
  
  /**
   * Clears the canvas context (usually at the beginning of each frame).
   * If the color is undefined, it will default to opaque white.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  this.background = function(color) {
    if (!color) {
      color = [1, 1, 1, 1];
    }
    else {
      color = TiltUtils.Math.hex2rgba(color);
    }

    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  };

  /**
   * Draws a rectangle using the specified parameters.
   *
   * @param {number} x: the x position of the object
   * @param {number} y: the y position of the object
   * @param {number} z: the z position of the object
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   */
  this.rect = function(x, y, z, width, height) {
    that.pushMatrix();
    that.translate(x, y, z);
    that.scale(width, height, 1);
    
    colorShader.use(rectangleVertexBuffer,
                    mvMatrix, projMatrix, fill);

    engine.drawVertices(gl.TRIANGLE_STRIP, 0, rectangleVertexBuffer.numItems);
    that.popMatrix();
  };
  
  /**
   * Draws an image using the specified parameters.
   *
   * @param {object} texture: the texture to be used
   * @param {number} x: the x position of the object
   * @param {number} y: the y position of the object
   * @param {number} z: the z position of the object
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   */
  this.image = function(texture, x, y, z, width, height) {
    if (!width || !height) {
      width = texture.image.width;
      height = texture.image.height;
    }

    that.pushMatrix();
    that.translate(x, y, z);
    that.scale(width, height, 1);
    
    textureShader.use(rectangleVertexBuffer,
                      rectangleVertexBuffer.texCoord,
                      mvMatrix, projMatrix, tint, texture);

    engine.drawVertices(gl.TRIANGLE_STRIP, 0, rectangleVertexBuffer.numItems);
    that.popMatrix();
  };
  
  /**
   * Draws a box using the specified parameters.
   *
   * @param {number} x: the x position of the object
   * @param {number} y: the y position of the object
   * @param {number} z: the z position of the object
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   * @param {number} depth: the depth of the object
   * @param {object} texture: the texture to be used
   */
  this.box = function(x, y, z, width, height, depth, texture) {
    that.pushMatrix();
    that.translate(x, y, z);
    that.scale(width, height, depth);

    if (texture) {
      textureShader.use(cubeVertexBuffer,
                        cubeVertexBuffer.texCoord,
                        mvMatrix, projMatrix, tint, texture);
    }
    else {
      colorShader.use(cubeVertexBuffer,
                      mvMatrix, projMatrix, fill);
    }
    
    engine.drawIndexedVertices(gl.TRIANGLES, cubeVertexBuffer.indices);    
    that.popMatrix();
  };
  
  /**
   * 
   * @param {object} verticesBuffer: the vertices buffer (x, y and z)
   * @param {object} texCoordBuffer: the texture coordinates buffer (u, v)
   * @param {object} normalsBuffer: the normals buffer (m, n, p)
   * @param {number} or {string} drawMode: gl enum, like gl.TRIANGLES, or
   * 'triangles', 'triangle-strip, 'triangle-fan, 'points', 'lines' etc.
   * @param {string} color: the color to be used by the shader if required
   * @param {object} texture: the texture to be used by the shader if required
   * @param {object} indicesBuffer: indices for the passed vertices buffer
   */
  this.mesh = function(verticesBuffer, texCoordBuffer, normalsBuffer,
                       drawMode, color, texture, indicesBuffer) {
    
    if (texture) {
      textureShader.use(verticesBuffer, texCoordBuffer,
                        mvMatrix, projMatrix, "string" === typeof color ? 
                        TiltUtils.Math.hex2rgba(color) : color, texture);
    }
    else {
      colorShader.use(verticesBuffer,
                      mvMatrix, projMatrix, "string" === typeof color ? 
                      TiltUtils.Math.hex2rgba(color) : color);
    }
    
    if (indicesBuffer) {
      engine.drawIndexedVertices(drawMode, indicesBuffer);          
    }
    else {
      engine.drawVertices(drawMode, 0, verticesBuffer.numItems);    
    }

    // TODO: use the normals buffer, add some lighting
  }
  
  /**
   * Sets blending, either 'alpha' or 'add'; anything else disables blending.
   *
   * @param {string} mode: blending, either 'alpha', 'add' or undefined
   */
  this.blendMode = function(mode) {
    if (mode === "alpha") {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    else if (mode === "add" || mode === "additive") {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
    }
    else {
      gl.disable(gl.BLEND);
    }
  };

  /**
   * Sets depth testing; disabling it is useful when handling transparency.
   *
   * @param {boolean} mode: true if depth testing should be enabled
   */
  this.depthTest = function(mode) {
    if (mode && mode !== "false") {
      gl.enable(gl.DEPTH_TEST);
    }
    else {
      gl.disable(gl.DEPTH_TEST);
    }
  };

  /**
   * Sets the dimensions of the canvas object.
   *
   * @param {number} width: the width of the canvas
   * @param {number} height: the height of the canvas
   */
  this.size = function(width, height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);

    that.origin();
    that.perspective();
  };
  
  /**
   * Simple closures wrapping some engine functions for easier access.
   */
  this.initProgram = engine.initProgram;
  this.useProgram = engine.useProgram;  
  this.shaderIO = engine.shaderIO;
  this.bindUniformMatrix = engine.bindUniformMatrix;
  this.bindUniformVec4 = engine.bindUniformVec4;
  this.bindTexture = engine.bindTexture;
  this.initBuffer = engine.initBuffer;
  this.initIndexBuffer = engine.initIndexBuffer;
  this.initTexture = engine.initTexture;
  this.drawVertices = engine.drawVertices;
  this.drawIndexedVertices = engine.drawIndexedVertices;
  
  /**
   * Destroys this object.
   */
  this.destroy = function() {
    engine.destroy();
    engine = null;
    gl = null;
    
    colorShader = null;
    textureShader = null;
    mvMatrixStack = null;
    mvMatrix = null;
    projMatrix = null;
    
    rectangleVertexBuffer = null;
    cubeVertexBuffer = null;
    
    that = null;
  };
}

/**
 * Creates a Tilt environemnt. The readyCallback function is called when
 * initialization is complete, along with the canvas and additionally, an 
 * instance of TiltDraw passed as a parameter. For more complex initialization
 * scenarios, use TiltUtils.Document.initCanvas and create a TiltDraw object.
 * Use this function to append a canvas element to the document, like this:
 *
 *      TiltDraw.Create(640, 480, function readyCallback(tilt) {
 *        setup();
 *        draw();
 *
 *        function setup() {
 *          // initialization logic
 *          ...
 *        };
 *
 *        function draw() {
 *          tilt.requestAnimFrame(draw);
 *          tilt.background("#ff0");
 *
 *          // do rendering
 *          ...
 *        };
 *      });
 *
 * @param {object} width: specify the initial width of the canvas
 * @param {object} height: specify the initial height of the canvas
 * @param {function} readyCallback: function called when initialization ready
 */
TiltDraw.Create = function(width, height, readyCallback) {
  TiltUtils.Document.initCanvas(function initCallback(canvas) {
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
    }
    
    if (readyCallback) {
      readyCallback(canvas, new TiltDraw(canvas).initialize());
    }
  }, true);
}