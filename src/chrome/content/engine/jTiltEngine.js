/*
 * jTiltEngine.js - Helper low-level functions for WebGL
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

var EXPORTED_SYMBOLS = ["TiltEngine"];

/**
 * TiltEngine constructor.
 * @return {object} the created object
 */
function TiltEngine() {

  /**
   * By convention, we make a private 'that' variable.
   */
  var that = this;

  /**
   * WebGL context to be used.
   */
  this.gl = null;

  /**
   * The current shader used by the WebGL context. Used for caching.
   */
  this.program = null;

  /**
   * Initializes a WebGL context, and runs fail or success callback functions.
   *
   * @param {object} canvas: the canvas to create the WebGL context with
   * @param {function} successCallback: to be called if initialization worked
   * @param {function} failCallback: to be called if initialization failed
   * @return {object} the created gl context if successful, null otherwise
   */
  this.initWebGL = function(canvas, failCallback, successCallback) {
    var gl = create3DContext(canvas, {
        antialias: true
    });
    if (gl) {
      that.gl = gl;
      if (successCallback) {
        successCallback();
      }
    }
    else {
      TiltUtils.Console.log(TiltUtils.StringBundle.get("webgl.init.error"));
      if (failCallback) {
        failCallback();
      }
    }
    
    return gl;
  };

  /**
   * Initializes a shader program, using specified sources.
   * The ready callback function will have as a parameter the newly created
   * shader program, by compiling and linking the vertex and fragment shader.
   *
   * @param {string} vertShaderSrc: the vertex shader source
   * @param {string} fragShaderSrc: the fragment shader source
   * @param {function} readyCallback: the function called when loading is done
   */
  this.initProgram = function(vertShaderSrc, fragShaderSrc, readyCallback) {
    var vertShader = that.compileShader(vertShaderSrc, "x-shader/x-vertex");
    var fragShader = that.compileShader(fragShaderSrc, "x-shader/x-fragment");
    
    vertShader.src = vertShaderSrc;
    fragShader.src = fragShaderSrc;
    
    if (readyCallback) {
      readyCallback(that.linkProgram(vertShader, fragShader));
    }
  };
  
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
  this.initProgramAt = function(vertShaderURL, fragShaderURL, readyCallback) {
    if (arguments.length === 2) {
      readyCallback = fragShaderURL;
      fragShaderURL = vertShaderURL + ".fs";
      vertShaderURL = vertShaderURL + ".vs";
    }
    
    that.requests([vertShaderURL, fragShaderURL], function(http) {
      var vertShader = that.compileShader(http[0].responseText,
                                          "x-shader/x-vertex");

      var fragShader = that.compileShader(http[1].responseText,
                                          "x-shader/x-fragment");

      vertShader.src = http[0].responseText;
      fragShader.src = http[1].responseText;
      
      if (readyCallback) {
        readyCallback(that.linkProgram(vertShader, fragShader));
      }
    });
  };
  
  /**
   * Compiles a shader source of pecific type, either vertex or fragment.
   *
   * @param {string} shaderSource: the source code for the shader
   * @param {string} shaderType: the shader type ('x-vertex' or 'x-fragment')
   * @return {object} the compiled shader
   */
  this.compileShader = function(shaderSource, shaderType) {
    var gl = that.gl;
    var shader;

    if (!shaderSource) {
      shaderSource = "undefined";
      TiltUtils.Console.error(TiltUtils.StringBundle.get(
        "compileShader.source.error"));

      return null;
    }

    if (shaderType === "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else if (shaderType === "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else {
      TiltUtils.Console.error(TiltUtils.StringBundle.format(
        "compileShader.type.error"), [shaderSource]);
        
      return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      TiltUtils.Console.error(TiltUtils.StringBundle.format(
        "compileShader.compile.error"), [gl.getShaderInfoLog(shader)]);

      return null;
    }
    return shader;
  };

  /**
   * Links two compiled vertex or fragment shaders together to form a program.
   *
   * @param {object} vertShader: the compiled vertex shader
   * @param {object} fragShader: the compiled fragment shader
   * @return {object} the newly created and linked shader program
   */
  this.linkProgram = function(vertShader, fragShader) {
    var gl = that.gl;
    var program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      TiltUtils.Console.error(TiltUtils.StringBundle.format(
        "linkProgram.error", [vertShader.src, fragShader.src]));
    }
    
    return program;
  };
  
  /**
   * Uses the shader program as current for the gl context.
   *
   * @param {object} program: the shader program to be used by the engine
   * @param {array} attributes: array of attributes to enable for this shader
   */
  this.useProgram = function(program, attributes) {
    var gl = that.gl;
    
    if (that.program !== program) {
      gl.useProgram(that.program = program);
      
      for (var i = 0, len = attributes.length; i < len; i++) {
        gl.enableVertexAttribArray(attributes[i]);
      }
    }
  };

  /**
   * Gets a shader attribute location from a program.
   *
   * @param {object} program: the shader program to obtain the attribute from
   * @param {string} attribute: the attribute name
   * @return {number} the attribute location from the program
   */
  this.shaderAttribute = function(program, attribute) {
    var value = that.gl.getAttribLocation(program, attribute);
    value.cache = [];
    
    return value;
  };

  /**
   * Gets a shader uniform location from a program.
   *
   * @param {object} program: the shader program to obtain the uniform from
   * @param {string} uniform: the uniform name
   * @return {object} the uniform object from the program
   */
  this.shaderUniform = function(program, uniform) {
    var value = that.gl.getUniformLocation(program, uniform);
    value.cache = [];
    
    return value;
  };

  /**
   * Gets a generic shader variable (attribute or uniform) from a program.
   * If an attribute is found, the attribute location will be returned.
   * Otherwise, the uniform will be searched and returned if found.
   *
   * @param {object} program: the shader program to obtain the uniform from
   * @param {string} variable: the attribute or uniform name
   * @return {number} or {object} the attribute or uniform from the program
   */
  this.shaderIO = function(program, variable) {
    var location = that.shaderAttribute(program, variable);
    if (location < 0) {
      location = that.shaderUniform(program, variable);
    }
    return location;
  };
  /**
   * Binds a vertex buffer as an array buffer for a specific shader attribute
   *
   * @param {number} attribute: the attribute obtained from the shader
   * @param {object} buffer: the buffer to bind
   */
  this.bindVertexBuffer = function(attribute, buffer) {
    var gl = that.gl;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attribute, buffer.itemSize, gl.FLOAT, false, 0, 0);    
  };
  
  /**
   * Binds a uniform matrix if not already cached.
   *
   * @param {object} uniform: the uniform to bind the variable to
   * @param {object} variable: the variable to be binded
   */
  this.bindUniformMatrix = function(uniform, variable) {
    var cached;

    if (uniform.cache.length) {
      cached = 
        uniform.cache[0] == variable[0] && // first 3 elements from the 
        uniform.cache[1] == variable[5] && // matrix primary diagonal are 
        uniform.cache[2] == variable[10];  // most likely to be very volatile
    }    
    if (!cached) {
      uniform.cache[0] = variable[0];
      uniform.cache[1] = variable[5];
      uniform.cache[2] = variable[10];
      that.gl.uniformMatrix4fv(uniform, false, variable);
    }
  };
  
  /**
   * Binds a uniform vector of 4 elements if not already cached.
   *
   * @param {object} uniform: the uniform to bind the variable to
   * @param {object} variable: the variable to be binded
   */
  this.bindUniformVec4 = function(uniform, variable) {
    var cached;
    
    if (uniform.cache.length) {
      cached = 
        uniform.cache[0] == variable[0] && // first 3 elements from the 
        uniform.cache[1] == variable[1] && // vector ({r, g, b} or {x, y, z}) 
        uniform.cache[2] == variable[2];   // most likely to be very volatile
    }
    
    if (!cached) {
      uniform.cache[0] = variable[0];
      uniform.cache[1] = variable[1];
      uniform.cache[2] = variable[2];
      that.gl.uniform4fv(uniform, variable);
    }
  };
  
  /**
   * Binds a uniform texture to a sampler if not already cached.
   *
   * @param {object} sampler: the sampler to bind the texture to
   * @param {object} texture: the texture to be binded
   * @param {boolean} clearCache: pass true if the texture pixels have changed
   */
  this.bindTexture = function(sampler, texture, clearCache) {
    var gl = that.gl;

    if (clearCache || sampler.chache != texture) {
      sampler.cache = texture;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(sampler, 0);
    }
  };
  
  /**
   * Initializes buffer data to be used for drawing, using an array of floats.
   * The 'numItems' can be specified to use only a portion of the array.
   *
   * @param {array} elementsArray: an array of floats
   * @param {number} itemSize: how many items create a block
   * @param {number} numItems: optional, how many items to use from the array
   * @return {object} the initialized buffer
   */
  this.initBuffer = function(elementsArray, itemSize, numItems) {
    if (!numItems) {
      numItems = elementsArray.length / itemSize;
    }
    
    var gl = that.gl;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elementsArray),
                  gl.STATIC_DRAW);
    
    buffer.array = elementsArray;
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    
    return buffer;
  };
  
  /**
   * Initializez a buffer of vertex indices, using an array of unsigned ints.
   * The item size will automatically default to 1, and the numItems will be
   * equal to the number of items in the array.
   *
   * @param {array} elementsArray: an array of unsigned integers
   * @param {number} numItems: how many items to use from the array
   * @return {object} the initialized index buffer
   */
  this.initIndexBuffer = function(elementsArray, numItems) {
    if (!numItems) {
      numItems = elementsArray.length;
    }
    
    var gl = that.gl;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elementsArray),
                  gl.STATIC_DRAW);
                  
    buffer.array = elementsArray;
    buffer.itemSize = 1;
    buffer.numItems = numItems;

    return buffer;
  };
    
  /**
   * Initializes a texture from a source, calls a callback function when
   * ready. The source may be an url or a pre-existing image or canvas. If the
   * source is an already loaded image, the texture is immediately created.
   *
   * @param {object} or {string} textureSource: the texture source
   * @param {function} readyCallback: function called when loading is finished
   * @param {string} fillColor: optional, color to fill the transparent bits
   * @param {string} strokeColor: optional, color to draw an outline
   * @param {number} strokeWeight: optional, the width of the outline
   * @param {string} minFilter: either 'nearest' or 'linear'
   * @param {string} magFilter: either 'nearest' or 'linear'
   * @param {object} mipmap: either 'mipmap' or null
   * @param {string} wrapS: either 'repeat' or null
   * @param {string} wrapT: either 'repeat' or null
   * @param {object} flipY: either 'flipY' or null
   */
  this.initTexture = function(textureSource, readyCallback,
                              fillColor, strokeColor, strokeWeight,
                              minFilter, magFilter, mipmap,
                              wrapS, wrapT, flipY) {
    var gl = that.gl;
    var texture = gl.createTexture();

    if ("object" === typeof(textureSource)) {
      texture.image = textureSource;
      bindTextureImage();
    }
    else if ("string" === typeof(textureSource)) {
      texture.image = new Image();
      texture.image.src = textureSource;
      texture.image.onload = function() {
        bindTextureImage();
      };
    }
    
    // Used internally for binding an image to a texture object
    function bindTextureImage() {
      TiltUtils.Image.resizeToPowerOfTwo(texture.image, function(image) {
        texture.image = image;
        
        if (flipY) {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
                      texture.image);
                      
        that.setTextureParams(minFilter, magFilter, mipmap,
                              wrapS, wrapT, flipY);
                              
        if (mipmap) {
          gl.generateMipmap(gl.TEXTURE_2D);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        if (readyCallback) {
          readyCallback(texture);
        }
      }, fillColor, strokeColor, strokeWeight, true);
    }
  };
  
  /**
   * Sets texture parameters for the current texture binding.
   * Optionally, you can also (re)set the current texture binding manually.
   *
   * @param {string} minFilter: either 'nearest' or 'linear'
   * @param {string} magFilter: either 'nearest' or 'linear'
   * @param {object} mipmap: either 'mipmap' or null
   * @param {string} wrapS: either 'repeat' or null
   * @param {string} wrapT: either 'repeat' or null
   * @param {object} texture: optional texture to replace the current binding
   */
  this.setTextureParams = function(minFilter, magFilter, mipmap,
                                   wrapS, wrapT, texture) {
    var gl = that.gl;
    
    if (texture) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    if (minFilter === "nearest") {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }
    else if (minFilter === "linear" && mipmap) {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    if (magFilter === "nearest") {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    else if (magFilter === "linear" && mipmap) {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    if (wrapS === "repeat") {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_WRAP_S, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    }

    if (wrapT === "repeat") {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_WRAP_T, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  };

  /**
   * Draws binded vertex buffers using the specified parameters.
   *
   * @param {number} or {string} drawMode: gl enum, like gl.TRIANGLES, or
   * 'triangles', 'triangle-strip, 'triangle-fan, 'points', 'lines' etc.
   * @param {number} first: the starting index in the enabled arrays
   * @param {number} count: the number of indices to be rendered
   */
  this.drawVertices = function(drawMode, first, count) {
    that.gl.drawArrays(that.getDrawModeEnum(drawMode), first, count);
  };
  
  /**
   * Draws binded vertex buffers using the specified parameters.
   * This function uses an index buffer.
   *
   * @param {number} or {string} drawMode: gl enum, like gl.TRIANGLES, or
   * 'triangles', 'triangle-strip, 'triangle-fan, 'points', 'lines' etc.
   * @param {object} indicesBuffer: indices for the passed vertices buffer; if 
   * the indices buffer is specified, the first and count values are ignored
   */
  this.drawIndexedVertices = function(drawMode, indicesBuffer) {
    var gl = that.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.drawElements(that.getDrawModeEnum(drawMode),                      
                    indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  };
  
  /**
   * Converts from a string describing the draw mode to the corresponding 
   * value as a gl enum. If drawMode is undefined, it is defaulted to 
   * gl.TRIANGLE_STRIP. If it is already a number, that number is returned.
   *
   * @param {number} or {string} drawMode: gl enum, like gl.TRIANGLES, or
   * 'triangles', 'triangle-strip, 'triangle-fan, 'points', 'lines' etc.
   * @return {number} the corresponding value
   */
  this.getDrawModeEnum = function(drawMode) {
    var gl = that.gl;
    var mode;
    
    if ("string" === typeof drawMode) {
      if ("triangles" === drawMode) {
        mode = gl.TRIANGLES;
      }
      else if ("triangle-strip" === drawMode) {
        mode = gl.TRIANGLE_STRIP;
      }
      else if ("triangle-fan" === drawMode) {
        mode = gl.TRIANGLE_FAN;
      }
      else if ("points" === drawMode) {
        mode = gl.POINTS;
      }
      else if ("points" === drawMode) {
        mode = gl.POINTS;
      }
      else if ("lines" === drawMode) {
        mode = gl.LINES;
      }
      else if ("line-strip" === drawMode) {
        mode = gl.LINE_STRIP;
      }
      else if ("line-loop" === drawMode) {
        mode = gl.LINE_LOOP;
      }
    }
    else if (drawMode === undefined) {
      mode = gl.TRIANGLE_STRIP;
    }
    else {
      return drawMode;
    }
    
    return mode;
  };

  /**
   * Handles a generic get request, performed on a specified url. When done,
   * it fires the ready callback function if it exists, & passes the http
   * request object and also an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {string} url: the url to perform the GET to
   * @param {function} readyCallback: function to be called when request ready
   * @param {object} auxParam: optional parameter passed to readyCallback
   */
  this.request = function(url, readyCallback, auxParam) {
    var http = new XMLHttpRequest();

    http.open("GET", url, true);
    http.send(null);
    http.onreadystatechange = function() {
      if (http.readyState === 4) {
        if (readyCallback) {
          readyCallback(http, auxParam);
        }
      }
    };
  };

  /**
   * Handles multiple get requests from specified urls. When all requests are
   * completed, it fires the ready callback function if it exists, & passes 
   * the http request object and an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {array} urls: an array of urls to perform the GET to
   * @param {function} readyCallback: function called when all requests ready
   * @param {object} auxParam: optional parameter passed to readyCallback
   */
  this.requests = function(urls, readyCallback, auxParam) {
    var http = [];
    var finished = 0;

    function requestReady() {
      finished++;
      if (finished === urls.length) {
        if (readyCallback) {
          readyCallback(http, auxParam);
        }
      }
    }
    
    for (var i = 0, size = urls.length; i < size; i++) {
      that.request(urls[i], function(request, index) {
        http[index] = request;
        requestReady();
      }, i);
    }
  };
  
  /**
   * Destroys this object.
   */
  this.destroy = function() {
    that.gl = null;
    that.program = null;
    
    that = null;
  };
}