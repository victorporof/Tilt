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
 * The Initial Developer of the Original Code is Victor Porof.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
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
var EXPORTED_SYMBOLS = ["Tilt.GLSL"];

/**
 * Utility functions for handling GLSL shaders and programs.
 */
Tilt.GLSL = {

  /**
   * Initializes a shader program, using specified source code as strings,
   * Returning the newly created shader program, by compiling and linking the
   * vertex and fragment shader.
   *
   * @param {String} vertShaderSrc: the vertex shader source code
   * @param {String} fragShaderSrc: the fragment shader source code
   */
  create: function(vertShaderSrc, fragShaderSrc) {
    // compile the two shaders
    var vertShader = this.compile(vertShaderSrc, "x-shader/x-vertex"),
      fragShader = this.compile(fragShaderSrc, "x-shader/x-fragment");

    // link the two shaders to form a program
    return this.link(vertShader, fragShader);
  },

  /**
   * Compiles a shader source of a specific type, either vertex or fragment.
   *
   * @param {String} shaderSource: the source code for the shader
   * @param {String} shaderType: the shader type ("x-vertex" or "x-fragment")
   * @return {WebGLShader} the compiled shader
   */
  compile: function(shaderSource, shaderType) {
    var gl = Tilt.$gl,
      shader, status;

    // make sure the shader source is valid
    if ("string" !== typeof shaderSource || shaderSource.length < 1) {
      Tilt.Console.error(Tilt.StringBundle.get("compileShader.source.error"));
      return null;
    }

    // also make sure the necessary shader mime type is valid
    if (shaderType === "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    } else if (shaderType === "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else {
      Tilt.Console.error(
      Tilt.StringBundle.format("compileShader.type.error"), [shaderSource]);

      return null;
    }

    // set the shader source and compile it
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    // remember the shader source (useful for debugging and caching)
    shader.src = shaderSource;

    // verify the compile status; if something went wrong, log the error
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      status = gl.getShaderInfoLog(shader);

      Tilt.Console.error(
      Tilt.StringBundle.format("compileShader.compile.error"), [status]);

      return null;
    }

    return shader;
  },

  /**
   * Links two compiled vertex or fragment shaders together to form a program.
   *
   * @param {WebGLShader} vertShader: the compiled vertex shader
   * @param {WebGLShader} fragShader: the compiled fragment shader
   * @return {WebGLProgram} the newly created and linked shader program
   */
  link: function(vertShader, fragShader) {
    var gl = Tilt.$gl,
      program, status, source, data;

    // create a program and attach the compiled vertex and fragment shaders
    program = gl.createProgram();

    // attach the vertex and fragment shaders to the program
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    // verify the link status; if something went wrong, log the error
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      status = gl.getProgramInfoLog(program);

      Tilt.Console.error(
      Tilt.StringBundle.format("linkProgram.error", [status]));

      return null;
    }

    // generate an id for the program
    program.id = this.$count++;

    // create an array of all the attributes, uniforms & words from the shader
    // which will be searched for to automatically cache the shader variables
    source = [vertShader.src, fragShader.src].join(" ");
    data = source.replace(/#.*|[(){};,]/g, " ").split(" ");

    return this.shaderIOCache(program, data);
  },

  /**
   * Gets a shader attribute location from a program.
   *
   * @param {WebGLProgram} program: the shader program
   * @param {String} attribute: the attribute name
   * @return {Number} the attribute location from the program
   */
  shaderAttribute: function(program, attribute) {
    return Tilt.$gl.getAttribLocation(program, attribute);
  },

  /**
   * Gets a shader uniform location from a program.
   *
   * @param {WebGLProgram} program: the shader program
   * @param {String} uniform: the uniform name
   * @return {WebGLUniformLocation} the uniform object from the program
   */
  shaderUniform: function(program, uniform) {
    return Tilt.$gl.getUniformLocation(program, uniform);
  },

  /**
   * Gets a generic shader variable (attribute or uniform) from a program.
   * If an attribute is found, the attribute location will be returned.
   * Otherwise, the uniform will be searched and returned if found.
   *
   * @param {WebGLProgram} program: the shader program
   * @param {String} variable: the attribute or uniform name
   * @return {Number} | {WebGLUniformLocation} the attribute or uniform
   */
  shaderIO: function(program, variable) {
    if ("string" === typeof variable) {
      // careful! weird stuff happens on Windows with empty strings
      if (variable.length < 1) {
        return null;
      }

      var io;
      // try to get a shader attribute
      if ((io = this.shaderAttribute(program, variable)) >= 0) {
        return io;
      }
      // if unavailable, search for a shader uniform
      else {
        return this.shaderUniform(program, variable);
      }
    }

    return null;
  },

  /**
   * Caches shader attributes and uniforms as properties for a program object.
   *
   * @param {WebGLProgram} program: the shader program used for caching
   * @param {Array} variables: string array with variable names
   * @return {WebGLProgram} the same program
   */
  shaderIOCache: function(program, variables) {
    var i, len, param, io;

    // make sure the attributes and uniforms cache objects are created
    program.attributes = {};
    program.attributes.length = 0;
    program.uniforms = {};

    // pass through each element in the variables array
    for (i = 0, len = variables.length; i < len; i++) {
      // try to get a shader variable from the program
      param = variables[i];
      io = this.shaderIO(program, param);

      // if we get an attribute location, store it
      if ("number" === typeof io) {
        // bind the new parameter only if it was not already defined
        if ("undefined" === typeof program.attributes[param]) {
          program.attributes[param] = io;
          program.attributes.length++;
        }
      }

      // if we get a WebGL uniform object, store it
      if (("object" === typeof io && io instanceof WebGLUniformLocation)) {
        // bind the new parameter only if it was not already defined
        if ("undefined" === typeof program.uniforms[param]) {
          program.uniforms[param] = io;
        }
      }
    }

    return program;
  },

  /**
   * The total number of shaders created.
   */
  $count: 0
};
