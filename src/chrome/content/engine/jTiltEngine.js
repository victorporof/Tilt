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
   * The current shader used by the WebGL context.
   */
  this.shader = undefined;

  /**
   * Initializes a WebGL context, and runs fail or success callback functions.
   * @param {object} canvas: the canvas to create the WebGL context with
   * @param {number} width: the width of the canvas
   * @param {number} height: the height of the canvas
   * @param {function} successCallback: to be called if initialization worked
   * @param {function} failCallback: to be called if initialization failed
   * @return {object} the created gl context if successful, null otherwise
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
   * If only two params are specified (the shader name and the readyCallback 
   * function), then ".fs" and ".vs" extensions will be automatically used).
   * @param {string} vertShaderURL: the vertex shader resource
   * @param {string} fragShaderURL: the fragment shader resource
   * @param {function} readyCallback: the function called when loading is done
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

    this.requests([vertShaderURL, fragShaderURL],
                  function finishedCallback(http) {

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
   * @param {string} shaderSource: the source code for the shader
   * @param {string} shaderType: the shader type (vertex or fragment)
   * @return {object} the compiled shader
   */
  this.compileShader = function(shaderSource, shaderType) {
    var gl = this.gl;
    var shader;

    if (!shaderSource) {
      TiltUtils.Console.error(TiltUtils.StringBundle.get(
        "compileShader.source.error"));

      return null;
    }

    if (shaderType == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else if (shaderType == "x-shader/x-fragment") {
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
      TiltUtils.Console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  /**
   * Links two compiled vertex/fragment shaders together to form a program.
   * @param {object} vertShader: the compiled vertex shader
   * @param {object} fragShader: the compiled fragment shader
   * @return {object} the newly created and linked shader program
   */
  this.linkProgram = function(vertShader, fragShader) {
    var gl = this.gl;
    var program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      TiltUtils.Console.error(TiltUtils.StringBundle.format(
        "linkProgram.error", [vertShader.src, fragShader.src]));
    }
    else this.useShader(program);
    return program;
  }

  /**
   * Uses the shader program as current for the gl context.
   * @param {object} program: the shader program to be used by the engine
   */
  this.useShader = function(program) {
    this.gl.useProgram(this.shader = program);
  }

  /**
   * Gets a shader attribute location from a program.
   * @param {object} program: the shader program to obtain the attribute from
   * @param {string} attribute: the attribute name
   * @return {number} the attribute location from the program
   */
  this.shaderAttribute = function(program, attribute) {
    return this.gl.getAttribLocation(program, attribute);
  }

  /**
   * Gets a shader uniform location from a program.
   * @param {object} program: the shader program to obtain the uniform from
   * @param {string} uniform: the uniform name
   * @return {object} the uniform object from the program
   */
  this.shaderUniform = function(program, uniform) {
    return this.gl.getUniformLocation(program, uniform);
  }

  /**
   * Gets a generic shader variable (attribute or uniform) from a program.
   * If an attribute is found, the attribute location will be returned.
   * Otherwise, the uniform will be searched and returned if found.
   * @param {object} program: the shader program to obtain the uniform from
   * @param {string} variable: the attribute or uniform name
   * @return {number} or {object} the attribute or uniform from the program
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
   * @param {array} elementsArray: an array of floats
   * @param {number} itemSize: how many items create a block
   * @param {number} numItems: how mahy items to use from the array
   * @return {object} the buffer
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
   * @param {array} elementsArray: an array of unsigned integers
   * @return {object} the index buffer
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
   * Initializes a texture from a source, calls a callback function when
   * ready; the source may be an url or a pre-existing image or canvas; if the
   * source is an already loaded image, the texture is immediately created.
   * @param {object} or {string} textureSource: the texture source
   * @param {function} readyCallback: function called when loading is finished
   * @param {string} minFilter: either 'nearest' or 'linear'
   * @param {string} magFilter: either 'nearest' or 'linear'
   * @param {object} mipmap: either 'mipmap' or null
   * @param {string} wrapS: either 'repeat' or undefined
   * @param {string} wrapT: either 'repeat' or undefined
   * @param {object} flipY: either 'flipY' or null
   */
  this.initTexture = function(textureSource, readyCallback,
                              minFilter, magFilter, mipmap,
                              wrapS, wrapT, flipY) {
    var that = this;
    var gl = this.gl;
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
      }
    }

    /* Used internally for binding an image to a texture object */
    function bindTextureImage() {
      TiltUtils.Image.resizeToPowerOfTwo(texture.image,
                                         function resizeCallback(image) {
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
      }, true);
    }
  }

  /**
   * Sets texture parameters for the current texture binding.
   * Optionally, you can also set the current texture manually.
   * @param {string} minFilter: either 'nearest' or 'linear'
   * @param {string} magFilter: either 'nearest' or 'linear'
   * @param {object} mipmap: either 'mipmap' or null
   * @param {string} wrapS: either 'repeat' or undefined
   * @param {string} wrapT: either 'repeat' or undefined
   * @param {object} texture: optional texture to replace the current binding
   */
  this.setTextureParams = function(minFilter, magFilter, mipmap,
                                   wrapS, wrapT,
                                   texture) {
    var gl = this.gl;
    
    if (texture) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }

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
   * Used internally, you probably shouldn't call this function directly.
   *
   * @param {Float32Array} mvMatrix: the modelview matrix
   * @param {Float32Array} projMatrix: the projection matrix
   * @param {object} verticesBuffer: the vertices buffer (x, y and z coords)
   * @param {object} texcoordBuffer: the texture coordinates (u, v)
   * @param {string} color: the tint color to be used by the shader
   * @param {object} texture: the texture to be used by the shader if required
   * @param {UInt16Array} indexBuffer: indices for the passed vertices
   * @param {number} drawMode: gl context enum, like gl.TRIANGLES or gl.LINES
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
   * Also used internally, you probably shouldn't call this function directly.
   *
   * @param {object} mvMatrixUniform: the uniform to store the modelview
   * @param {Float32Array} mvMatrix: the modelview matrix
   * @param {object} projMatrixUniform: the uniform to store the projection
   * @param {Float32Array} projMatrix: the projection matrix
   * @param {object} verticesAttribute: the attribute to store the vertices
   * @param {object} verticesBuffer: the vertices buffer (x, y and z coords)
   * @param {object} texcoordAttribute: the attribute to store the texcoords
   * @param {object} texcoordBuffer: the texture coordinates (u, v)
   * @param {object} colorUniform: the uniform to store the tint color
   * @param {string} color: the tint color to be used by the shader
   * @param {object} textureSampler: the sampler to store the texture
   * @param {object} texture: the texture to be used by the shader if required
   * @param {UInt16Array} indexBuffer: indices for the passed vertices
   * @param {number} drawMode: gl context enum, like gl.TRIANGLES or gl.LINES
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
   * it fires the ready callback function if it exists, & passes the http
   * request object and also an optional auxiliary parameter if available.
   * @param {string} url: the url to perform the GET to
   * @param {function} readyCallback: function to be called when request ready
   * @param {object} auxParam: optional parameter passed to readyCallback
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
   * completed, it fires the ready callback function if it exists, & passes 
   * the http request object and also an optional auxiliary parameter if 
   * available.
   * @param {array} urls: an array of urls to perform the GET to
   * @param {function} readyCallback: function called when all requests ready
   * @param {object} auxParam: optional parameter passed to readyCallback
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
