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
var EXPORTED_SYMBOLS = ["Tilt.TextureUtils"];

/**
 * Utility functions for creating and manipulating textures.
 */
Tilt.TextureUtils = {

  /**
   * Initializes a texture from a pre-existing image or canvas.
   *
   * @param {Image | HTMLCanvasElement} image: the source image or canvas
   * @param {Object} parameters: an object containing the texture properties
   * @return {WebGLTexture} the created texture
   */
  create: function(image, parameters) {
    if ("undefined" === typeof image || image === null) {
      return;
    }

    // make sure the parameters argument is an object
    parameters = parameters || {};

    // check to see if the texture hasn't been already created
    if ("undefined" !== typeof Tilt.$loadedTextures[image.src]) {
      return Tilt.$loadedTextures[image.src];
    }

    // make sure the image is power of two before binding to a texture
    var gl = Tilt.$gl,
      resz = Tilt.TextureUtils.resizeImageToPowerOfTwo(image, parameters),
      prev = gl.getParameter(gl.TEXTURE_BINDING_2D),
      width = image.width,
      height = image.height,

    // first, create the texture to hold the image data
    texture = gl.createTexture();

    // attach the image data to the newly create texture
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resz);

    // remember the width and the height
    texture.width = width;
    texture.height = height;

    // generate an id for the texture
    texture.id = this.$count++;

    // set the required texture params and do some cleanup
    this.setTextureParams(parameters);
    gl.bindTexture(gl.TEXTURE_2D, prev);

    // cache the current texture in a hash table, for easy future access
    if ("undefined" !== typeof image.src) {
      Tilt.$loadedTextures[image.src] = texture;
    }

    // cleanup
    gl = null;
    resz = null;
    prev = null;
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
    }
    else if ("linear" === parameters.minFilter && parameters.mipmap) {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.LINEAR);
    }

    // set the magnification filter
    if ("nearest" === parameters.magFilter) {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.NEAREST);
    }
    else if ("linear" === parameters.magFilter && parameters.mipmap) {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.LINEAR);
    }

    // set the wrapping on the x-axis for the texture
    if ("repeat" === parameters.wrapS) {
      gl.texParameteri(gl.TEXTURE_2D, wrapS, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, wrapS, gl.CLAMP_TO_EDGE);
    }

    // set the wrapping on the y-axis for the texture
    if ("repeat" === parameters.wrapT) {
      gl.texParameteri(gl.TEXTURE_2D, wrapT, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, wrapT, gl.CLAMP_TO_EDGE);
    }

    // generate mipmap if necessary
    if (parameters.mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  },

  /**
   * Scales an image to power of two width and height.
   * If the image already has power of two sizes, it is immediately returned.
   *
   * @param {Image} image: the image to be scaled
   * @param {Object} parameters: an object containing the following properties
   *  @param {Boolean} preserve: true if resize should be ignored
   *  @param {String} fill: optional, color to fill the transparent bits
   *  @param {String} stroke: optional, color to draw an image outline
   *  @param {Number} strokeWeight: optional, the width of the outline
   * @return {Image} the resized image
   */
  resizeImageToPowerOfTwo: function(image, parameters) {
    // make sure the parameters argument is an object
    parameters = parameters || {};

    var isChromePath = (image.src || "").indexOf("chrome://"),
      isPowerOfTwoWidth = Tilt.Math.isPowerOfTwo(image.width),
      isPowerOfTwoHeight = Tilt.Math.isPowerOfTwo(image.height),
      width, height, canvas, context;

    // first check if the image is not already power of two
    if (parameters.preserve || (
        isPowerOfTwoWidth && isPowerOfTwoHeight && isChromePath === -1)) {
      try {
        return image;
      }
      finally {
        image = null;
        parameters = null;
      }
    }

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
      // cleanup
      image = null;
      parameters = null;
      canvas = null;
      context = null;
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
  $count: 0
};
