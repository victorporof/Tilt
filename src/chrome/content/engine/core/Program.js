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
var EXPORTED_SYMBOLS = ["Tilt.Program"];

/**
 * Program constructor, composed of a vertex and a fragment shader.
 * To create a program using remote sources, use initProgramAt.
 *
 * @param {String} vertShaderSrc: optional, the vertex shader source code
 * @param {String} fragShaderSrc: optional, the fragment shader source code
 * @return {Tilt.Program} the newly created object
 */
Tilt.Program = function(vertShaderSrc, fragShaderSrc) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Program", this);

  /**
   * A reference to the actual GLSL program.
   */
  this.$ref = null;

  /**
   * Each program has an unique id assigned.
   */
  this.$id = -1;

  /**
   * Two arrays: an attributes array property, containing all the attributes
   * and a uniforms array, containing all the uniforms. These variables are
   * automatically cached as string-value hashes.
   */
  this.$attributes = null;
  this.$uniforms = null;

  /**
   * Each program has an assigned object for caching all the current
   * attributes and uniforms at runtime, when using the shader.
   */
  this.$cache = {};
  this.$texcache = {};

  // if the sources are specified in the constructor, initialize directly
  if (arguments.length === 2) {
    this.initProgram(vertShaderSrc, fragShaderSrc);
  }
};

Tilt.Program.prototype = {

  /**
   * Initializes a shader program, using specified source code as strings.
   *
   * @param {String} vertShaderSrc: the vertex shader source code
   * @param {String} fragShaderSrc: the fragment shader source code
   */
  initProgram: function(vertShaderSrc, fragShaderSrc) {
    this.$ref = Tilt.GLSL.create(vertShaderSrc, fragShaderSrc);

    // cache for faster access
    this.$id = this.$ref.id;
    this.$attributes = this.$ref.attributes;
    this.$uniforms = this.$ref.uniforms;

    // cleanup
    this.$ref.id = null;
    this.$ref.attributes = null;
    this.$ref.uniforms = null;

    delete this.$ref.id;
    delete this.$ref.attributes;
    delete this.$ref.uniforms;
  },

  /**
   * Initializes a shader program, using sources located at a specific url.
   * If only two params are specified (the shader name and the readyCallback
   * function), then ".fs" and ".vs" extensions will be automatically used).
   *
   * @param {String} vertShaderURL: the vertex shader resource
   * @param {String} fragShaderURL: the fragment shader resource
   * @param {Function} readyCallback: the function called when loading is done
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
    Tilt.Xhr.requests([vertShaderURL, fragShaderURL], function(xhr) {
      // we obtain the sources for both the fragment and vertex shader, so
      // continue initialization as usual
      this.initProgram(xhr[0].responseText, xhr[1].responseText);

      // run a ready callback function when the program has initialized
      if ("function" === typeof readyCallback) {
        readyCallback();
      }
    }.bind(this));
  },

  /**
   * Uses the shader program as current one for the WebGL context; it also
   * enables vertex attributes necessary to enable when using this program.
   * This method also does some useful caching, as the function useProgram
   * could take quite a lot of time.
   */
  use: function() {
    var id = this.$id,
      gl, i;

    this.clearCache();
    this.clearTextureCache();

    // check if the program wasn't already active
    if (Tilt.$activeShader !== id) {
      Tilt.$activeShader = id;

      // cache the WebGL context variable
      // use the the program if it wasn't already set
      gl = Tilt.$gl;
      gl.useProgram(this.$ref);

      // check if the required vertex attributes aren't already set
      if (Tilt.$enabledAttributes < this.$attributes.length) {
        Tilt.$enabledAttributes = this.$attributes.length;

        // enable any necessary vertex attributes using the cache
        for (i in this.$attributes) {
          if (this.$attributes.hasOwnProperty(i) && i !== "length") {
            gl.enableVertexAttribArray(this.$attributes[i]);
          }
        }
      }
    }
  },

  /**
   * Binds a vertex buffer as an array buffer for a specific shader attribute.
   *
   * @param {String} attribute: the attribute name obtained from the shader
   * @param {Float32Array} buffer: the buffer to be bound
   */
  bindVertexBuffer: function(attribute, buffer) {
    // get the cached attribute value from the shader
    var gl = Tilt.$gl,
      attr = this.$attributes[attribute],
      size = buffer.itemSize;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.$ref);
    gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);
  },

  /**
   * Binds a uniform matrix to the current shader.
   *
   * @param {String} uniform: the uniform name to bind the variable to
   * @param {Float32Array} m: the matrix to be bound
   */
  bindUniformMatrix: function(uniform, m) {
    Tilt.$gl.uniformMatrix4fv(this.$uniforms[uniform], false, m);
  },

  /**
   * Binds a uniform vector of 4 elements to the current shader.
   *
   * @param {String} uniform: the uniform name to bind the variable to
   * @param {Float32Array} v: the vector to be bound
   */
  bindUniformVec4: function(uniform, v) {
    Tilt.$gl.uniform4fv(this.$uniforms[uniform], v);
  },

  /**
   * Binds a simple float element to the current shader.
   *
   * @param {String} uniform: the uniform name to bind the variable to
   * @param {Number} variable: the variable to be bound
   */
  bindUniformFloat: function(uniform, variable) {
    Tilt.$gl.uniform1f(this.$uniforms[uniform], variable);
  },

  /**
   * Binds a uniform texture for a sampler to the current shader.
   *
   * @param {String} sampler: the sampler name to bind the texture to
   * @param {Tilt.Texture} texture: the texture to be bound
   */
  bindTexture: function(sampler, texture, unit) {
    var gl = Tilt.$gl;

    gl.bindTexture(gl.TEXTURE_2D, texture.$ref);
    gl.uniform1i(this.$uniforms[sampler], 0);
  },

  /**
   * Clears any bound uniforms from the cache.
   */
  clearTextureCache: function() {
    this.$texcache = {};
  },

  /**
   * Clears any bound uniforms from the cache.
   */
  clearCache: function() {
    this.$cache = {};
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    try { Tilt.$gl.deleteShader(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};
