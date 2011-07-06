/*
 * jTiltRenderer.js - Helper drawing functions for WebGL
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
var EXPORTED_SYMBOLS = ["Tilt.Renderer"];

/**
 * Tilt.Renderer constructor.
 *
 * @param {object} canvas: the canvas element used for rendering
 * @param {function} successCallback: to be called if gl initialization worked
 * @param {function} failCallback: to be called if gl initialization failed
 * @return {object} the created object
 */
Tilt.Renderer = function(canvas, failCallback, successCallback) {
  
  /**
   * WebGL context to be used, not exposed outside this object.
   */
  this.gl = null;
  
  /**
   * The current shader used by the WebGL context. Used for caching.
   */
  this.program = null;
  
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
  this.clearColor = [0, 0, 0, 0];
  
  /**
   * The current tint color applied to any objects which can be tinted.
   * These mostly represent images or primitives which are textured.
   */
  this.tintColor = [0, 0, 0, 0];
  
  /**
   * The current fill color applied to any objects which can be filled.
   * These are rectangles, circles, boxes, 2d or 3d primitives in general.
   */
  this.fillColor = [0, 0, 0, 0];
  
  /**
   * The current stroke color applied to any objects which can be stroked.
   * This property mostly refers to lines.
   */
  this.strokeColor = [0, 0, 0, 0];
  
  /**
   * A shader useful for drawing vertices with only a color component.
   */
  this.colorShader = {};
  
  /**
   * A shader useful for drawing vertices with both a color component and
   * texture coordinates.
   */
  this.textureShader = {};
  
  /**
   * Vertices buffer representing the corners of a rectangle.
   */
  this.rectangle = {};
  
  /**
   * Vertices buffer representing the corners of a cube.
   */
  this.cube = {};
  
  /** 
   * Helpers for managing variables like frameCount, frameRate, frameDelta,
   * used internally, in the requestAnimFrame function.
   */
  this.lastTime = 0;
  this.currentTime = null;
  
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
   * For example, these will be updated or changed when rendering offscreen.
   */
  this.width = canvas.width;
  this.height = canvas.height;
  
  /**
   * The WebGL context obtained from the canvas element, used for drawing.
   */
  this.gl = this.create3DContext(canvas);
  
  // check if the context was created successfully
  if ("undefined" !== typeof this.gl && null !== this.gl) {
    // set up some global enums
    this.TRIANGLES = this.gl.TRIANGLES;
    this.TRIANGLE_STRIP = this.gl.TRIANGLE_STRIP;
    this.TRIANGLE_FAN = this.gl.TRIANGLE_FAN;
    this.LINES = this.gl.LINES;
    this.LINE_STRIP = this.gl.LINE_STRIP;
    this.LINE_LOOP = this.gl.LINE_LOOP;
    this.POINTS = this.gl.POINTS;
    this.MAX_TEXTURE_SIZE = this.gl.MAX_TEXTURE_SIZE;
    this.MAX_VERTEX_ATTRIBS = this.gl.MAX_VERTEX_ATTRIBS;
    this.MAX_TEXTURE_IMAGE_UNITS = this.gl.MAX_TEXTURE_IMAGE_UNITS;
    this.MAX_VERTEX_UNIFORM_VECTORS = this.gl.MAX_VERTEX_UNIFORM_VECTORS;
    this.MAX_FRAGMENT_UNIFORM_VECTORS = this.gl.MAX_FRAGMENT_UNIFORM_VECTORS;
    
    // if successful, run a success callback function if available
    if ("function" === typeof successCallback) {
      successCallback();
      successCallback = null;
    }
  }
  else {
    // if unsuccessful, log the error and run a fail callback if available
    Tilt.Console.log(Tilt.StringBundle.get("initWebGL.error"));
    if ("function" === typeof failCallback) {
      failCallback();
      failCallback = null;
    }
  }
  
  // perform mandatory initialization of shaders and other objects required
  // for drawing, like vertex buffers and primitives.
  
  // initializing a color shader
  this.colorShader = this.initProgram(Tilt.Shaders.Color.vs,
                                      Tilt.Shaders.Color.fs);
                                      
  // initializing a texture shader
  this.textureShader = this.initProgram(Tilt.Shaders.Texture.vs,
                                        Tilt.Shaders.Texture.fs);
                                        
  // set the default rendering properties
  this.blendMode("alpha");
  this.depthTest(true);
  
  // set the default model view and projection matrices
  this.origin();
  this.perspective();
  
  // set the default tint, fill, stroke and stroke weight
  this.tint("#fff");
  this.fill("#fff");
  this.stroke("#000");
  this.strokeWeight(1);
  
  // buffer of 2-component vertices (x, y) as the corners of a rectangle
  this.rectangle.vertices = this.initBuffer([
    0, 0, 1, 0, 0, 1, 1, 1], 2);
    
  // buffer of 2-component vertices (x, y) as the outline of a rectangle
  this.rectangle.wireframe = this.initBuffer([
    0, 0, 1, 0, 1, 1, 0, 1, 0, 0], 2);
    
  // buffer of 2-component texture coordinates (u, v) for the rectangle
  this.rectangle.texCoord = this.initBuffer([
    0, 0, 1, 0, 0, 1, 1, 1], 2);
    
  // buffer of 3-component vertices (x, y, z) as the corners of a cube
  this.cube.vertices = this.initBuffer([
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
  this.cube.wireframe = this.initBuffer([
    -0.5, -0.5,  0.5, /* front */
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
     0.5, -0.5, -0.5, /* back */
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5], 3);
     
  // buffer of 2-component texture coordinates (u, v) for the cube
  this.cube.texCoord = this.initBuffer([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1], 2);
    
  // vertex indices for the cube vertices, defining the order for which
  // these points can create a cube from triangles
  this.cube.indices = this.initIndexBuffer([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23]);
    
  // vertex indices for the cube vertices, defining the order for which
  // these points can create a wireframe cube from lines
  this.cube.wireframeIndices = this.initIndexBuffer([
    0, 1, 1, 2, 2, 3, 3, 0, /* front */
    4, 5, 5, 6, 6, 7, 7, 4, /* back */
    0, 5, 1, 4,
    2, 7, 3, 6]);
};

Tilt.Renderer.prototype = {
  
  /**
   * Initializes a shader program, using specified source code as strings.
   * returning the newly created shader program, by compiling and linking the 
   * vertex and fragment shader.
   *
   * @param {string} vertShaderSrc: the vertex shader source code
   * @param {string} fragShaderSrc: the fragment shader source code
   */
  initProgram: function(vertShaderSrc, fragShaderSrc) {
    var vertShader, fragShader;
    
    // compile the two shaders
    vertShader = this.compileShader(vertShaderSrc, "x-shader/x-vertex");
    fragShader = this.compileShader(fragShaderSrc, "x-shader/x-fragment");
    
    // also remember their sources (useful for debugging)
    vertShader.src = vertShaderSrc;
    fragShader.src = fragShaderSrc;
    
    return this.linkProgram(vertShader, fragShader);
  },
  
  /**
   * Initializes a shader program, using sources located at a specific url.
   * If only two params are specified (the shader name and the readyCallback
   * function), then ".fs" and ".vs" extensions will be automatically used).
   * The ready callback function will have as a parameter the newly created
   * shader program, by compiling and linking the vertex and fragment shader.
   *
   * @param {string} vertShaderURL: the vertex shader resource
   * @param {string} fragShaderURL: the fragment shader resource
   * @param {function} readyCallback: the function called when loading is done
   */
   initProgramAt: function(vertShaderURL, fragShaderURL, readyCallback) {
    // if only two parameters are passed we assume that the first is a general
    // path to the shader name, adding the default .fs and .vs extensions
    // thus, the second parameter becomes the ready callback function
    if (arguments.length === 2) {
      readyCallback = fragShaderURL;
      fragShaderURL = vertShaderURL + ".fs";
      vertShaderURL = vertShaderURL + ".vs";
    }
    
    // request the shader sources asynchronously
    this.requests([vertShaderURL, fragShaderURL], function(xhr) {
      var vertShader, fragShader;
      
      // compile the two shaders
      vertShader = this.compileShader(xhr[0].responseText, 
                                      "x-shader/x-vertex");
                                      
      fragShader = this.compileShader(xhr[1].responseText, 
                                      "x-shader/x-fragment");
                                      
      // also remember their sources (useful for debugging)
      vertShader.src = xhr[0].responseText;
      fragShader.src = xhr[1].responseText;
      
      if ("function" === typeof readyCallback) {
        readyCallback(this.linkProgram(vertShader, fragShader));
        readyCallback = null;
      }
    });
  },
  
  /**
   * Compiles a shader source of a specific type, either vertex or fragment.
   *
   * @param {string} shaderSource: the source code for the shader
   * @param {string} shaderType: the shader type ("x-vertex" or "x-fragment")
   * @return {object} the compiled shader
   */
  compileShader: function(shaderSource, shaderType) {
    var shader, status;
    
    // make sure the shader source is valid
    if ("string" !== typeof shaderSource || shaderSource.length < 1) {
      Tilt.Console.error(Tilt.StringBundle.get(
        "compileShader.source.error"));
        
      return null;
    }
    
    // also make sure (and use) the necessary shader mime type
    if ("x-shader/x-vertex" === shaderType) {
      shader = this.gl.createShader(this.gl.VERTEX_SHADER);
    }
    else if ("x-shader/x-fragment" === shaderType) {
      shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    }
    else {
      Tilt.Console.error(Tilt.StringBundle.format(
        "compileShader.type.error"), [shaderSource]);
        
      return null;
    }
    
    // set the shader source and compile it
    this.gl.shaderSource(shader, shaderSource);
    this.gl.compileShader(shader);
    
    // verify the compile status; if something went wrong, log the error
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      status = this.gl.getShaderInfoLog(shader);
      
      Tilt.Console.error(Tilt.StringBundle.format(
        "compileShader.compile.error"), [status]);
        
      return null;
    }
    
    return shader;
  },
  
  /**
   * Links two compiled vertex or fragment shaders together to form a program.
   *
   * @param {object} vertShader: the compiled vertex shader
   * @param {object} fragShader: the compiled fragment shader
   * @return {object} the newly created and linked shader program
   */
  linkProgram: function(vertShader, fragShader) {
    var program, status, data;
    
    // create a program and attach the compiled vertex and fragment shaders
    program = this.gl.createProgram();
              this.gl.attachShader(program, vertShader);
              this.gl.attachShader(program, fragShader);
              this.gl.linkProgram(program);
    
    // verify the link status; if something went wrong, log the error
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      status = this.gl.getProgramInfoLog(program);
      
      Tilt.Console.error(Tilt.StringBundle.format(
        "linkProgram.error", [status, vertShader.src, fragShader.src]));
        
      return null;
    }
    
    // create an array of all the attributes, uniforms & words from the shader
    // which will be searched for to automatically cache the shader variables
    data = [vertShader.src, fragShader.src].join(" ")
                                           .replace(/#.*|[(){};]/g, " ")
                                           .split(" ");
                                           
    return this.shaderIOCache(program, data);
  },
  
  /**
   * Gets a shader attribute location from a program.
   *
   * @param {object} program: the shader program to obtain the attribute from
   * @param {string} attribute: the attribute name
   * @return {number} the attribute location from the program
   */
  shaderAttribute: function(program, attribute) {
    return this.gl.getAttribLocation(program, attribute);
  },
  
  /**
   * Gets a shader uniform location from a program.
   *
   * @param {object} program: the shader program to obtain the uniform from
   * @param {string} uniform: the uniform name
   * @return {object} the uniform object from the program
   */
  shaderUniform: function(program, uniform) {
    return this.gl.getUniformLocation(program, uniform);
  },
  
  /**
   * Gets a generic shader variable (attribute or uniform) from a program.
   * If an attribute is found, the attribute location will be returned.
   * Otherwise, the uniform will be searched and returned if found.
   *
   * @param {object} program: the shader program to obtain the uniform from
   * @param {string} variable: the attribute or uniform name
   * @return {number} | {object} the attribute or uniform from the program
   */
  shaderIO: function(program, variable) {
    // try to get a shader attribute
    var io = this.shaderAttribute(program, variable);
    if (io >= 0) {
      return io;
    }
    // if unavailable, search for a shader uniform
    else {
      return this.shaderUniform(program, variable);
    }
  },
  
  /**
   * Caches shader attributes and uniforms as properties for a program object.
   *
   * @param {object} program: the shader program used to cache the variables
   * @param {array} variables: string array with shader attributes & uniforms
   * @return {object} the same program
   */
  shaderIOCache: function(program, variables) {
    var i, length, param, io;
    
    // pass through each element in the variables array
    for (i = 0, length = variables.length; i < length; i++) {
      // try to get a shader variable from the program
      param = variables[i];
      io = this.shaderIO(program, param);
      
      // if we get a number or a WebGL uniform location object, continue
      if (("object" === typeof io && io instanceof WebGLUniformLocation) ||
          ("number" === typeof io)) {
            
        // bind the new parameter only if it was not already defined
        if ("undefined" === typeof program[param]) {            
          program[param] = io;
        }
      }
    }
    
    return program;
  },
  
  /**
   * Uses the shader program as current one for the WebGL context; also, pass
   * the vertex attributes necessary to enable when using this program.
   * This method also does some useful caching, as the function useProgram()
   * could take quite a lot of time.
   *
   * @param {object} program: the shader program to be used by the engine
   * @param {number} count: the total number of attributes to be enabled
   */
  useProgram: function(program, count) {
    // use the the program if it wasn't already set
    if (this.program !== program) {
      this.program = program;
      this.gl.useProgram(program);
      
      // enable any necessary vertex attributes
      while (count) {
        count--;
        this.gl.enableVertexAttribArray(count);
      }
    }
  },
  
  /**
   * Binds a vertex buffer as an array buffer for a specific shader attribute
   *
   * @param {number} attribute: the attribute obtained from the shader
   * @param {object} buffer: the buffer to be bound
   */
  bindVertexBuffer: function(attribute, buffer) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.vertexAttribPointer(attribute, buffer.itemSize,
      this.gl.FLOAT, false, 0, 0);
  },
  
  /**
   * Binds a uniform matrix to the current shader.
   *
   * @param {object} uniform: the uniform to bind the variable to
   * @param {array} variable: the matrix to be bound
   */
  bindUniformMatrix: function(uniform, variable) {
    this.gl.uniformMatrix4fv(uniform, false, variable);
  },
  
  /**
   * Binds a uniform vector of 4 elements to the current shader.
   *
   * @param {object} uniform: the uniform to bind the variable to
   * @param {array} variable: the vector to be bound
   */
  bindUniformVec4: function(uniform, variable) {
    this.gl.uniform4fv(uniform, variable);
  },
  
  /**
   * Binds a simple float element to the current shader.
   *
   * @param {number} uniform: the uniform to bind the variable to
   * @param {number} variable: the variable to be bound
   */
  bindUniformFloat: function(uniform, variable) {
    this.gl.uniform1f(uniform, variable);
  },
  
  /**
   * Binds a uniform texture for a sampler to the current shader.
   *
   * @param {object} sampler: the sampler to bind the texture to
   * @param {object} texture: the texture to be bound
   */
  bindTexture: function(sampler, texture) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.uniform1i(sampler, 0);
  },
  
  /**
   * Binds a framebuffer to the current WebGL context.
   * This is very useful when, for example, rendering offscreen.
   *
   * @param {object} framebuffer: the framebuffer to be bound
   */
  bindFramebuffer: function(framebuffer) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
  },
  
  /**
   * Initializes buffer data to be used for drawing, using an array of floats.
   * The "numItems" param can be specified to use only a portion of the array.
   *
   * @param {array} elementsArray: an array of floats
   * @param {number} itemSize: how many items create a block
   * @param {number} numItems: optional, how many items to use from the array
   * @return {object} the initialized buffer
   */
  initBuffer: function(elementsArray, itemSize, numItems) {
    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length / itemSize;
    }
    
    // create an array buffer and bind the elements as a Float32Array
    var buffer = this.gl.createBuffer(),
        el = new Float32Array(elementsArray);
        
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, el, this.gl.STATIC_DRAW);
    
    // remember some properties, useful when binding the buffer to a shader
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    
    return buffer;
  },
  
  /**
   * Initializes a buffer of vertex indices, using an array of unsigned ints.
   * The item size will automatically default to 1, and the "numItems" will be
   * equal to the number of items in the array if not specified.
   *
   * @param {array} elementsArray: an array of unsigned integers
   * @param {number} numItems: how many items to use from the array
   * @return {object} the initialized index buffer
   */
  initIndexBuffer: function(elementsArray, numItems) {
    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length;
    }
    
    // create an array buffer and bind the elements as a Uint16Array
    var buffer = this.gl.createBuffer(),
        el = new Uint16Array(elementsArray);
        
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, el, this.gl.STATIC_DRAW);
    
    // remember some properties, useful when binding the buffer to a shader
    buffer.itemSize = 1;
    buffer.numItems = numItems;
    
    return buffer;
  },
  
  /**
   * Initializes a framebuffer, with an attached texture and depth buffer.
   * The returned object contains the framebuffer, texture, depth and stencil
   * objects as properties.
   *
   * @param {number} width: the width of the buffer
   * @param {number} height: the height of the buffer
   */
  initOffscreenBuffer: function(width, height) {
    var framebuffer = this.gl.createFramebuffer(),
        texture = this.gl.createTexture(), 
        depth = this.gl.createRenderbuffer(),
        stencil = this.gl.createRenderbuffer(),
        status;
    
    // create the framebuffer and set the width and height as properties
    framebuffer.width = width;
    framebuffer.height = height;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    
    // TODO: add custom texture format
    // initialize the texture to be used as a color buffer to render to
    texture.width = width;
    texture.height = height;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0,
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                       
    this.setTextureParams("linear", "linear", false, "clamp", "clamp");
    
    // TODO: add custom depth format (16, 24, 32)
    // initialize a depth buffer, used by the WebGL context for z-sorting
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depth);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, 
                                this.gl.DEPTH_COMPONENT16, width, height);
                           
    // TODO: add support for stencil buffer
    // initialize a stencil buffer, used for various effects (if necessary)
    
    // attach the render buffers
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, 
                                 this.gl.COLOR_ATTACHMENT0,
                                 this.gl.TEXTURE_2D, texture, 0);
                                 
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, 
                                    this.gl.DEPTH_ATTACHMENT,
                                    this.gl.RENDERBUFFER, depth);
                                    
    // verify the buffer status; if something went wrong, log the error
    if (!this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER)) {
      status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
      
      Tilt.Console.error(Tilt.StringBundle.format(
        "initOffscreenBuffer.framebuffer.error"), [status]);
        
      return null;
    }
    
    // cleanup: unbind anything we set
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    
    return {
      framebuffer: framebuffer,
      texture: texture,
      depth: depth,
      stencil: stencil
    };
  },
  
  /**
   * Initializes a texture from a pre-existing image or canvas.
   *
   * @param {object} image: the texture source image or canvas
   * @param {object} parameters: an object containing the following properties
   *  @param {string} fill: optional, color to fill the transparent bits
   *  @param {string} stroke: optional, color to draw an outline
   *  @param {number} strokeWeight: optional, the width of the outline
   *  @param {string} minFilter: either "nearest" or "linear"
   *  @param {string} magFilter: either "nearest" or "linear"
   *  @param {boolean} mipmap: true if should generate mipmap
   *  @param {string} wrapS: either "repeat" or "clamp"
   *  @param {string} wrapT: either "repeat" or "clamp"
   * @return {object} the newly created texture
   */
  initTexture: function(image, parameters) {
    var texture, resized;
    
    // make sure the parameters is an object
    parameters = parameters || {};
    
    // first, create the texture to hold the image data
    texture = this.gl.createTexture();
    texture.width = image.width;
    texture.height = image.height;
    
    // make sure the image is power of two before binding to a texture
    resized = Tilt.Image.resizeToPowerOfTwo(image, parameters);
    
    // attach the image data to the newly create texture
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, 
                       this.gl.UNSIGNED_BYTE, resized);
                       
    // set the required texture params and do some cleanup
    this.setTextureParams(parameters);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    
    try {
      return texture;
    }
    finally {
      // cleanup the closure mess
      image = null;
      resized = null;
    }
  },
  
  /**
   * Initializes a texture from a source, runs a callback function when ready.
   * This function does not return the image, it passes it as a parameter to 
   * the ready callback.
   *
   * @param {string} imageSource: the texture source
   * @param {function} readyCallback: function called when loading is finished
   * @param {object} parameters: an object containing the following properties
   *  @param {string} fill: optional, color to fill the transparent bits
   *  @param {string} stroke: optional, color to draw an outline
   *  @param {number} strokeWeight: optional, the width of the outline
   *  @param {string} minFilter: either "nearest" or "linear"
   *  @param {string} magFilter: either "nearest" or "linear"
   *  @param {boolean} mipmap: true if should generate mipmap
   *  @param {string} wrapS: either "repeat" or "clamp"
   *  @param {string} wrapT: either "repeat" or "clamp"
   */
  initTextureAt: function(imageSource, readyCallback, parameters) {   
    if ("string" === typeof imageSource) {
      var self = this,          // remember who we are
          image = new Image();  // load the image from the source in an object
          
      image.src = imageSource;
      image.onload = function() {
        if ("function" === typeof readyCallback) {
          readyCallback(self.initTexture(image, parameters));
          readyCallback = null;
          
          // clean up the closure mess
          self = null;
          image = null;
        }
      };
    }
    else {
      Tilt.Console.error(Tilt.StringBundle.get(
        "initTexture.source.error"));
    }
  },
  
  /**
   * Sets texture parameters for the current texture binding.
   * Optionally, you can also (re)set the current texture binding manually.
   *
   * @param {string} minFilter: either "nearest" or "linear"
   * @param {string} magFilter: either "nearest" or "linear"
   * @param {boolean} mipmap: true if should generate mipmap
   * @param {string} wrapS: either "repeat" or "clamp"
   * @param {string} wrapT: either "repeat" or "clamp"
   * @param {object} texture: optional, texture to replace the current binding
   */
  setTextureParams: function(parameters) {
    // make sure the parameters is an object
    parameters = parameters || {};
    
    // bind a new texture if necessary
    if (parameters.texture) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, parameters.texture);
    }
    
    // set the minification filter
    if ("nearest" === parameters.minFilter) {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_MIN_FILTER,
                            this.gl.NEAREST);
    }
    else if ("linear" === parameters.minFilter && parameters.mipmap) {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_MIN_FILTER, 
                            this.gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_MIN_FILTER,
                            this.gl.LINEAR);
    }
    
    // set the magnification filter
    if ("nearest" === parameters.magFilter) {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_MAG_FILTER,
                            this.gl.NEAREST);
    }
    else if ("linear" === parameters.magFilter && parameters.mipmap) {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_MAG_FILTER, 
                            this.gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_MAG_FILTER,
                            this.gl.LINEAR);
    }
    
    // set the wrapping on the x-axis for the texture
    if ("repeat" === parameters.wrapS) {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_WRAP_S,
                            this.gl.REPEAT);
    }
    else {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_WRAP_S,
                            this.gl.CLAMP_TO_EDGE);
    }
    
    // set the wrapping on the y-axis for the texture
    if ("repeat" === parameters.wrapT) {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_WRAP_T,
                            this.gl.REPEAT);
    }
    else {
      this.gl.texParameteri(this.gl.TEXTURE_2D,
                            this.gl.TEXTURE_WRAP_T,
                            this.gl.CLAMP_TO_EDGE);
    }
    
    // generate mipmap if necessary
    if (parameters.mipmap) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }
  },
  
  /**
   * Set if the textures should be rotated around the X axis (this means they
   * will be used upside down).
   *
   * @param {boolean} flipY: true if the textures should be flipped
   */
  setTextureFlipY: function(flipY) {
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, flipY);
  },
  
  /**
   * Get a parameter from inside the WebGL context.
   * Doing this is highly not recommended due to performance reasons.
   *
   * @param {number} parameter: the parameter to get the value for
   * @return {number} the requested parameter value
   */
  getParameter: function(param) {
    return this.gl.getParameter(param);
  },
  
  /**
   * Draws bound vertex buffers using the specified parameters.
   *
   * @param {number} or {string} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {number} count: the number of indices to be rendered
   */
  drawVertices: function(drawMode, count) {
    this.gl.drawArrays(drawMode, 0, count);
  },
  
  /**
   * Draws bound vertex buffers using the specified parameters.
   * This function also makes use of an index buffer.
   *
   * @param {number} or {string} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {object} indicesBuffer: indices for the passed vertices buffer
   */
  drawIndexedVertices: function(drawMode, indicesBuffer) {
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    this.gl.drawElements(drawMode, indicesBuffer.numItems, 
      this.gl.UNSIGNED_SHORT, 0);
  },
  
  /**
   * Binds an offscreen rendering context.
   * Therefore, anything will be drawn offscreen using a specific buffer.
   * To create an offscreen rendering context, use initOffscreenBuffer().
   * Pass null to revert to on-screen rendering.
   *
   * @param {object} offscreen: the offscreen buffer to render to
   */
  renderTo: function(offscreen) {
    if (offscreen !== null) {
      this.bindFramebuffer(offscreen.framebuffer);
    }
    else {
      this.bindFramebuffer(null);
    }
    
    // reset the model view and projection matrices
    this.origin();
    this.perspective();
  },
  
  /**
   * Sets up the WebGL context viewport.
   * This defines the width and height of the WebGL drawing canvas context
   * (but not the size of the actual canvas element).
   *
   * @param {number} width: the width of the viewport area
   * @param {number} height: the height of the viewport area
   */
  viewport: function(width, height) {
    this.gl.viewport(0, 0, width, height);
  },
  
  /**
   * Clears the color and depth buffers to a specific color.
   * The color components are represented in the 0..1 range.
   *
   * @param {number} r: the red component of the clear color
   * @param {number} g: the green component of the clear color
   * @param {number} b: the blue component of the clear color
   * @param {number} a: the alpha component of the clear color
   */
   clear: function(r, g, b, a) {
     if (this.clearColor[0] !== r ||
         this.clearColor[1] !== g ||
         this.clearColor[2] !== b ||
         this.clearColor[3] !== a) {
      
      this.clearColor[0] = r;     
      this.clearColor[1] = g;     
      this.clearColor[2] = b;     
      this.clearColor[3] = a;     
      this.gl.clearColor(r, g, b, a);
    }
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  },
  
  /**
   * Clears the canvas context (usually at the beginning of each frame).
   * If the color is undefined, it will default to opaque black.
   * It is not recommended but possible to pass a number as a parameter,
   * in which case the color will be [n, n, n, 255], or directly an array of
   * [r, g, b, a] values, all in the 0..255 interval.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
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
        zfar = z * 100,
        aspect = w / h;
        
    mat4.perspective(fov, aspect, znear, zfar, this.projMatrix, true);
    mat4.translate(this.projMatrix, [-x, -y, -z]);
  },
  
  /**
   * Sets a default orthographic projection (recommended for 2d rendering).
   */
  ortho: function() {
    var w = this.width,
        h = this.height;
        
    mat4.ortho(0, w, h, 0, -100, 100, this.projMatrix);
  },
  
  /**
   * Sets a custom projection matrix.
   *
   * @param {object} matrix: the custom projection matrix to be used
   */
  projection: function(matrix) {
    this.viewport(this.width, this.height);
    mat4.set(matrix, this.projMatrix);
  },
  
  /**
   * Pushes the current model view matrix on a stack, to be popped out later.
   * This can be used, for example, to create complex animations and be able
   * to revert back to the current model view.
   */
  pushMatrix: function() {
    var copy = mat4.create();
    mat4.set(this.mvMatrix, copy);
    this.mvMatrixStack.push(copy);
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
   * @param {object} matrix: the matrix to be multiply the model view with
   */
  transform: function(matrix) {
    mat4.multiply(this.mvMatrix, matrix);
  },
  
  /**
   * Translates the model view by the x, y and z coordinates.
   *
   * @param {number} x: the x amount of translation
   * @param {number} y: the y amount of translation
   * @param {number} z: the z amount of translation
   */
  translate: function(x, y, z) {
    mat4.translate(this.mvMatrix, [x, y, z]);
  },
  
  /**
   * Rotates the model view by a specified angle on the x, y and z axis.
   *
   * @param {number} angle: the angle expressed in radians
   * @param {number} x: the x axis of the rotation
   * @param {number} y: the y axis of the rotation
   * @param {number} z: the z axis of the rotation
   */
  rotate: function(angle, x, y, z) {
    mat4.rotate(this.mvMatrix, angle, [x, y, z]);
  },
  
  /**
   * Rotates the model view by a specified angle on the x axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  rotateX: function(angle) {
    mat4.rotateX(this.mvMatrix, angle);
  },
  
  /**
   * Rotates the model view by a specified angle on the y axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  rotateY: function(angle) {
    mat4.rotateY(this.mvMatrix, angle);
  },
  
  /**
   * Rotates the model view by a specified angle on the z axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  rotateZ: function(angle) {
    mat4.rotateZ(this.mvMatrix, angle);
  },
  
  /**
   * Scales the model view by the x, y and z coordinates.
   *
   * @param {number} x: the x amount of scaling
   * @param {number} y: the y amount of scaling
   * @param {number} z: the z amount of scaling
   */
  scale: function(x, y, z) {
    mat4.scale(this.mvMatrix, [x, y, z]);
  },
 
  /**
   * Sets the current tint color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  tint: function(color) {
    this.tintColor = Tilt.Math.hex2rgba(color);
  },
  
  /**
   * Disables the current tint color value.
   */
  noTint: function() {
    this.tintColor[0] = 1;
    this.tintColor[1] = 1;
    this.tintColor[2] = 1;
    this.tintColor[3] = 1;
  },
  
  /**
   * Sets the current fill color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  fill: function(color) {
    this.fillColor = Tilt.Math.hex2rgba(color);
  },
  
  /**
   * Disables the current fill color value.
   */
  noFill: function() {
    this.fillColor[0] = 0;
    this.fillColor[1] = 0;
    this.fillColor[2] = 0;
    this.fillColor[3] = 0;
  },
  
  /**
   * Sets the current stroke color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  stroke: function(color) {
    this.strokeColor = Tilt.Math.hex2rgba(color);
  },
  
  /**
   * Disables the current stroke color value.
   */
  noStroke: function() {
    this.strokeColor[0] = 0;
    this.strokeColor[1] = 0;
    this.strokeColor[2] = 0;
    this.strokeColor[3] = 0;
  },
  
  /**
   * Sets blending, either "alpha" or "add" (additive blending).
   * Anything else disables blending.
   *
   * @param {string} mode: blending, either "alpha", "add" or undefined
   */
  blendMode: function(mode) {
    if ("alpha" === mode) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
    else if ("add" === mode || "additive" === mode) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
    }
    else {
      this.gl.disable(this.gl.BLEND);
    }
  },
  
  /**
   * Sets if depth testing should be enabled or not.
   * Disabling could be useful when handling transparency (for example).
   *
   * @param {boolean} mode: true if depth testing should be enabled
   */
  depthTest: function(mode) {
    if (mode) {
      this.gl.enable(this.gl.DEPTH_TEST);
    }
    else {
      this.gl.disable(this.gl.DEPTH_TEST);
    }
  },
  
  /**
   * Sets the current stroke weight (line width).
   *
   * @param {number} weight: the stroke weight
   */
  strokeWeight: function(weight) {
    this.gl.lineWidth(weight);
  },
  
  /**
   * Helper function to set active the color shader with the required params
   * 
   * @param {object} verticesBuffer: a buffer of vertices positions
   * @param {array} mvMatrix: 
   * @param {array} projMatrix: 
   * @param {array} color: 
   */
  useColorShader: function(verticesBuffer, 
                           mvMatrix, projMatrix, color) {
    // use this program
    this.useProgram(this.colorShader, 1);
    
    // bind the attributes and uniforms as necessary
    this.bindVertexBuffer(this.colorShader.vertexPosition, verticesBuffer);
    this.bindUniformMatrix(this.colorShader.mvMatrix, mvMatrix);
    this.bindUniformMatrix(this.colorShader.projMatrix, projMatrix);
    this.bindUniformVec4(this.colorShader.color, color);
  },
  
  /**
   * Helper function to set active the texture shader with the required params
   * 
   * @param {object} verticesBuffer: a buffer of vertices positions
   * @param {object} texCoordBuffer: a buffer of vertices texture coordinates
   * @param {array} mvMatrix: 
   * @param {array} projMatrix: 
   * @param {array} color: 
   * @param {array} texture: 
   */
  useTextureShader: function(verticesBuffer, texCoordBuffer,
                             mvMatrix, projMatrix, color, texture) {
                               
    // use this program
    this.useProgram(this.textureShader, 2);
    
    // bind the attributes and uniforms as necessary
    this.bindVertexBuffer(this.textureShader.vertexPosition, verticesBuffer);
    this.bindVertexBuffer(this.textureShader.vertexTexCoord, texCoordBuffer);
    this.bindUniformMatrix(this.textureShader.mvMatrix, mvMatrix);
    this.bindUniformMatrix(this.textureShader.projMatrix, projMatrix);
    this.bindUniformVec4(this.textureShader.color, color);
    this.bindTexture(this.textureShader.sampler, texture);
  },
  
  /**
   * Modifies the location from which rectangles draw. The default mode is
   * rectMode("corner"), which specifies the location to be the upper left
   * corner of the shape and uses the third and fourth parameters of rect() to
   * specify the width and height. Use rectMode("center") to draw centered
   * at the given x and y position.
   *
   * @param {string} mode: either "corner" or "center"
   */
  rectMode: function(mode) {
    this.rectangle.rectModeValue = mode;
  },
  
  /**
   * Draws a rectangle using the specified parameters.
   *
   * @param {number} x: the x position of the object
   * @param {number} y: the y position of the object
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   */
  rect: function(x, y, width, height) {
    // if rectMode is set to "center", we need to offset the origin
    if ("center" === this.rectangle.rectModeValue) {
      x -= width / 2;
      y -= height / 2;
    }
    
    // in memory, the rectangle is represented as a perfect 1x1 square, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.translate(x, y, 0);
    this.scale(width, height, 1);
    
    // draw the rectangle only if the fill alpha channel is not transparent
    if (this.fillColor[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(this.rectangle.vertices,
                          this.mvMatrix,
                          this.projMatrix,
                          this.fillColor);
                          
      this.drawVertices(this.TRIANGLE_STRIP, 
                        this.rectangle.vertices.numItems);
    }
    
    // draw the outline only if the stroke alpha channel is not transparent
    if (this.strokeColor[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(this.rectangle.wireframe,
                          this.mvMatrix,
                          this.projMatrix,
                          this.strokeColor);
                          
      this.drawVertices(this.LINE_STRIP,
                        this.rectangle.wireframe.numItems);
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
   * @param {string} mode: either "corner" or "center"
   */
  imageMode: function(mode) {
    this.rectangle.imageModeValue = mode;
  },
  
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
  image: function(texture, x, y, width, height) {
    // if the width and height are not specified, we use the embedded
    // texture dimensions, from the source image or framebuffer
    if ("undefined" === typeof width || "undefined" === typeof height) {
      width = texture.width;
      height = texture.height;
    }
    
    // if imageMode is set to "center", we need to offset the origin
    if ("center" === this.rectangle.imageModeValue) {
      x -= width / 2;
      y -= height / 2;
    }
    
    // draw the image only if the tint alpha channel is not transparent
    if (this.tintColor[3]) {
      // in memory, the rectangle is represented as a perfect 1x1 square, so
      // some transformations are applied to achieve the desired shape
      this.pushMatrix();
      this.translate(x, y, 0);
      this.scale(width, height, 1);
      
      // use the necessary shader and draw the vertices
      this.useTextureShader(this.rectangle.vertices,
                            this.rectangle.texCoord,
                            this.mvMatrix, 
                            this.projMatrix, 
                            this.tintColor,
                            texture);
                            
      this.drawVertices(this.TRIANGLE_STRIP, 
                        this.rectangle.vertices.numItems);
                        
      this.popMatrix();
    }
  },
  
  /**
   * Draws a box using the specified parameters.
   *
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   * @param {number} depth: the depth of the object
   * @param {object} texture: the texture to be used
   */
  box: function(width, height, depth, texture) {
    // in memory, the box is represented as a simple perfect 1x1 cube, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.scale(width, height, depth);
    
    if (texture) {
      // draw the box only if the tint alpha channel is not transparent
      if (this.tintColor[3]) {
        // use the necessary shader and draw the vertices
        this.useTextureShader(this.cube.vertices,
                              this.cube.texCoord,
                              this.mvMatrix, 
                              this.projMatrix, 
                              this.tintColor, texture);
                              
        this.drawIndexedVertices(this.TRIANGLES,
                                 this.cube.indices);
      }
    }
    else {
      // draw the box only if the fill alpha channel is not transparent
      if (this.fillColor[3]) {
        // use the necessary shader and draw the vertices
        this.useColorShader(this.cube.vertices,
                            this.mvMatrix, 
                            this.projMatrix, 
                            this.fillColor);
                            
        this.drawIndexedVertices(this.TRIANGLES,
                                 this.cube.indices);
      }
    }
    // draw the outline only if the stroke alpha channel is not transparent
    if (this.strokeColor[3]) {
        // use the necessary shader and draw the vertices
        this.useColorShader(this.cube.wireframe,
                            this.mvMatrix, 
                            this.projMatrix, 
                            this.strokeColor);
                            
        this.drawIndexedVertices(this.LINES,
                                 this.cube.wireframeIndices);
    }
    
    this.popMatrix();
  },
  
  /**
   * Draws a custom mesh, using only the built-in shaders.
   * For more complex techniques, create your own shaders and drawing logic.
   *
   * @param {object} verticesBuffer: the vertices buffer (x, y and z)
   * @param {object} texCoordBuffer: the texture coordinates buffer (u, v)
   * @param {object} normalsBuffer: the normals buffer (m, n, p)
   * @param {number} or {string} drawMode: WebGL enum, like this.TRIANGLES
   * @param {string} color: the color to be used by the shader if required
   * @param {object} texture: the texture to be used by the shader if required
   * @param {object} indicesBuffer: indices for the passed vertices buffer
   */
  mesh: function(verticesBuffer, texCoordBuffer, normalsBuffer,
                 drawMode, color, texture, indicesBuffer) {
                   
    // use the necessary shader
    if (texture) {
      this.useTextureShader(verticesBuffer,
                            texCoordBuffer,
                            this.mvMatrix,
                            this.projMatrix, 
                            "string" === typeof color ?
                            Tilt.Math.hex2rgba(color) : color, texture);
    }
    else {
      this.useColorShader(verticesBuffer,
                          this.mvMatrix,
                          this.projMatrix,
                          "string" === typeof color ?
                          Tilt.Math.hex2rgba(color) : color);
    }
        
    // draw the vertices as indexed elements or simple arrays
    if (indicesBuffer) {
      this.drawIndexedVertices(drawMode, indicesBuffer);
    }
    else {
      this.drawVertices(drawMode, verticesBuffer.numItems);
    }
    
    // TODO: use the normals buffer, add some lighting
  },
  
  /**
   * Handles a generic get request, performed on a specified url. When done,
   * it fires the ready callback function if it exists, & passes the http
   * request object and also an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {string} url: the url to perform the GET to
   * @param {function} readyCallback: function to be called when request ready
   * @param {object} aParam: optional parameter passed to readyCallback
   */
  request: function(url, readyCallback, aParam) {
    var xhr = new XMLHttpRequest();
    
    xhr.open("GET", url, true);
    xhr.send(null);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if ("function" === typeof readyCallback) {
          readyCallback(xhr, aParam);
          readyCallback = null;
        }
      }
    };
  },
  
  /**
   * Handles multiple get requests from specified urls. When all requests are
   * completed, it fires the ready callback function if it exists, & passes
   * the http request object and an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {array} urls: an array of urls to perform the GET to
   * @param {function} readyCallback: function called when all requests ready
   * @param {object} aParam: optional parameter passed to readyCallback
   */
  requests: function(urls, readyCallback, aParam) {
    var xhrs = [], finished = 0, i, length;
    
    function requestReady() {
      finished++;
      if (finished === urls.length) {
        if ("function" === typeof readyCallback) {
          readyCallback(xhrs, aParam);
          readyCallback = null;
        }
      }
    }
    
    function requestCallback(xhr, index) {
      xhrs[index] = xhr;
      requestReady();
    }
    
    for (i = 0, length = urls.length; i < length; i++) {
      this.request(urls[i], requestCallback, i);
    }
  },
  
  /**
   * Helper function to create a 3D context in a cross browser way.
   *
   * @param {object} canvas: the canvas to get the WebGL context from
   * @param {object} opt_attribs: optional attributes used for initialization
   */
  create3DContext: function(canvas, opt_attribs) {
    var names = ["experimental-webgl", "webgl", "webkit-3d", "moz-webgl"];
    var context, i, length;
    
    for (i = 0, length = names.length; i < length; ++i) {
      try {
        context = canvas.getContext(names[i], opt_attribs);
      }
      catch(e) { }
      
      if (context) {
        break;
      }
    }
    try {
      return context;
    }
    finally {
      names = null;
      canvas = null;
      context = null;
      opt_attribs = null;
    }
  },
  
  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally,
   * and resets the model view and projection matrices.
   * Use it at the beginning of your loop function, like this:
   *
   *      function draw() {
   *        tilt.requestAnimFrame(draw);
   *
   *        // do rendering
   *        ...
   *      };
   *
   * @param {function} loop: the function to be called each frame
   */
  requestAnimFrame: function(draw) {
    window.requestAnimFrame(draw);
    
    // reset the model view and projection matrices
    this.origin();
    this.perspective();
    
    // calculate the frame delta and frame rate using the current time
    this.currentTime = new Date().getTime();
    
    if (this.lastTime !== 0) {
      this.frameDelta = this.currentTime - this.lastTime;
      this.frameRate = 1000 / this.frameDelta;
    }
    this.lastTime = this.currentTime;
    this.currentTime = null;
    
    // increment the elapsed time and total frame count
    this.elapsedTime += this.frameDelta;
    this.frameCount++;
  },
  
  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    for (var i in this) {
      this[i] = null;
    }
  }
};

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback, element) {
           window.setTimeout(callback, 1000 / 60);
         };
})();