/*
 * Program.js - A wrapper for a GLSL program
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
var EXPORTED_SYMBOLS = ["Tilt.Program"];

/**
 * Program constructor.
 * To create a program using remote sources, use initProgramAt.
 *
 * @param {String} vertShaderSrc: optional, the vertex shader source code
 * @param {String} fragShaderSrc: optional, the fragment shader source code
 * @return {Tilt.Program} the newly created object
 */
Tilt.Program = function(vertShaderSrc, fragShaderSrc) {

	/**
	 * A reference to the actual GLSL program.
	 */
	this.ref = null;

	/**
	 * Each program has an unique id assigned.
	 */
	this.id = 0;

	/**
	 * Two arrays: an attributes array property, containing all the attributes
	 * and a uniforms array, containing all the uniforms. These variables are
	 * automatically cached as string-value hashes.
	 */
	this.attributes = null;
	this.uniforms = null;

	/**
	 * Each program has an assigned object for caching all the current 
	 * attributes and uniforms at runtime, when using the shader.
	 */
	this.cache = {};

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
		this.ref = Tilt.GLSL.create(vertShaderSrc, fragShaderSrc);

		// cache for faster access
		this.id = this.ref.id;
		this.attributes = this.ref.attributes;
		this.uniforms = this.ref.uniforms;

		// cleanup
		this.ref.attributes = null;
		this.ref.uniforms = null;

		delete this.ref.id;
		delete this.ref.attributes;
		delete this.ref.uniforms;
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

		// remember who we are
		var self = this;

		// request the shader sources asynchronously
		Tilt.Xhr.requests([vertShaderURL, fragShaderURL], function(xhr) {
			// we obtain the sources for both the fragment and vertex shader, so
			// continue initialization as usual
			self.initProgram(xhr[0].responseText, xhr[1].responseText);
			xhr = null;

			if ("function" === typeof readyCallback) {
				readyCallback();
			}
		});
	},

	/**
	 * Uses the shader program as current one for the WebGL context; it also
	 * enables vertex attributes necessary to enable when using this program.
	 * This method also does some useful caching, as the function useProgram
	 * could take quite a lot of time.
	 */
	use: function() {
		// check if the program wasn't already active
		if (Tilt.$activeShader !== this.id) {
			Tilt.$activeShader = this.id;

			// cache the WebGL context variable
			var gl = Tilt.$gl;

			// use the the program if it wasn't already set
			gl.useProgram(this.ref);

			// check if the required vertex attributes aren't already set
			if (Tilt.$enabledAttributes < this.attributes.length) {
				Tilt.$enabledAttributes = this.attributes.length;

				// enable any necessary vertex attributes using the cache
				for (var i in this.attributes) {
					if (this.attributes.hasOwnProperty(i) && i !== "length") {
						gl.enableVertexAttribArray(this.attributes[i]);
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
			attr = this.attributes[attribute],
			size = buffer.itemSize;

		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.ref);
		gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);

		buffer = null;
		gl = null;
	},

	/**
	 * Binds a uniform matrix to the current shader.
	 *
	 * @param {String} uniform: the uniform name to bind the variable to
	 * @param {Float32Array} m: the matrix to be bound
	 */
	bindUniformMatrix: function(uniform, m) {
		var m0 = m[0] + m[1] + m[2],
			m1 = m[4] + m[5] + m[6],
			m2 = m[8] + m[9] + m[10],
			m3 = m[12] + m[13] + m[14],
			hit = m0 + m1 + m2 + m3;

		// check the cache to see if this uniform wasn't already set
		if (this.cache[uniform] !== hit) {
			this.cache[uniform] = hit;
			Tilt.$gl.uniformMatrix4fv(this.uniforms[uniform], false, m);
		}
		m = null;
	},

	/**
	 * Binds a uniform vector of 4 elements to the current shader.
	 *
	 * @param {String} uniform: the uniform name to bind the variable to
	 * @param {Float32Array} v: the vector to be bound
	 */
	bindUniformVec4: function(uniform, v) {
		var a = v[3] * 255,
			r = v[0] * 255,
			g = v[1] * 255,
			b = v[2] * 255,
			hit = a << 24 | r << 16 | g << 8 | b;

		// check the cache to see if this uniform wasn't already set
		if (this.cache[uniform] !== hit) {
			this.cache[uniform] = hit;
			Tilt.$gl.uniform4fv(this.uniforms[uniform], v);
		}
		v = null;
	},

	/**
	 * Binds a simple float element to the current shader.
	 *
	 * @param {String} uniform: the uniform name to bind the variable to
	 * @param {Number} variable: the variable to be bound
	 */
	bindUniformFloat: function(uniform, variable) {
		// check the cache to see if this uniform wasn't already set
		if (this.cache[uniform] !== variable) {
			this.cache[uniform] = variable;
			Tilt.$gl.uniform1f(this.uniforms[uniform], variable);
		}
	},

	/**
	 * Binds a uniform texture for a sampler to the current shader.
	 *
	 * @param {String} sampler: the sampler name to bind the texture to
	 * @param {Tilt.Texture} texture: the texture to be bound
	 */
	bindTexture: function(sampler, texture) {
		// check the cache to see if this texture wasn't already set
		if (this.cache[sampler] !== texture.id) {
			this.cache[sampler] = texture.id;

			// cache the WebGL context variable
			var gl = Tilt.$gl;

			gl.bindTexture(gl.TEXTURE_2D, texture.ref);
			gl.uniform1i(this.uniforms[sampler], 0);
		}
		texture = null;
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
