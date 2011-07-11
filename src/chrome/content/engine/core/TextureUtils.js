/*
 * TextureUtils.js - Utility functions for creating and manipulating textures
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
var EXPORTED_SYMBOLS = ["Tilt.TextureUtils"];

/**
 * Utility functions for creating and manipulating textures.
 */
Tilt.TextureUtils = {

  /**
   * Initializes a texture from a pre-existing image or canvas.
   *
   * @param {Image} image: the texture source image or canvas
   * @param {Object} parameters: an object containing the texture properties
   * @return {WebGLTexture} the created texture
   */
  create: function(image, parameters) {
    // make sure the parameters argument is an object
    parameters = parameters || {};

    // make sure the image is power of two before binding to a texture
    var gl = Tilt.$gl,
      pot = Tilt.TextureUtils.resizeImageToPowerOfTwo(image, parameters),
      width = image.width,
      height = image.height,

    // first, create the texture to hold the image data
    texture = gl.createTexture();

    // attach the image data to the newly create texture
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pot);

    // remember the width and the height
    texture.width = width;
    texture.height = height;

    // generate an id for the texture
    texture.id = ++this.count;

    // set the required texture params and do some cleanup
    this.setTextureParams(parameters);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // cleanup
    gl = null;
    pot = null;
    image = null;
    parameters = null;

    return texture;
  },

  /**
   * Sets texture parameters for the current texture binding.
   * Optionally, you can also (re)set the current texture binding manually.
   *
   * @param {Object} parameters: an object containing the texture properties
   */
  setTextureParams: function(parameters) {
    var gl = Tilt.$gl,
      minFilter = gl.TEXTURE_MIN_FILTER,
      magFilter = gl.TEXTURE_MAG_FILTER,
      wrapS = gl.TEXTURE_WRAP_S,
      wrapT = gl.TEXTURE_WRAP_T;

    // make sure the parameters argument is an object
    parameters = parameters || {};

    // bind a new texture if necessary
    if (parameters.texture) {
      gl.bindTexture(gl.TEXTURE_2D, parameters.texture.ref);
    }

    // set the minification filter
    if ("nearest" === parameters.minFilter) {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.NEAREST);
    } else if ("linear" === parameters.minFilter && parameters.mipmap) {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.LINEAR);
    }

    // set the magnification filter
    if ("nearest" === parameters.magFilter) {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.NEAREST);
    } else if ("linear" === parameters.magFilter && parameters.mipmap) {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.LINEAR);
    }

    // set the wrapping on the x-axis for the texture
    if ("repeat" === parameters.wrapS) {
      gl.texParameteri(gl.TEXTURE_2D, wrapS, gl.REPEAT);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, wrapS, gl.CLAMP_TO_EDGE);
    }

    // set the wrapping on the y-axis for the texture
    if ("repeat" === parameters.wrapT) {
      gl.texParameteri(gl.TEXTURE_2D, wrapT, gl.REPEAT);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, wrapT, gl.CLAMP_TO_EDGE);
    }

    // generate mipmap if necessary
    if (parameters.mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    // cleanup
    gl = null;
    parameters = null;
  },

  /**
   * Scales an image to power of two width and height.
   * If the image already has power of two sizes, it is immediately returned.
   *
   * @param {Image} image: the image to be scaled
   * @param {Object} parameters: an object containing the following properties
   *  @param {String} fill: optional, color to fill the transparent bits
   *  @param {String} stroke: optional, color to draw an image outline
   *  @param {Number} strokeWeight: optional, the width of the outline
   * @return {Image} the resized image
   */
  resizeImageToPowerOfTwo: function(image, parameters) {
    var isChromePath = (image.src || "").indexOf("chrome://"),
      isPowerOfTwoWidth = Tilt.Math.isPowerOfTwo(image.width),
      isPowerOfTwoHeight = Tilt.Math.isPowerOfTwo(image.height),
      width, height, canvas, context;

    // first check if the image is not already power of two
    if (isPowerOfTwoWidth && isPowerOfTwoHeight && isChromePath === -1) {
      try {
        return image;
      }
      finally {
        image = null;
        parameters = null;
      }
    }

    // make sure the parameters is an object
    parameters = parameters || {};

    // calculate the power of two dimensions for the npot image
    width = Tilt.Math.nextPowerOfTwo(image.width);
    height = Tilt.Math.nextPowerOfTwo(image.height);

    // create a canvas, then we will use a 2d context to scale the image
    canvas = Tilt.Document.initCanvas(width, height);

    // do some 2d context magic
    context = canvas.getContext("2d");

    // optional fill (useful when handling transparent images)
    if (parameters.fill) {
      context.fillStyle = parameters.fill;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // draw the image with power of two dimensions
    context.drawImage(image,
      0, 0, image.width, image.height,
      0, 0, canvas.width, canvas.height);

    // optional stroke (useful when creating textures for edges)
    if (parameters.stroke) {
      context.strokeStyle = parameters.stroke;
      context.lineWidth = parameters.strokeWeight;
      context.strokeRect(0, 0, canvas.width, canvas.height);
    }

    try {
      return canvas;
    }
    finally {
      image = null;
      canvas = null;
      context = null;
      parameters = null;
    }
  },

  /**
   * Specify if the textures should be flipped.
   * @param {Boolean} flipY: true if the textures should be flipped
   */
  setTextureFlipY: function(flipY) {
    Tilt.$gl.pixelStorei(Tilt.$gl.UNPACK_FLIP_Y_WEBGL, flipY);
  },

  /**
   * The total number of shaders created.
   */
  count: 0
};
