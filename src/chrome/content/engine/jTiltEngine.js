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
function TiltEngine() {
  
  /**
   * WebGL context to be used.
   */
  this.gl = undefined;
  
  /**
   * The current shader used by the gl context.
   */
  this.shader = undefined;
  
  /**
   * Initializes a WebGL context, and runs fail or success callback functions.
   */
  this.initWebGL = function(canvas, width, height,
                            successCallback, failCallback) {
    
    var gl = WebGLUtils.create3DContext(canvas);
    if (gl) {
      if (width) {
        canvas.width = width;
      }
      if (height) {
        canvas.height = height;
      }
      if (successCallback) {
        successCallback();
      }
    }
    else {
      if (failCallback) {
        failCallback();
      }
    }
    return this.gl = gl;
  }
  
  /**
   * Initializes a shader program, using sources located at a specific url.
   */
  this.initShader = function(vertShaderURL, fragShaderURL, readyCallback) {
    if (arguments.length < 2) {
      return;
    }
    if (arguments.length == 2) {
      readyCallback = fragShaderURL;
      fragShaderURL = vertShaderURL + ".fs";
      vertShaderURL = vertShaderURL + ".vs";
    }
    
    var that = this;
    var vertShader;
    var fragShader;
    
    this.requests([vertShaderURL, fragShaderURL], function finished(http) {
      vertShader = that.compileShader(http[0].responseText,
                                      "x-shader/x-vertex");
      
      fragShader = that.compileShader(http[1].responseText,
                                      "x-shader/x-fragment");
      
      vertShader.src = http[0].responseText;
      fragShader.src = http[1].responseText;
      
      if (readyCallback) {
        readyCallback(that.linkProgram(vertShader, fragShader));
      }
    });
  }
  
  /**
   * Compiles a shader source of pecific type, either x-vertex or x-fragment.
   */
  this.compileShader = function(shaderSource, shaderType) {
    var gl = this.gl;
    var shader;
    
    if (!shaderSource) {
      alert("Could not create shader: shader source is null.")
      return null;
    }
    
    if (shaderType == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else if (shaderType == "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else {
      alert("Wrong shader type specified for: " + shaderSource);
      return null;
    }
    
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }
  
  /**
   * Links two compiled vertex/fragment shaders together to form a program.
   */
  this.linkProgram = function(vertShader, fragShader) {
    var gl = this.gl;
    var program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      alert("Could not initialize shader program:\n\n" +
        vertShader.src + "\n\n" +
        fragShader.src);
    }
    else gl.useProgram(program);
    return program;
  }
  
  /**
   * Gets a shader attribute location from a program.
   */
  this.shaderAttribute = function(program, attribute) {
    return this.gl.getAttribLocation(program, attribute);
  }

  /**
   * Gets a shader uniform location from a program.
   */
  this.shaderUniform = function(program, uniform) {
    return this.gl.getUniformLocation(program, uniform);
  }

  /**
   * Gets a generic shader variable (attribute or uniform) from a program.
   */
  this.shaderIO = function(program, variable) {
    var location = this.shaderAttribute(program, variable);
    if (location < 0) {
      location = this.shaderUniform(program, variable);
    }
    return location;
  }
  
  /**
   * Initializes buffer data to be used for drawing, using an array of floats.
   * The 'numItems' can be specified to use only a portion of the array.
   */
  this.initBuffer = function(elementsArray, itemSize, numItems) {
    if (!numItems) numItems = elementsArray.length / itemSize;
    
    var gl = this.gl;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elementsArray),
                  gl.STATIC_DRAW);
    
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    
    return buffer;
  }
  
  /**
   * Initializez a buffer of vertex indices, using an array of unsigned ints.
   */
  this.initIndexBuffer = function(elementsArray) {
    var gl = this.gl;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elementsArray),
                  gl.STATIC_DRAW);
    
    buffer.itemSize = 1;
    buffer.numItems = elementsArray.length;
    
    return buffer;
  }
  
  /**
   * Uses the shader program as current for the gl context.
   */
  this.useShader = function(program) {
    this.gl.useProgram(this.shader = program);
  }

  /**
   * Initializes a texture from a source, calls a callback function when
   * ready; the source may be an url or a pre-existing image or canvas; if the
   * source is an already loaded image, the texture is immediately created.
   */
  this.initTexture = function(textureSource, readyCallback,
                              minFilter, magFilter, mipmap,
                              wrapS, wrapT, flipY) {
    var that = this;
    var gl = this.gl;
    var texture = gl.createTexture();
    
    if ("object" === typeof(textureSource)) {
      texture.image = textureSource;
      applyTextureImage();
    }
    else if ("string" === typeof(textureSource)) {
      texture.image = new Image();
      texture.image.src = textureSource;
      texture.image.onload = function() {
        applyTextureImage();
      }
    }
    
    function applyTextureImage() {
      Image.resizeToPowerOfTwo(texture.image, function resizeCallback(img) {
        texture.image = img;
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        if (flipY) {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        }
        
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
      }, true);
    }
  }
  
  /**
   * Sets texture parameters for the current binding.
   */
  this.setTextureParams = function(minFilter, magFilter, mipmap,
                                   wrapS, wrapT) {                
    var gl = this.gl;
    
    if (minFilter == "nearest") {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }
    else if (minFilter == "linear" && mipmap) {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    if (magFilter == "nearest") {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MAG_FILTER, gl.NEAREST);        
    }
    else if (magFilter == "linear" && mipmap) {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);        
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    if (wrapS == "repeat") {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_WRAP_S, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    }

    if (wrapT == "repeat") {
      gl.texParameteri(gl.TEXTURE_2D, 
                       gl.TEXTURE_WRAP_T, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D,
                       gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }
  
  /**
   * Draws specified vertex buffers, for a custom modelview and projection;
   * This function implies that default uniforms & attributes are embedded in
   * the shader program variable. Some buffer parameters can be omitted.
   */
  this.drawVertices = function(mvMatrix, projMatrix,
                               verticesBuffer,
                               texcoordBuffer,
                               color,
                               texture,
                               indexBuffer, drawMode) {
    
    var shader = this.shader;
    this.drawVertices_(shader.mvMatrix, mvMatrix,
                       shader.projMatrix, projMatrix,
                       shader.vertexPosition, verticesBuffer,
                       shader.vertexTexCoord, texcoordBuffer,
                       shader.color, color,
                       shader.sampler, texture,
                       indexBuffer, drawMode);
  }
  
  /**
   * Draws specified vertex buffers, for a custom modelview and projection;
   * This function does not imply anything. Buffer parameters can be omitted.
   * You probably shouldn't use this function.
   */
  this.drawVertices_ = function(mvMatrixUniform, mvMatrix,
                                projMatrixUniform, projMatrix,
                                verticesAttribute, verticesBuffer,
                                texcoordAttribute, texcoordBuffer,
                                colorUniform, color,
                                textureSampler, texture,
                                indexBuffer, drawMode) {
    var gl = this.gl;
    
    gl.uniformMatrix4fv(mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(projMatrixUniform, false, projMatrix);
    
    if (verticesAttribute != undefined && verticesBuffer != undefined) {
      gl.enableVertexAttribArray(verticesAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
      gl.vertexAttribPointer(verticesAttribute, verticesBuffer.itemSize,
                             gl.FLOAT, false, 0, 0);
    }
    if (texcoordAttribute != undefined && texcoordBuffer != undefined) {
      gl.enableVertexAttribArray(texcoordAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      gl.vertexAttribPointer(texcoordAttribute, texcoordBuffer.itemSize,
                             gl.FLOAT, false, 0, 0);
    }
    if (colorUniform != undefined && color != undefined) {      
      gl.uniform4f(colorUniform, color[0], color[1], color[2], color[3]);
    }
    if (textureSampler != undefined && texture != undefined) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textureSampler, 0);
    }
    if (drawMode == undefined) {
      drawMode = gl.TRIANGLE_STRIP;
    }

    if (indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(drawMode, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else {
      gl.drawArrays(drawMode, 0, verticesBuffer.numItems);
    }
  }
  
  /**
   * Handles a generic get request, performed on a specified url. When done,
   * it fires the ready callback function if it exists, & passes an optional
   * auxiliary parameter to it.
   */
  this.request = function(url, readyCallback, auxParam) {
    var http = new XMLHttpRequest();
    
    http.open("GET", url, true);
    http.send(null);
    http.onreadystatechange = function() {
      if (http.readyState == 4) {
        if (readyCallback) {
          readyCallback(http, auxParam);
        }
      }
    };
  }
  
  /**
   * Handles multiple get requests from specified urls. When all requests are
   * completed, it fires the ready callback function if it exists & passes an
   * optional auxiliary parameter to it.
   */
  this.requests = function(urls, readyCallback, auxParam) {
    var http = [];
    var finished = 0;
    
    function onrequestready() {
      finished++;
      if (finished == urls.length) {
        if (readyCallback) {
          readyCallback(http, auxParam);
        }
      }
    }
    
    for (var i = 0, size = urls.length; i < size; i++) {
      this.request(urls[i], function ready(request, index) {
        http[index] = request;
        onrequestready();
      }, i);
    }
  }
}

/**
 * Scales an image to power of two width and height.
 */
Image.resizeToPowerOfTwo = function(image, readyCallback, forceResize) {
  if (Math.isPowerOfTwo(image.width) &&
      Math.isPowerOfTwo(image.height) && !forceResize) {

    if (readyCallback) {
      readyCallback(image);
      return;
    }
  }

  var iframe_id = "tilt-iframe-" + image.src;
  var canvas_id = "tilt-canvas-" + image.src;

  TiltIframe.Utils.initCanvas(function loadCallback(iframe, canvas) {
    canvas.width = Math.nextPowerOfTwo(image.width);
    canvas.height = Math.nextPowerOfTwo(image.height);

    var context = canvas.getContext('2d');
    context.drawImage(image, 
      0, 0, image.width, image.height,
      0, 0, canvas.width, canvas.height);

    if (readyCallback) {
      readyCallback(image = canvas);
    }
  }, false, iframe_id, canvas_id);
}

/**
 * Helper function, converts degrees to radians.
 */
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Returns if parameter is a power of two.
 */
Math.isPowerOfTwo = function (x) {
  return (x & (x - 1)) == 0;
}

/**
 * Returns the next highest power of two for a number.
 */
Math.nextPowerOfTwo = function(x) {
  --x;
  for (var i = 1; i < 32; i <<= 1) {
    x = x | x >> i;
  }
  return x + 1;
}

/**
 * Converts a hex color to rgba.
 */
Math.hex2rgba = function(hex) {
  hex = hex.charAt(0) == "#" ? hex.substring(1, 7) : hex;
  
  if (hex.length == 3) {
    hex = hex.charAt(0) + hex.charAt(0) +
          hex.charAt(1) + hex.charAt(1) +
          hex.charAt(2) + hex.charAt(2);
  }
  else if (hex.match("^rgba") == "rgba") {
    return hex.substring(5, hex.length - 1).split(',');
  }
  else if (hex.match("^rgb") == "rgb") {
    return hex.substring(4, hex.length - 1).split(',');
  }
  
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;
  
  return [r, g, b, 1];
}