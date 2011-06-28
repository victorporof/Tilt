/*
 * jTiltDraw.js - Helper drawing functions for WebGL
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
if ("undefined" === typeof(Tilt)) {
  var Tilt = {};
}

var EXPORTED_SYMBOLS = ["Tilt.Draw"];

/**
 * Creates a Tilt environment. The readyCallback function is called when
 * initialization is complete, along with the canvas and additionally, an 
 * instance of Tilt.Draw passed as a parameter. If this is running inside an
 * extension environment, a container iframe is also returned. For other more 
 * complex initialization scenarios, use Tilt.Document.initCanvas and 
 * create a Tilt.Draw object manually with the constructor.
 * Use this function to append a canvas element to the document, like this:
 *
 *      Tilt.Create(640, 480, function(tilt, canvas) {
 *        tilt.setup = function() {
 *          // initialization logic
 *          ...
 *        };
 *
 *        tilt.draw = function() {
 *          tilt.requestAnimFrame(tilt.draw);
 *          tilt.background("#f00");
 *
 *          // do rendering
 *          ...
 *        };
 *
 *        tilt.mousePressed = function(x, y) {
 *          // handle mouse events
 *          ...
 *        }
 *        ...
 *      });
 *
 * @param {number} width: specify the initial width of the canvas
 * @param {number} height: specify the initial height of the canvas
 * @param {function} readyCallback: function called when initialization ready
 * @return {object} the created object
 */
Tilt.Create = function(width, height, readyCallback) {
  // initialize the canvas element
  Tilt.Document.initCanvas(function(canvas, iframe) {
    canvas.width = width;
    canvas.height = height;
    
    // create the Tilt object, containing useful functions for easy drawing
    var tilt = new Tilt.Draw(canvas);
    
    // perform mandatory initialization of shaders and other objects required 
    // for drawing, like vertex buffers and primitives
    tilt.initialize(function() {
      // the readyCallback function is mandatory, but we check nevertheless
      if ("function" === typeof(readyCallback)) {
        readyCallback(tilt, canvas, iframe);
      }
      
      // automatically call the setup and/or draw functions if overridden
      if ("function" === typeof(tilt.setup)) {
        tilt.setup();
      }
      if ("function" === typeof(tilt.draw)) {
        tilt.draw();
      }
    });
  }, true);
};

/**
 * Tilt.Draw constructor.
 * When created, nothing is loaded (no shaders, no matrices, no buffers..).
 * Use the initialize() function to perform mandatory initialization of 
 * shaders, vertex buffers, events and other objects required for drawing.
 * Override these functions to handle events:
 *
 *      tilt.resize = function(width, height) { };
 *      tilt.mousePressed = function(mouseX, mouseY) { };
 *      tilt.mouseReleased = function(mouseX, mouseY) { };
 *      tilt.mouseClicked = function(mouseX, mouseY) { };
 *      tilt.mouseMoved = function(mouseX, mouseY) { };
 *      tilt.mouseOver = function(mouseX, mouseY) { };
 *      tilt.mouseOut = function(mouseX, mouseY) { };
 *      tilt.mouseScroll = function(scroll) { };
 * 
 * @param {object} canvas: the canvas element used for rendering
 * @param {function} successCallback: to be called if gl initialization worked
 * @param {function} failCallback: to be called if gl initialization failed
 * @return {object} the created object
 */ 
Tilt.Draw = function(canvas, failCallback, successCallback) {
  
  /**
   * By convention, we make a private "that" variable.
   */
  var that = this;
  
  /**
   * Helper low level functions for WebGL.
   */
  var engine = new Tilt.Engine();
  
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
   * A model view matrix stack, used for push/pop operations.
   */
  var mvMatrixStack = [];

  /**
   * The current model view matrix;
   */
  var mvMatrix = mat4.identity(mat4.create());
  
  /**
   * The current projection matrix;
   */
  var projMatrix = mat4.identity(mat4.create());
  
  /**
   * Vertices buffer representing the corners of a rectangle.
   */
  var rectangle = {};

  /**
   * Vertices buffer representing the corners of a cube.
   */
  var cube = {};

  /**
   * The current tint color applied to any objects which can be tinted.
   * These mostly represent images or primitives which are textured.
   */
  var tint = [];

  /**
   * The current fill color applied to any objects which can be filled.
   * These are rectangles, circles, boxes, 2d or 3d primitives in general.
   */
  var fill = [];
  
  /**
   * The current stroke color applied to any objects which can be stroked.
   * This property mostly refers to lines.
   */
  var stroke = [];

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
   * Variables defining the x and y coordinates of the mouse position. They
   * are updated automatically using canvas.onmousemove. If you need to handle
   * this event yourself, override this object"s mouseMoved(x, y) function.
   * Similarly, for the canvas.onclick event, override mousePressed(x, y).
   */
  this.mouseX = 0;
  this.mouseY = 0;
  
  /**
   * Variables representing the current framebuffer width and height.
   * For example, these will be updated or changed when rendering offscreen.
   */
  this.width = canvas.clientWidth;
  this.height = canvas.clientHeight;

  /**
   * Performs mandatory initialization of shaders and other objects required
   * for drawing, like vertex buffers and primitives.
   * 
   * @param {function} readyCallback: function called when initialization done
   * @return {object} this object initialized
   */
  this.initialize = function(readyCallback) {
    // extend this object with closures representing all the engine functions     
    for (var i in engine) {
      if ("function" === typeof(engine[i])) {
        that[i] = engine[i];
      }
    }
    
    // initializing a color shader
    engine.initProgram(Tilt.Shaders.Color.vs, 
                       Tilt.Shaders.Color.fs, function(p) {
      colorShader = p;
      colorShader.vertexPosition = engine.shaderIO(p, "vertexPosition");

      colorShader.mvMatrix = engine.shaderIO(p, "mvMatrix");
      colorShader.projMatrix = engine.shaderIO(p, "projMatrix");
      colorShader.color = engine.shaderIO(p, "color");
      
      // function to set the attributes for the color shader
      colorShader.setAttributes = function(verticesBuffer) {
        engine.bindVertexBuffer(colorShader.vertexPosition, verticesBuffer);
      };
      
      // function to set the uniforms for the color shader
      colorShader.setUniforms = function(mvMatrix, projMatrix, color) {
        engine.bindUniformMatrix(colorShader.mvMatrix, mvMatrix);
        engine.bindUniformMatrix(colorShader.projMatrix, projMatrix);
        engine.bindUniformVec4(colorShader.color, color);
      };

      // helper function to use the color shader with the required params   
      colorShader.use = function(verticesBuffer,
                                 mvMatrix, projMatrix, color) {
        
        // use this program
        engine.useProgram(colorShader, 
          [colorShader.vertexPosition]);
        
        colorShader.setAttributes(verticesBuffer);
        colorShader.setUniforms(mvMatrix, projMatrix, color);
      };
    });
    
    // initializing a texture shader
    engine.initProgram(Tilt.Shaders.Texture.vs,
                       Tilt.Shaders.Texture.fs, function(p) {
      textureShader = p;
      textureShader.vertexPosition = engine.shaderIO(p, "vertexPosition");
      textureShader.vertexTexCoord = engine.shaderIO(p, "vertexTexCoord");

      textureShader.mvMatrix = engine.shaderIO(p, "mvMatrix");
      textureShader.projMatrix = engine.shaderIO(p, "projMatrix");
      textureShader.color = engine.shaderIO(p, "color");
      textureShader.sampler = engine.shaderIO(p, "sampler");
            
      // function to set the attributes for the texture shader
      textureShader.setAttributes = function(verticesBuffer, texCoordBuffer) {
        engine.bindVertexBuffer(textureShader.vertexPosition, verticesBuffer);
        engine.bindVertexBuffer(textureShader.vertexTexCoord, texCoordBuffer);
      };
      
      // function to set the uniforms for the texture shader
      textureShader.setUniforms = function(mvMatrix, projMatrix, col, tex) {
        engine.bindUniformMatrix(textureShader.mvMatrix, mvMatrix);
        engine.bindUniformMatrix(textureShader.projMatrix, projMatrix);
        engine.bindUniformVec4(textureShader.color, col);
        engine.bindTexture(textureShader.sampler, tex);
      };

      // helper function to use the texture shader with the required params   
      textureShader.use = function(verticesBuffer, texCoordBuffer,
                                   mvMatrix, projMatrix, color, texture) {

        // use this program
        engine.useProgram(textureShader, 
          [textureShader.vertexPosition, textureShader.vertexTexCoord]);
        
        textureShader.setAttributes(verticesBuffer, texCoordBuffer);
        textureShader.setUniforms(mvMatrix, projMatrix, color, texture);
      };
    });

    // set the default rendering properties
    engine.blendMode("alpha");
    engine.depthTest(true);

    // model view and projection matrices used for transformations
    mat4.identity(mvMatrix);
    mat4.identity(projMatrix);
    
    // set the default model view and projection matrices
    that.origin();
    that.perspective();
        
    // set the default tint, fill, stroke and stroke weight
    that.tint("#fff");
    that.fill("#fff");
    that.stroke("#000");
    that.strokeWeight(1);
    
    // buffer of 2-component vertices (x, y) as the corners of a rectangle
    rectangle.vertices = engine.initBuffer([
      0, 0, 1, 0, 0, 1, 1, 1], 2);

    // buffer of 2-component vertices (x, y) as the outline of a rectangle
    rectangle.wireframe = engine.initBuffer([
      0, 0, 1, 0, 1, 1, 0, 1, 0, 0], 2);
      
    // buffer of 2-component texture coordinates (u, v) for the rectangle
    rectangle.texCoord = engine.initBuffer([
      0, 0, 1, 0, 0, 1, 1, 1], 2);
    
    // buffer of 3-component vertices (x, y, z) as the corners of a cube
    cube.vertices = engine.initBuffer([
      -0.5, -0.5,  0.5, /* front */
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5, /* bottom */
       0.5,  0.5,  0.5,
       0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5, -0.5, -0.5, /* back */
      -0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5,  0.5, -0.5,
      -0.5, -0.5, -0.5, /* top */
       0.5, -0.5, -0.5,
       0.5, -0.5,  0.5,
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5, /* right */
       0.5, -0.5, -0.5,
       0.5,  0.5, -0.5,
       0.5,  0.5,  0.5,
      -0.5, -0.5, -0.5, /* left */
      -0.5, -0.5,  0.5,
      -0.5,  0.5,  0.5,
      -0.5,  0.5, -0.5], 3);
    
    // buffer of 3-component vertices (x, y, z) as the outline of a cube
    cube.wireframe = engine.initBuffer([
      -0.5, -0.5,  0.5, /* front */
		   0.5, -0.5,  0.5, 
		   0.5,  0.5,  0.5, 
		  -0.5,  0.5,  0.5,
       0.5, -0.5, -0.5, /* back */
      -0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5,  0.5, -0.5], 3);
    
    // buffer of 2-component texture coordinates (u, v) for the cube
    cube.texCoord = engine.initBuffer([
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0,	1, 1, 0, 1,
      0, 0, 1, 0,	1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0,	1, 1, 0, 1,
      0, 0, 1, 0,	1, 1, 0, 1], 2);
      
    // vertex indices for the cube vertices, defining the order for which
    // these points can create a cube from triangles
    cube.indices = engine.initIndexBuffer([
      0, 1, 2, 0, 2, 3,
      4, 5, 6, 4, 6, 7,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23]);
      
    // vertex indices for the cube vertices, defining the order for which
    // these points can create a wireframe cube from lines
    cube.wireframeIndices = engine.initIndexBuffer([
      0, 1, 1, 2, 2, 3, 3, 0, /* front */
		  4, 5, 5, 6, 6, 7, 7, 4, /* back */
		  0, 5, 1, 4,
		  2, 7, 3, 6]);
    
    // override these functions in a Tilt environment
    that.resize = function(width, height) { };
    that.mousePressed = function(mouseX, mouseY) { };
    that.mouseReleased = function(mouseX, mouseY) { };
    that.mouseClicked = function(mouseX, mouseY) { };
    that.mouseMoved = function(mouseX, mouseY) { };
    that.mouseOver = function(mouseX, mouseY) { };
    that.mouseOut = function(mouseX, mouseY) { };
    that.mouseScroll = function(scroll) { };
    
    // handle the resize event
    document.onresize = function(e) {
      that.width = this.width;
      that.height = this.height;
      that.resize(that.width, that.height);
    }
    
    // handles the onmousedown event
    canvas.onmousedown = function(e) {
      that.mousePressed(that.mouseX, that.mouseY);
    }
    
    // handles the onmouseup event
    canvas.onmouseup = function(e) {      
      that.mouseReleased(that.mouseX, that.mouseY);
    }
    
    // handle the onclick event
    canvas.onclick = function(e) {
      that.mouseClicked(that.mouseX, that.mouseY);
    }
    
    // handle the onmousemove event
    canvas.onmousemove = function(e) {
      that.mouseX = e.pageX - canvas.offsetLeft;
      that.mouseY = e.pageY - canvas.offsetTop;
      
      that.mouseMoved(that.mouseX, that.mouseY);
    }
    
    // handle the onmouseover event
    canvas.onmouseover = function(e) {
      that.mouseOver(that.mouseX, that.mouseY);
    }
    
    // handle the onmouseout event
    canvas.onmouseout = function(e) {
      that.mouseOut(that.mouseX, that.mouseY);
    }
    
    // handle the onmousescroll event
    canvas.addEventListener('DOMMouseScroll', function(e) {
      that.mouseScroll(e.detail);
    }, false);
    
    // call the ready callback function if it was passed as a valid parameter
    if ("function" === typeof(readyCallback)) {
      readyCallback();
    }
    
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

  // Helpers for managing variables like frameCount, frameRate, frameDelta
  // Used internally, in the requestAnimFrame function
  var lastTime = 0;
  var currentTime = 0;

  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally.
   * Use this at the beginning of your loop function, like this:
   *
   *      tilt.draw = function() {
   *        tilt.requestAnimFrame(tilt.draw);
   *
   *        // do rendering
   *        ...
   *      };
   *
   * @param {function} loop: the function to be called each frame
   */
  this.requestAnimFrame = function(draw) {
    window.requestAnimFrame(draw, canvas);
    
    // do other work only after this object was completely initialized
    if (that.isInitialized()) {
      // reset the model view and projection matrices
      that.origin();
      that.perspective();
      
      // calculate the frame delta and frame rate using the current time
      currentTime = new Date().getTime();
      
      if (lastTime !== 0) {
        that.frameDelta = currentTime - lastTime;
        that.frameRate = 1000 / that.frameDelta;
      }
      lastTime = currentTime;
      
      // increment the elapsed time and total frame count
      that.elapsedTime += that.frameDelta;
      that.frameCount++;
    }
  };
  
  /**
   * Binds an offscreen rendering context. 
   * Therefore, anything will be drawn offscreen using a specific buffer.
   * To create an offscreen rendering context, use initOffscreenBuffer().
   * Pass null to revert to on-screen rendering.
   *
   * @param {object} offscreen: the offscreen buffer to render to
   */
  this.renderTo = function(offscreen) {
    if (offscreen !== null) {
      engine.bindFramebuffer(offscreen.framebuffer);
      that.width = offscreen.framebuffer.width;
      that.height = offscreen.framebuffer.height;
    }
    else {
      engine.bindFramebuffer(null);
      that.width = canvas.clientWidth;
      that.height = canvas.clientHeight;
    }

    // reset the model view and projection matrices
    that.origin();
    that.perspective();
  };
  
  /**
   * Sets a default perspective projection, with the near frustum rectangle
   * mapped to the canvas width and height bounds.
   */
  this.perspective = function() {
    var fov = 45;
    var w = that.width;
    var h = that.height;
    var x = w / 2;
    var y = h / 2;
    
    var z = y / Math.tan(Tilt.Math.radians(45) / 2);
    var znear = z / 10;
    var zfar = z * 10;
    var aspect = w / h;
    
    engine.viewport(canvas.width, canvas.height);
    mat4.perspective(fov, aspect, znear, zfar, projMatrix, true);
    mat4.translate(projMatrix, [-x, -y, -z]);
  };
  
  /**
   * Sets a default orthographic projection (recommended for 2d rendering).
   */
  this.ortho = function() {
    var w = that.width;
    var h = that.height;

    engine.viewport(canvas.width, canvas.height);
    mat4.ortho(0, w, h, 0, -100, 100, projMatrix);
  };
  
  /**
   * Sets a custom projection matrix.
   *
   * @param {object} matrix: the custom projection matrix to be used
   */
  this.projection = function(matrix) {
    engine.viewport(canvas.width, canvas.height);
    mat4.set(matrix, projMatrix);
  };

  /**
   * Pushes the current model view matrix on a stack, to be popped out later.
   * This can be used, for example, to create complex animations and be able 
   * to revert back to the current model view.
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
   * Resets the model view matrix to identity.
   * This is a default matrix with no rotation, no scaling, at (0, 0, 0);
   */
  this.origin = function() {
    mat4.identity(mvMatrix);
  };
  
  /**
   * Transforms the model view matrix with a new matrix.
   * Useful for creating custom transformations.
   * 
   * @param {object} matrix: the matrix to be multiply the model view with
   */
  this.transform = function(matrix) {
    mat4.multiply(mvMatrix, matrix);
  };

  /**
   * Translates the model view by the x, y and z coordinates.
   *
   * @param {number} x: the x amount of translation
   * @param {number} y: the y amount of translation
   * @param {number} z: the z amount of translation
   */
  this.translate = function(x, y, z) {
    mat4.translate(mvMatrix, [x, y, z]);
  };

  /**
   * Rotates the model view by a specified angle on the x, y and z axis.
   *
   * @param {number} angle: the angle expressed in radians
   * @param {number} x: the x axis of the rotation
   * @param {number} y: the y axis of the rotation
   * @param {number} z: the z axis of the rotation
   */
  this.rotate = function(angle, x, y, z) {
    mat4.rotate(mvMatrix, angle, [x, y, z]);
  };

  /**
   * Rotates the model view by a specified angle on the x axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  this.rotateX = function(angle) {
    mat4.rotateX(mvMatrix, angle);
  };
  
  /**
   * Rotates the model view by a specified angle on the y axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  this.rotateY = function(angle) {
    mat4.rotateY(mvMatrix, angle);
  };

  /**
   * Rotates the model view by a specified angle on the z axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  this.rotateZ = function(angle) {
    mat4.rotateZ(mvMatrix, angle);
  };

  /**
   * Scales the model view by the x, y and z coordinates.
   *
   * @param {number} x: the x amount of scaling
   * @param {number} y: the y amount of scaling
   * @param {number} z: the z amount of scaling
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
    tint = Tilt.Math.hex2rgba(color);
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
    fill = Tilt.Math.hex2rgba(color);
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
    stroke = Tilt.Math.hex2rgba(color);
  };

  /**
   * Disables the current stroke color value.
   */
  this.noStroke = function() {
    stroke = [0, 0, 0, 0];
  };
  
  /**
   * Sets the current stroke weight (line width).
   *
   * @param {number} weight: the stroke weight
   */
  this.strokeWeight = function(weight) {
    gl.lineWidth(weight);
  };
  
  /**
   * Clears the canvas context (usually at the beginning of each frame).
   * If the color is undefined, it will default to opaque light gray.
   * It is not recommended but possible to pass a number as a parameter,
   * in which case the color will be [n, n, n, 255], or directly an array of
   * [r, g, b, a] values, all in the 0..255 interval.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  this.background = function(color) {
    var rgba;
    
    if ("undefined" === typeof(color)) {
      rgba = Tilt.Math.hex2rgba("#d6d6d6ff");
    }
    else if ("string" === typeof(color)) {
      rgba = Tilt.Math.hex2rgba(color);
    }
    else if ("number" === typeof(color)) {
      rgba = [color / 255, color / 255, color / 255, 1];
    }
    else {
      rgba = [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
    }

    // clear the color and depth buffers
    engine.clear(rgba[0], rgba[1], rgba[2], rgba[3]);
  };
  
  /**
   * Draws a rectangle using the specified parameters.
   *
   * @param {number} x: the x position of the object
   * @param {number} y: the y position of the object
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   */
  this.rect = function(x, y, width, height) {
    // if rectMode is set to "center", we need to offset the origin
    if ("center" === rectangle.rectMode) {
      x -= width / 2;
      y -= height / 2;
    }

    // in memory, the rectangle is represented as a perfect 1x1 square, so
    // some transformations are applied to achieve the desired shape
    that.pushMatrix();
    that.translate(x, y, 0);
    that.scale(width, height, 1);
    
    // draw the rectangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      colorShader.use(rectangle.vertices, mvMatrix, projMatrix, fill);
      engine.drawVertices(gl.TRIANGLE_STRIP, 0, rectangle.vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      colorShader.use(rectangle.wireframe, mvMatrix, projMatrix, stroke);
      engine.drawVertices(gl.LINE_STRIP, 0, rectangle.wireframe.numItems);
    }
    that.popMatrix();
  };
  
  /**
   * Modifies the location from which rectangles draw. The default mode is 
   * rectMode("corner"), which specifies the location to be the upper left 
   * corner of the shape and uses the third and fourth parameters of rect() to 
   * specify the width and height. Use rectMode("center") to draw centered 
   * at the given x and y position.
   *
   * @param {string} mode: either "corner" or "center"
   */
  this.rectMode = function(mode) {
    rectangle.rectMode = mode;
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
  this.image = function(texture, x, y, width, height) {
    // if the width and height are not specified, we use the embedded
    // texture dimensions, from the source image or framebuffer
    if (!width || !height) {
      if (!texture.framebuffer) {
        width = texture.image.width;
        height = texture.image.height;
      }
      else {
        width = texture.framebuffer.width;
        height = texture.framebuffer.height;
      }
    }
    
    // if imageMode is set to "center", we need to offset the origin
    if ("center" === rectangle.imageMode) {
      x -= width / 2;
      y -= height / 2;
    }

    // draw the image only if the tint alpha channel is not transparent
    if (tint[3]) {      
      // in memory, the rectangle is represented as a perfect 1x1 square, so
      // some transformations are applied to achieve the desired shape
      that.pushMatrix();
      that.translate(x, y, 0);
      that.scale(width, height, 1);
    
      // use the necessary shader and draw the vertices
      textureShader.use(rectangle.vertices, 
                        rectangle.texCoord,
                        mvMatrix, projMatrix, tint, texture);
    
      engine.drawVertices(gl.TRIANGLE_STRIP, 0, rectangle.vertices.numItems);
      that.popMatrix();
    }
  };
  
  /**
   * Modifies the location from which images draw. The default mode is 
   * imageMode("corner"), which specifies the location to be the upper left 
   * corner and uses the fourth and fifth parameters of image() to set the 
   * image"s width and height. Use imageMode("center") to draw images centered 
   * at the given x and y position.
   *
   * @param {string} mode: either "corner" or "center"
   */
  this.imageMode = function(mode) {
    rectangle.imageMode = mode;
  };
  
  /**
   * Draws a box using the specified parameters.
   *
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   * @param {number} depth: the depth of the object
   * @param {object} texture: the texture to be used
   */
  this.box = function(width, height, depth, texture) {      
    // in memory, the box is represented as a simple perfect 1x1 cube, so
    // some transformations are applied to achieve the desired shape
    that.pushMatrix();
    that.scale(width, height, depth);

    if (texture) {
      // draw the box only if the tint alpha channel is not transparent
      if (tint[3]) {
        // use the necessary shader and draw the vertices
        textureShader.use(cube.vertices,
                          cube.texCoord,
                          mvMatrix, projMatrix, tint, texture);

        engine.drawIndexedVertices(gl.TRIANGLES, cube.indices);
      }
    }
    else {
      // draw the box only if the fill alpha channel is not transparent
      if (fill[3]) {
        // use the necessary shader and draw the vertices
        colorShader.use(cube.vertices,
                        mvMatrix, projMatrix, fill);

        engine.drawIndexedVertices(gl.TRIANGLES, cube.indices);    
      }
    }    
    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
        // use the necessary shader and draw the vertices
        colorShader.use(cube.wireframe,
                        mvMatrix, projMatrix, stroke);
                        
        engine.drawIndexedVertices(gl.LINES, cube.wireframeIndices);    
    }
    that.popMatrix();
  };
  
  /**
   * Draws a custom mesh, using only the built-in shaders.
   * For more complex techniques, create your own shaders and drawing logic. 
   *
   * @param {object} verticesBuffer: the vertices buffer (x, y and z)
   * @param {object} texCoordBuffer: the texture coordinates buffer (u, v)
   * @param {object} normalsBuffer: the normals buffer (m, n, p)
   * @param {number} or {string} drawMode: WebGL enum, like gl.TRIANGLES, or
   * "triangles", "triangle-strip, "triangle-fan, "points", "lines" etc.
   * @param {string} color: the color to be used by the shader if required
   * @param {object} texture: the texture to be used by the shader if required
   * @param {object} indicesBuffer: indices for the passed vertices buffer
   */
  this.mesh = function(verticesBuffer, texCoordBuffer, normalsBuffer,
                       drawMode, color, texture, indicesBuffer) {
    
    // use the necessary shader
    if (texture) {
      textureShader.use(verticesBuffer, texCoordBuffer,
                        mvMatrix, projMatrix, "string" === typeof color ? 
                        Tilt.Math.hex2rgba(color) : color, texture);
    }
    else {
      colorShader.use(verticesBuffer,
                      mvMatrix, projMatrix, "string" === typeof color ? 
                      Tilt.Math.hex2rgba(color) : color);
    }
    
    // draw the vertices as indexed elements or simple arrays
    if (indicesBuffer) {
      engine.drawIndexedVertices(drawMode, indicesBuffer);          
    }
    else {
      engine.drawVertices(drawMode, 0, verticesBuffer.numItems);    
    }
    
    // TODO: use the normals buffer, add some lighting
  };

  /**
   * Sets the dimensions of the canvas object.
   * This function also resets the model view and projection matrices.
   *
   * @param {number} width: the width of the canvas
   * @param {number} height: the height of the canvas
   */
  this.size = function(width, height) {
    canvas.width = width;
    canvas.height = height;

    that.origin();
    that.perspective();
  };
  
  /**
   * Destroys this object and sets all members to null.
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
    
    rectangle = null;
    cube = null;
    tint = null;
    fill = null;
    stroke = null;
    
    that = null;
  };
};