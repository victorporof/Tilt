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
var EXPORTED_SYMBOLS = ["Tilt.Texture"];

/**
 * Texture constructor.
 * This wrapper creates a texture using an already initialized Image. To
 * create a texture using a remote image, use initTextureAt.
 *
 * @param {Image} image: the texture source image or canvas
 * @param {Object} properties: an object containing the following properties
 *  @param {String} fill: optional, color to fill the transparent bits
 *  @param {String} stroke: optional, color to draw an outline
 *  @param {Number} strokeWeight: optional, the width of the outline
 *  @param {String} minFilter: either "nearest" or "linear"
 *  @param {String} magFilter: either "nearest" or "linear"
 *  @param {Boolean} mipmap: true if should generate mipmap
 *  @param {String} wrapS: either "repeat" or "clamp"
 *  @param {String} wrapT: either "repeat" or "clamp"
 *  @param {Function} onload: function function called when texture has loaded
 */
Tilt.Texture = function(image, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Texture", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * A reference to the WebGL texture object.
   */
  this.$ref = null;

  /**
   * Each texture has an unique id assigned.
   */
  this.$id = -1;

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

  /**
   * Function to be called when the texture has finished loading.
   */
  this.onload = properties.onload;

  // if the image is specified in the constructor, initialize directly
  if ("object" === typeof image) {
    this.initTexture(image, properties);
  }
  else if ("string" === typeof image) {
    this.initTextureAt(image, properties);
  }
  else {
    Tilt.Console.error(Tilt.StringBundle.get("initTexture.source.error"));
  }

  // cleanup
  image = null;
  properties = null;
};

Tilt.Texture.prototype = {

  /**
   * Initializes a texture from a pre-existing image or canvas.
   *
   * @param {Image | HTMLCanvasElement} image: the source image or canvas
   * @param {Object} parameters: an object containing the texture properties
   */
  initTexture: function(image, parameters) {
    this.$ref = Tilt.TextureUtils.create(image, parameters);

    if ("undefined" !== typeof this.$ref && this.$ref !== null) {
      // cache for faster access
      this.$id = this.$ref.id;
      this.width = this.$ref.width;
      this.height = this.$ref.height;
      this.loaded = true;

      // if the onload event function is specified, call it now
      if ("function" === typeof this.onload) {
        this.onload();
      }

      // cleanup
      this.$ref.id = null;
      this.$ref.width = null;
      this.$ref.height = null;

      delete this.$ref.id;
      delete this.$ref.width;
      delete this.$ref.height;
    }

    this.onload = null;
    delete this.onload;

    image = null;
    parameters = null;
  },

  /**
   * Initializes a texture from a source, runs a callback function when ready.
   *
   * @param {String} imageSource: the texture source
   * @param {Object} parameters: an object containing the texture properties
   */
  initTextureAt: function(imageSource, parameters, readyCallback) {
    var image = new Image(); // load the image from the source in an object
    image.src = imageSource;
    image.onload = function() {
      // the image has loaded, continue initialization as usual
      this.initTexture(image, parameters);

      // cleanup
      image = null;
      parameters = null;
    }.bind(this);
  },

  /**
   * Updates a region of a texture with another image.
   *
   * @param {Image | HTMLCanvasElement} image: the source image or canvas
   * @param {Number} x: the x offset
   * @param {Number} y: the y offset
   */
  updateSubImage2D: function(img, x, y) {
    if (this.width === img.width && this.height === img.height && x && y) {
      x = 0;
      y = 0;
    }

    var gl = Tilt.$gl;
    gl.bindTexture(gl.TEXTURE_2D, this.$ref);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, img);
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    try { Tilt.$gl.deleteTexture(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};
