/*
 * Texture.js - A WebGL texture wrapper
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
var EXPORTED_SYMBOLS = ["Tilt.Texture"];

/**
 * Texture constructor.
 * This wrapper creates a texture using an already initialized Image. To
 * create a texture using a remote image, use initTextureAt.
 *
 * @param {Image} image: the texture source image or canvas
 * @param {Object} parameters: an object containing the following properties
 *  @param {String} fill: optional, color to fill the transparent bits
 *  @param {String} stroke: optional, color to draw an outline
 *  @param {Number} strokeWeight: optional, the width of the outline
 *  @param {String} minFilter: either "nearest" or "linear"
 *  @param {String} magFilter: either "nearest" or "linear"
 *  @param {Boolean} mipmap: true if should generate mipmap
 *  @param {String} wrapS: either "repeat" or "clamp"
 *  @param {String} wrapT: either "repeat" or "clamp"
 * @return {Tilt.Texture} the newly created object
 */
Tilt.Texture = function(image, parameters) {

  /**
   * A reference to the WebGL texture object.
   */
  this.ref = null;

  /**
   * Each texture has an unique id assigned.
   */
  this.id = 0;

  /**
   * Variables specifying the width and height of the texture.
   * If these values are less than 0, the texture hasn't loaded yet.
   */
  this.width = -1;
  this.height = -1;

  /**
   * Specifies if the texture has loaded or not.
   * @return {Boolean} true if the texture has loaded, false if not
   */
  this.loaded = false;

  // if the image is specified in the constructor, initialize directly
  if ("object" === typeof image) {
    this.initTexture(image, parameters);
  } else if ("string" === typeof image) {
    this.initTextureAt(image, parameters);
  } else {
    Tilt.Console.error(Tilt.StringBundle.get("initTexture.source.error"));
  }

  // cleanup
  image = null;
  parameters = null;
};

Tilt.Texture.prototype = {

  /**
   * Initializes a texture from a pre-existing image or canvas.
   *
   * @param {Image} image: the texture source image or canvas
   * @param {Object} parameters: an object containing the texture properties
   */
  initTexture: function(image, parameters) {
    this.ref = Tilt.TextureUtils.create(image, parameters);

    // cache for faster access
    this.id = this.ref.id;
    this.width = this.ref.width;
    this.height = this.ref.height;
    this.loaded = true;

    delete this.ref.id;
    delete this.ref.width;
    delete this.ref.height;

    // cleanup
    image = null;
    parameters = null;
  },

  /**
   * Initializes a texture from a source, runs a callback function when ready.
   *
   * @param {String} imageSource: the texture source
   * @param {Object} parameters: an object containing the texture properties
   * @param {Function} readyCallback: function called when loading is finished
   */
  initTextureAt: function(imageSource, parameters, readyCallback) {
    // remember who we are
    var self = this,

    image = new Image(); // load the image from the source in an object
    image.src = imageSource;
    image.onload = function() {
      // the image has loaded, continue initialization as usual
      self.initTexture(image, parameters);

      // cleanup
      self = null;
      image = null;
      parameters = null;

      // if a callback function is specified, run it when initialization done
      if ("function" === typeof readyCallback) {
        readyCallback();
      }
    };
  },

  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    for (var i in this) {
      if ("function" === typeof this[i].destroy) {
        this[i].destroy();
      }
      this[i] = null;
    }
  }
};
