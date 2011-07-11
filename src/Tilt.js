/*
 * IndexBuffer.js - A WebGL ELEMENT_ARRAY_BUFFER Uint16Array buffer
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
var EXPORTED_SYMBOLS = ["Tilt.VertexBuffer", "Tilt.IndexBuffer"];

/**
 * Vertex buffer constructor.
 *
 * @param {Tilt.Renderer} renderer: an instance of Tilt.Renderer
 * @param {Array} elementsArray: an array of floats
 * @param {Number} itemSize: how many items create a block
 * @param {Number} numItems: optional, how many items to use from the array
 * @return {Tilt.VertexBuffer} the newly created object
 */
Tilt.VertexBuffer = function(elementsArray, itemSize, numItems) {

  /**
   * The array buffer.
   */
  this.ref = null;

  /**
   * Variables defining the internal structure of the buffer.
   */
  this.itemSize = 0;
  this.numItems = 0;

  /**
   * This is an array-like object.
   * This means each element is accessible via an index.
   */
  this.length = 0;

  // if the array is specified in the constructor, initialize directly
  if ("undefined" !== typeof elementsArray) {
    this.initBuffer(elementsArray, itemSize, numItems);
  }

  // cleanup
  elementsArray = null;
};

Tilt.VertexBuffer.prototype = {

  /**
   * Initializes buffer data to be used for drawing, using an array of floats.
   * The "numItems" param can be specified to use only a portion of the array.
   *
   * @param {Array} elementsArray: an array of floats
   * @param {Number} itemSize: how many items create a block
   * @param {Number} numItems: optional, how many items to use from the array
   */
  initBuffer: function(elementsArray, itemSize, numItems) {
    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length / itemSize;
    }

    // create the Float32Array using the elements array
    var array = new Float32Array(elementsArray),
      gl = Tilt.$gl;

    // create an array buffer and bind the elements as a Float32Array
    this.ref = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ref);
    gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

    // remember some properties, useful when binding the buffer to a shader
    this.itemSize = itemSize;
    this.numItems = numItems;
    this.length = elementsArray.length;

    for (var i = 0; i < elementsArray.length; i++) {
      this[i] = elementsArray[i];
    }

    // cleanup
    elementsArray = null;
    array = null;
    gl = null;
  },

  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    for (var i in this) {
      this[i] = null;
      delete this[i];
    }
  }
};

/**
 * IndexBuffer constructor.
 *
 * @param {Array} elementsArray: an array of unsigned integers
 * @param {Number} numItems: how many items to use from the array
 * @return {Tilt.IndexBuffer} the newly created object
 */
Tilt.IndexBuffer = function(elementsArray, numItems) {

  /**
   * The element array buffer.
   */
  this.ref = null;

  /**
   * This is an array-like object.
   * This means each element is accessible via an index.
   */
  this.length = 0;

  /**
   * Variables defining the internal structure of the buffer.
   */
  this.itemSize = 0;
  this.numItems = 0;

  // if the array is specified in the constructor, initialize directly
  if ("undefined" !== typeof elementsArray) {
    this.initBuffer(elementsArray, numItems);
  }

  // cleanup
  elementsArray = null;
};

Tilt.IndexBuffer.prototype = {

  /**
   * Initializes a buffer of vertex indices, using an array of unsigned ints.
   * The item size will automatically default to 1, and the "numItems" will be
   * equal to the number of items in the array if not specified.
   *
   * @param {Array} elementsArray: an array of unsigned integers
   * @param {Number} numItems: how many items to use from the array
   */
  initBuffer: function(elementsArray, numItems) {
    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length;
    }

    // create the Uint16Array using the elements array
    var array = new Uint16Array(elementsArray),
      gl = Tilt.$gl;

    // create an array buffer and bind the elements as a Uint16Array
    this.ref = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ref);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);

    // remember some properties, useful when binding the buffer to a shader
    this.itemSize = 1;
    this.numItems = numItems;
    this.length = elementsArray.length;

    for (var i = 0; i < elementsArray.length; i++) {
      this[i] = elementsArray[i];
    }

    // cleanup
    elementsArray = null;
    array = null;
    gl = null;
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
/*
 * Cache.js - The cached variables from the engine
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
var EXPORTED_SYMBOLS = ["Tilt.activeShader", "Tilt.enabledAttributes"];

/* All cached variables begin with the $ sign, for easy spotting
 * ------------------------------------------------------------------------ */

/**
 * The current active WebGL context.
 */
Tilt.$gl = null;

/**
 * The current active Tilt renderer.
 */
Tilt.$renderer = null;

/**
 * Represents the current active shader, identified by an id.
 */
Tilt.$activeShader = -1;

/**
 * Represents the current enabled attributes.
 */
Tilt.$enabledAttributes = -1;

/**
 * Clears the cache and sets all the variables to default.
 */
Tilt.clearCache = function() {
  Tilt.$gl = null;
  Tilt.$renderer = null;
  Tilt.$activeShader = -1;
  Tilt.$enabledAttributes = -1;
};
/*
 * Mesh.js - An object representing a drawable mesh
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
var EXPORTED_SYMBOLS = ["Tilt.Mesh"];

/**
 * Mesh constructor.
 *
 * @param {Object} parameters: an object containing the following properties
 *  @param {Tilt.VertexBuffer} vertices: the vertices buffer (x, y and z)
 *  @param {Tilt.VertexBuffer} texCoord: the texture coordinates buffer (u, v)
 *  @param {Tilt.VertexBuffer} normals: the normals buffer (m, n, p)
 *  @param {Tilt.IndexBuffer} indices: indices for the passed vertices buffer
 *  @param {String} color: the color to be used by the shader if required
 *  @param {Tilt.Texture} texture: optional texture to be used by the shader
 *  @param {Number} drawMode: WebGL enum, like tilt.TRIANGLES
 * @param {Function} draw: optional function to handle custom drawing
 */
Tilt.Mesh = function(parameters, draw) {

  /**
   * Retain each parameters for easy access.
   */
  for (var i in parameters) {
    this[i] = parameters[i];
  }

  // the color should be a [r, g, b, a] array, check this now
  if ("string" === typeof this.color) {
    this.color = Tilt.Math.hex2rgba(this.color);
  } else if ("undefined" === typeof this.color) {
    this.color = [1, 1, 1, 1];
  }

  // the draw mode should be valid, default to TRIANGLES if unspecified
  if ("undefined" === typeof this.drawMode) {
    this.drawMode = Tilt.$renderer.TRIANGLES;
  }

  // if the draw call is specified in the constructor, overwrite directly
  if ("function" === typeof draw) {
    this.draw = draw;
  }
};

Tilt.Mesh.prototype = {

  /**
   * Draws a custom mesh, using only the built-in shaders.
   * For more complex techniques, create your own shaders and drawing logic.
   * Overwrite this function to handle custom drawing.
   */
  draw: function() {
    // cache some properties for easy access
    var tilt = Tilt.$renderer,
      vertices = this.vertices,
      texCoord = this.texCoord,
      normals = this.normals,
      indices = this.indices,
      color = this.color,
      texture = this.texture,
      drawMode = this.drawMode;

    // use the necessary shader
    if (texture) {
      tilt.useTextureShader(vertices, texCoord, color, texture);
    } else {
      tilt.useColorShader(vertices, color);
    }

    // draw the vertices as indexed elements or simple arrays
    if (indices) {
      tilt.drawIndexedVertices(drawMode, indices);
    } else {
      tilt.drawVertices(drawMode, vertices.numItems);
    }

    // TODO: use the normals buffer, add some lighting
    // save the current model view and projection matrices
    this.mvMatrix = mat4.create(tilt.mvMatrix);
    this.projMatrix = mat4.create(tilt.projMatrix);
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
/*
 * ProgramUtils.js - Utility functions for handling GLSL shaders and programs
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
    program.id = ++this.count;

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
    var io;
    // try to get a shader attribute
    if ((io = this.shaderAttribute(program, variable)) >= 0) {
      return io;
    }
    // if unavailable, search for a shader uniform
    else {
      return this.shaderUniform(program, variable);
    }
  },

  /**
   * Caches shader attributes and uniforms as properties for a program object.
   *
   * @param {WebGLProgram} program: the shader program used for caching
   * @param {Array} variables: string array with variable names
   * @return {WebGLProgram} the same program
   */
  shaderIOCache: function(program, variables) {
    var i, length, param, io;

    // make sure the attributes and uniforms cache objects are created
    program.attributes = {};
    program.attributes.length = 0;
    program.uniforms = {};

    // pass through each element in the variables array
    for (i = 0, length = variables.length; i < length; i++) {
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
  count: 0
};
/*
 * RequestAnimFrame.js - Provides requestAnimationFrame in a cross browser way
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
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback, element) {
           window.setTimeout(callback, 1000 / 60);
         };
})();/*
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
/*
 * Cube.js - A simple cube primitive geometry
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
var EXPORTED_SYMBOLS = ["Tilt.Cube"];

/**
 * Tilt.Cube constructor.
 *
 * @param {Number} width: the width of the cube
 * @param {Number} height: the height of the cube
 * @param {Number} depth: the depth of the cube
 */
Tilt.Cube = function(width, height, depth) {
  // make sure the width, height and depth are valid number values
  width = width || 1;
  height = height || 1;
  depth = depth || 1;

  /**
   * Buffer of 3-component vertices (x, y, z) as the corners of a cube.
   */
  this.vertices = new Tilt.VertexBuffer([
    -0.5 * width, -0.5 * height,  0.5 * depth, /* front */
     0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth, /* bottom */
     0.5 * width,  0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width, -0.5 * height, -0.5 * depth, /* back */
    -0.5 * width, -0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
    -0.5 * width, -0.5 * height, -0.5 * depth, /* top */
     0.5 * width, -0.5 * height, -0.5 * depth,
     0.5 * width, -0.5 * height,  0.5 * depth,
    -0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width, -0.5 * height,  0.5 * depth, /* right */
     0.5 * width, -0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width, -0.5 * height, -0.5 * depth, /* left */
    -0.5 * width, -0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth], 3);

  /**
   * Buffer of 2-component texture coordinates (u, v) for the cube.
   */
  this.texCoord = new Tilt.VertexBuffer([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1], 2);

  /**
   * Vertex indices for the cube vertices, defining the order for which
   * these points can create a cube from triangles.
   */
  this.indices = new Tilt.IndexBuffer([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23]);
};

Tilt.Cube.prototype = {

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
/*
 * CubeWireframe.js - A simple cube primitive wireframe
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
var EXPORTED_SYMBOLS = ["Tilt.CubeWireframe"];

/**
 * Tilt.CubeWireframe constructor.
 *
 * @param {number} width: the width of the cube
 * @param {number} height: the height of the cube
 * @param {number} depth: the depth of the cube
 */
Tilt.CubeWireframe = function(width, height, depth) {
  // make sure the width, height and depth are valid number values
  width = width || 1;
  height = height || 1;
  depth = depth || 1;

  /**
   * Buffer of 3-component vertices (x, y, z) as the outline of a cube.
   */
  this.vertices = new Tilt.VertexBuffer([
    -0.5 * width, -0.5 * height,  0.5 * depth, /* front */
     0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
     0.5 * width, -0.5 * height, -0.5 * depth, /* back */
    -0.5 * width, -0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth], 3);

  /**
   * Vertex indices for the cube vertices, defining the order for which
   * these points can create a wireframe cube from lines.
   */
  this.indices = new Tilt.IndexBuffer([
    0, 1, 1, 2, 2, 3, 3, 0, /* front */
    4, 5, 5, 6, 6, 7, 7, 4, /* back */
    0, 5, 1, 4,
    2, 7, 3, 6]);
};

Tilt.CubeWireframe.prototype = {

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
/*
 * Cube.js - A simple rectangle primitive geometry
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
var EXPORTED_SYMBOLS = ["Tilt.Rectangle"];

/**
 * Tilt.Rectangle constructor.
 */
Tilt.Rectangle = function(width, height, depth) {

  /**
   * Buffer of 2-component vertices (x, y) as the corners of a rectangle.
   */
  this.vertices = new Tilt.VertexBuffer([0, 0, 1, 0, 0, 1, 1, 1], 2);

  /**
   * Buffer of 2-component texture coordinates (u, v) for the rectangle.
   */
  this.texCoord = new Tilt.VertexBuffer([0, 0, 1, 0, 0, 1, 1, 1], 2);
};

Tilt.Rectangle.prototype = {

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
/*
 * Cube.js - A simple rectangle primitive wireframe
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
var EXPORTED_SYMBOLS = ["Tilt.RectangleWireframe"];

/**
 * Tilt.RectangleWireframe constructor.
 */
Tilt.RectangleWireframe = function() {

  /**
   * Buffer of 2-component vertices (x, y) as the outline of a rectangle.
   */
  this.vertices = new Tilt.VertexBuffer([0, 0, 1, 0, 1, 1, 0, 1, 0, 0], 2);
};

Tilt.RectangleWireframe.prototype = {

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
/* 
 * glMatrix.js - High performance matrix and vector operations for WebGL
 * version 0.9.6
 */
 
/*
 * Copyright (c) 2011 Brandon Jones
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

var glMatrixArrayType, vec3, mat3, mat4, quat4;

// Fallback for systems that don't support WebGL
if(typeof Float32Array != 'undefined') {
  glMatrixArrayType = Float32Array;
} else if(typeof WebGLFloatArray != 'undefined') {
  glMatrixArrayType = WebGLFloatArray; // This is officially deprecated and should dissapear in future revisions.
} else {
  glMatrixArrayType = Array;
}

/*
 * vec3 - 3 Dimensional Vector
 */
var vec3 = {};

/*
 * vec3.create
 * Creates a new instance of a vec3 using the default array type
 * Any javascript array containing at least 3 numeric elements can serve as a vec3
 *
 * Params:
 * vec - Optional, vec3 containing values to initialize with
 *
 * Returns:
 * New vec3
 */
vec3.create = function(vec) {
  var dest = new glMatrixArrayType(3);
  
  if(vec) {
    dest[0] = vec[0];
    dest[1] = vec[1];
    dest[2] = vec[2];
  }
  
  return dest;
};

/*
 * vec3.set
 * Copies the values of one vec3 to another
 *
 * Params:
 * vec - vec3 containing values to copy
 * dest - vec3 receiving copied values
 *
 * Returns:
 * dest
 */
vec3.set = function(vec, dest) {
  dest[0] = vec[0];
  dest[1] = vec[1];
  dest[2] = vec[2];
  
  return dest;
};

/*
 * vec3.add
 * Performs a vector addition
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.add = function(vec, vec2, dest) {
  if(!dest || vec == dest) {
    vec[0] += vec2[0];
    vec[1] += vec2[1];
    vec[2] += vec2[2];
    return vec;
  }
  
  dest[0] = vec[0] + vec2[0];
  dest[1] = vec[1] + vec2[1];
  dest[2] = vec[2] + vec2[2];
  return dest;
};

/*
 * vec3.subtract
 * Performs a vector subtraction
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.subtract = function(vec, vec2, dest) {
  if(!dest || vec == dest) {
    vec[0] -= vec2[0];
    vec[1] -= vec2[1];
    vec[2] -= vec2[2];
    return vec;
  }
  
  dest[0] = vec[0] - vec2[0];
  dest[1] = vec[1] - vec2[1];
  dest[2] = vec[2] - vec2[2];
  return dest;
};

/*
 * vec3.negate
 * Negates the components of a vec3
 *
 * Params:
 * vec - vec3 to negate
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.negate = function(vec, dest) {
  if(!dest) { dest = vec; }
  
  dest[0] = -vec[0];
  dest[1] = -vec[1];
  dest[2] = -vec[2];
  return dest;
};

/*
 * vec3.scale
 * Multiplies the components of a vec3 by a scalar value
 *
 * Params:
 * vec - vec3 to scale
 * val - Numeric value to scale by
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.scale = function(vec, val, dest) {
  if(!dest || vec == dest) {
    vec[0] *= val;
    vec[1] *= val;
    vec[2] *= val;
    return vec;
  }
  
  dest[0] = vec[0]*val;
  dest[1] = vec[1]*val;
  dest[2] = vec[2]*val;
  return dest;
};

/*
 * vec3.normalize
 * Generates a unit vector of the same direction as the provided vec3
 * If vector length is 0, returns [0, 0, 0]
 *
 * Params:
 * vec - vec3 to normalize
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.normalize = function(vec, dest) {
  if(!dest) { dest = vec; }
  
  var x = vec[0], y = vec[1], z = vec[2];
  var len = Math.sqrt(x*x + y*y + z*z);
  
  if (!len) {
    dest[0] = 0;
    dest[1] = 0;
    dest[2] = 0;
    return dest;
  } else if (len == 1) {
    dest[0] = x;
    dest[1] = y;
    dest[2] = z;
    return dest;
  }
  
  len = 1 / len;
  dest[0] = x*len;
  dest[1] = y*len;
  dest[2] = z*len;
  return dest;
};

/*
 * vec3.cross
 * Generates the cross product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.cross = function(vec, vec2, dest){
  if(!dest) { dest = vec; }
  
  var x = vec[0], y = vec[1], z = vec[2];
  var x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];
  
  dest[0] = y*z2 - z*y2;
  dest[1] = z*x2 - x*z2;
  dest[2] = x*y2 - y*x2;
  return dest;
};

/*
 * vec3.length
 * Caclulates the length of a vec3
 *
 * Params:
 * vec - vec3 to calculate length of
 *
 * Returns:
 * Length of vec
 */
vec3.length = function(vec){
  var x = vec[0], y = vec[1], z = vec[2];
  return Math.sqrt(x*x + y*y + z*z);
};

/*
 * vec3.dot
 * Caclulates the dot product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 *
 * Returns:
 * Dot product of vec and vec2
 */
vec3.dot = function(vec, vec2){
  return vec[0]*vec2[0] + vec[1]*vec2[1] + vec[2]*vec2[2];
};

/*
 * vec3.direction
 * Generates a unit vector pointing from one vector to another
 *
 * Params:
 * vec - origin vec3
 * vec2 - vec3 to point to
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.direction = function(vec, vec2, dest) {
  if(!dest) { dest = vec; }
  
  var x = vec[0] - vec2[0];
  var y = vec[1] - vec2[1];
  var z = vec[2] - vec2[2];
  
  var len = Math.sqrt(x*x + y*y + z*z);
  if (!len) { 
    dest[0] = 0; 
    dest[1] = 0; 
    dest[2] = 0;
    return dest; 
  }
  
  len = 1 / len;
  dest[0] = x * len; 
  dest[1] = y * len; 
  dest[2] = z * len;
  return dest; 
};

/*
 * vec3.lerp
 * Performs a linear interpolation between two vec3
 *
 * Params:
 * vec - vec3, first vector
 * vec2 - vec3, second vector
 * lerp - interpolation amount between the two inputs
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.lerp = function(vec, vec2, lerp, dest){
    if(!dest) { dest = vec; }
    
    dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
    dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
    dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);
    
    return dest;
}

/*
 * vec3.str
 * Returns a string representation of a vector
 *
 * Params:
 * vec - vec3 to represent as a string
 *
 * Returns:
 * string representation of vec
 */
vec3.str = function(vec) {
  return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']'; 
};

/*
 * mat3 - 3x3 Matrix
 */
var mat3 = {};

/*
 * mat3.create
 * Creates a new instance of a mat3 using the default array type
 * Any javascript array containing at least 9 numeric elements can serve as a mat3
 *
 * Params:
 * mat - Optional, mat3 containing values to initialize with
 *
 * Returns:
 * New mat3
 */
mat3.create = function(mat) {
  var dest = new glMatrixArrayType(9);
  
  if(mat) {
    dest[0] = mat[0];
    dest[1] = mat[1];
    dest[2] = mat[2];
    dest[3] = mat[3];
    dest[4] = mat[4];
    dest[5] = mat[5];
    dest[6] = mat[6];
    dest[7] = mat[7];
    dest[8] = mat[8];
  }
  
  return dest;
};

/*
 * mat3.set
 * Copies the values of one mat3 to another
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - mat3 receiving copied values
 *
 * Returns:
 * dest
 */
mat3.set = function(mat, dest) {
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[3];
  dest[4] = mat[4];
  dest[5] = mat[5];
  dest[6] = mat[6];
  dest[7] = mat[7];
  dest[8] = mat[8];
  return dest;
};

/*
 * mat3.identity
 * Sets a mat3 to an identity matrix
 *
 * Params:
 * dest - mat3 to set
 *
 * Returns:
 * dest
 */
mat3.identity = function(dest) {
  dest[0] = 1;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 1;
  dest[5] = 0;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = 1;
  return dest;
};

/*
 * mat4.transpose
 * Transposes a mat3 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat3 to transpose
 * dest - Optional, mat3 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat3.transpose = function(mat, dest) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if(!dest || mat == dest) { 
    var a01 = mat[1], a02 = mat[2];
    var a12 = mat[5];
    
        mat[1] = mat[3];
        mat[2] = mat[6];
        mat[3] = a01;
        mat[5] = mat[7];
        mat[6] = a02;
        mat[7] = a12;
    return mat;
  }
  
  dest[0] = mat[0];
  dest[1] = mat[3];
  dest[2] = mat[6];
  dest[3] = mat[1];
  dest[4] = mat[4];
  dest[5] = mat[7];
  dest[6] = mat[2];
  dest[7] = mat[5];
  dest[8] = mat[8];
  return dest;
};

/*
 * mat3.toMat4
 * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat3.toMat4 = function(mat, dest) {
  if(!dest) { dest = mat4.create(); }
  
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = 0;

  dest[4] = mat[3];
  dest[5] = mat[4];
  dest[6] = mat[5];
  dest[7] = 0;

  dest[8] = mat[6];
  dest[9] = mat[7];
  dest[10] = mat[8];
  dest[11] = 0;

  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  
  return dest;
}

/*
 * mat3.str
 * Returns a string representation of a mat3
 *
 * Params:
 * mat - mat3 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat3.str = function(mat) {
  return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + 
    ', ' + mat[3] + ', '+ mat[4] + ', ' + mat[5] + 
    ', ' + mat[6] + ', ' + mat[7] + ', '+ mat[8] + ']';
};

/*
 * mat4 - 4x4 Matrix
 */
var mat4 = {};

/*
 * mat4.create
 * Creates a new instance of a mat4 using the default array type
 * Any javascript array containing at least 16 numeric elements can serve as a mat4
 *
 * Params:
 * mat - Optional, mat4 containing values to initialize with
 *
 * Returns:
 * New mat4
 */
mat4.create = function(mat) {
  var dest = new glMatrixArrayType(16);
  
  if(mat) {
    dest[0] = mat[0];
    dest[1] = mat[1];
    dest[2] = mat[2];
    dest[3] = mat[3];
    dest[4] = mat[4];
    dest[5] = mat[5];
    dest[6] = mat[6];
    dest[7] = mat[7];
    dest[8] = mat[8];
    dest[9] = mat[9];
    dest[10] = mat[10];
    dest[11] = mat[11];
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  return dest;
};

/*
 * mat4.set
 * Copies the values of one mat4 to another
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - mat4 receiving copied values
 *
 * Returns:
 * dest
 */
mat4.set = function(mat, dest) {
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[3];
  dest[4] = mat[4];
  dest[5] = mat[5];
  dest[6] = mat[6];
  dest[7] = mat[7];
  dest[8] = mat[8];
  dest[9] = mat[9];
  dest[10] = mat[10];
  dest[11] = mat[11];
  dest[12] = mat[12];
  dest[13] = mat[13];
  dest[14] = mat[14];
  dest[15] = mat[15];
  return dest;
};

/*
 * mat4.identity
 * Sets a mat4 to an identity matrix
 *
 * Params:
 * dest - mat4 to set
 *
 * Returns:
 * dest
 */
mat4.identity = function(dest) {
  dest[0] = 1;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 0;
  dest[5] = 1;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = 0;
  dest[9] = 0;
  dest[10] = 1;
  dest[11] = 0;
  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  return dest;
};

/*
 * mat4.transpose
 * Transposes a mat4 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat4 to transpose
 * dest - Optional, mat4 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.transpose = function(mat, dest) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if(!dest || mat == dest) { 
    var a01 = mat[1], a02 = mat[2], a03 = mat[3];
    var a12 = mat[6], a13 = mat[7];
    var a23 = mat[11];
    
    mat[1] = mat[4];
    mat[2] = mat[8];
    mat[3] = mat[12];
    mat[4] = a01;
    mat[6] = mat[9];
    mat[7] = mat[13];
    mat[8] = a02;
    mat[9] = a12;
    mat[11] = mat[14];
    mat[12] = a03;
    mat[13] = a13;
    mat[14] = a23;
    return mat;
  }
  
  dest[0] = mat[0];
  dest[1] = mat[4];
  dest[2] = mat[8];
  dest[3] = mat[12];
  dest[4] = mat[1];
  dest[5] = mat[5];
  dest[6] = mat[9];
  dest[7] = mat[13];
  dest[8] = mat[2];
  dest[9] = mat[6];
  dest[10] = mat[10];
  dest[11] = mat[14];
  dest[12] = mat[3];
  dest[13] = mat[7];
  dest[14] = mat[11];
  dest[15] = mat[15];
  return dest;
};

/*
 * mat4.determinant
 * Calculates the determinant of a mat4
 *
 * Params:
 * mat - mat4 to calculate determinant of
 *
 * Returns:
 * determinant of mat
 */
mat4.determinant = function(mat) {
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

  return  a30*a21*a12*a03 - a20*a31*a12*a03 - a30*a11*a22*a03 + a10*a31*a22*a03 +
      a20*a11*a32*a03 - a10*a21*a32*a03 - a30*a21*a02*a13 + a20*a31*a02*a13 +
      a30*a01*a22*a13 - a00*a31*a22*a13 - a20*a01*a32*a13 + a00*a21*a32*a13 +
      a30*a11*a02*a23 - a10*a31*a02*a23 - a30*a01*a12*a23 + a00*a31*a12*a23 +
      a10*a01*a32*a23 - a00*a11*a32*a23 - a20*a11*a02*a33 + a10*a21*a02*a33 +
      a20*a01*a12*a33 - a00*a21*a12*a33 - a10*a01*a22*a33 + a00*a11*a22*a33;
};

/*
 * mat4.inverse
 * Calculates the inverse matrix of a mat4
 *
 * Params:
 * mat - mat4 to calculate inverse of
 * dest - Optional, mat4 receiving inverse matrix. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.inverse = function(mat, dest) {
  if(!dest) { dest = mat; }
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
  
  var b00 = a00*a11 - a01*a10;
  var b01 = a00*a12 - a02*a10;
  var b02 = a00*a13 - a03*a10;
  var b03 = a01*a12 - a02*a11;
  var b04 = a01*a13 - a03*a11;
  var b05 = a02*a13 - a03*a12;
  var b06 = a20*a31 - a21*a30;
  var b07 = a20*a32 - a22*a30;
  var b08 = a20*a33 - a23*a30;
  var b09 = a21*a32 - a22*a31;
  var b10 = a21*a33 - a23*a31;
  var b11 = a22*a33 - a23*a32;
  
  // Calculate the determinant (inlined to avoid double-caching)
  var invDet = 1/(b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);
  
  dest[0] = (a11*b11 - a12*b10 + a13*b09)*invDet;
  dest[1] = (-a01*b11 + a02*b10 - a03*b09)*invDet;
  dest[2] = (a31*b05 - a32*b04 + a33*b03)*invDet;
  dest[3] = (-a21*b05 + a22*b04 - a23*b03)*invDet;
  dest[4] = (-a10*b11 + a12*b08 - a13*b07)*invDet;
  dest[5] = (a00*b11 - a02*b08 + a03*b07)*invDet;
  dest[6] = (-a30*b05 + a32*b02 - a33*b01)*invDet;
  dest[7] = (a20*b05 - a22*b02 + a23*b01)*invDet;
  dest[8] = (a10*b10 - a11*b08 + a13*b06)*invDet;
  dest[9] = (-a00*b10 + a01*b08 - a03*b06)*invDet;
  dest[10] = (a30*b04 - a31*b02 + a33*b00)*invDet;
  dest[11] = (-a20*b04 + a21*b02 - a23*b00)*invDet;
  dest[12] = (-a10*b09 + a11*b07 - a12*b06)*invDet;
  dest[13] = (a00*b09 - a01*b07 + a02*b06)*invDet;
  dest[14] = (-a30*b03 + a31*b01 - a32*b00)*invDet;
  dest[15] = (a20*b03 - a21*b01 + a22*b00)*invDet;
  
  return dest;
};

/*
 * mat4.toRotationMat
 * Copies the upper 3x3 elements of a mat4 into another mat4
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat4 otherwise
 */
mat4.toRotationMat = function(mat, dest) {
  if(!dest) { dest = mat4.create(); }
  
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[3];
  dest[4] = mat[4];
  dest[5] = mat[5];
  dest[6] = mat[6];
  dest[7] = mat[7];
  dest[8] = mat[8];
  dest[9] = mat[9];
  dest[10] = mat[10];
  dest[11] = mat[11];
  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  
  return dest;
};

/*
 * mat4.toMat3
 * Copies the upper 3x3 elements of a mat4 into a mat3
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat3 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toMat3 = function(mat, dest) {
  if(!dest) { dest = mat3.create(); }
  
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[4];
  dest[4] = mat[5];
  dest[5] = mat[6];
  dest[6] = mat[8];
  dest[7] = mat[9];
  dest[8] = mat[10];
  
  return dest;
};

/*
 * mat4.toInverseMat3
 * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
 * The resulting matrix is useful for calculating transformed normals
 *
 * Params:
 * mat - mat4 containing values to invert and copy
 * dest - Optional, mat3 receiving values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toInverseMat3 = function(mat, dest) {
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10];
  
  var b01 = a22*a11-a12*a21;
  var b11 = -a22*a10+a12*a20;
  var b21 = a21*a10-a11*a20;
    
  var d = a00*b01 + a01*b11 + a02*b21;
  if (!d) { return null; }
  var id = 1/d;
  
  if(!dest) { dest = mat3.create(); }
  
  dest[0] = b01*id;
  dest[1] = (-a22*a01 + a02*a21)*id;
  dest[2] = (a12*a01 - a02*a11)*id;
  dest[3] = b11*id;
  dest[4] = (a22*a00 - a02*a20)*id;
  dest[5] = (-a12*a00 + a02*a10)*id;
  dest[6] = b21*id;
  dest[7] = (-a21*a00 + a01*a20)*id;
  dest[8] = (a11*a00 - a01*a10)*id;
  
  return dest;
};

/*
 * mat4.multiply
 * Performs a matrix multiplication
 *
 * Params:
 * mat - mat4, first operand
 * mat2 - mat4, second operand
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.multiply = function(mat, mat2, dest) {
  if(!dest) { dest = mat }
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
  
  var b00 = mat2[0], b01 = mat2[1], b02 = mat2[2], b03 = mat2[3];
  var b10 = mat2[4], b11 = mat2[5], b12 = mat2[6], b13 = mat2[7];
  var b20 = mat2[8], b21 = mat2[9], b22 = mat2[10], b23 = mat2[11];
  var b30 = mat2[12], b31 = mat2[13], b32 = mat2[14], b33 = mat2[15];
  
  dest[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
  dest[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
  dest[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
  dest[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
  dest[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
  dest[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
  dest[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
  dest[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
  dest[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
  dest[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
  dest[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
  dest[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
  dest[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
  dest[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
  dest[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
  dest[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;
  
  return dest;
};

/*
 * mat4.multiplyVec3
 * Transforms a vec3 with the given matrix
 * 4th vector component is implicitly '1'
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec3 = function(mat, vec, dest) {
  if(!dest) { dest = vec }
  
  var x = vec[0], y = vec[1], z = vec[2];
  
  dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
  dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
  dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
  
  return dest;
};

/*
 * mat4.multiplyVec4
 * Transforms a vec4 with the given matrix
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec4 to transform
 * dest - Optional, vec4 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec4 = function(mat, vec, dest) {
  if(!dest) { dest = vec }
  
  var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
  
  dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12]*w;
  dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13]*w;
  dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14]*w;
  dest[3] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15]*w;
  
  return dest;
};

/*
 * mat4.translate
 * Translates a matrix by the given vector
 *
 * Params:
 * mat - mat4 to translate
 * vec - vec3 specifying the translation
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.translate = function(mat, vec, dest) {
  var x = vec[0], y = vec[1], z = vec[2];
  
  if(!dest || mat == dest) {
    mat[12] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
    mat[13] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
    mat[14] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
    mat[15] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15];
    return mat;
  }
  
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  
  dest[0] = a00;
  dest[1] = a01;
  dest[2] = a02;
  dest[3] = a03;
  dest[4] = a10;
  dest[5] = a11;
  dest[6] = a12;
  dest[7] = a13;
  dest[8] = a20;
  dest[9] = a21;
  dest[10] = a22;
  dest[11] = a23;
  
  dest[12] = a00*x + a10*y + a20*z + mat[12];
  dest[13] = a01*x + a11*y + a21*z + mat[13];
  dest[14] = a02*x + a12*y + a22*z + mat[14];
  dest[15] = a03*x + a13*y + a23*z + mat[15];
  return dest;
};

/*
 * mat4.scale
 * Scales a matrix by the given vector
 *
 * Params:
 * mat - mat4 to scale
 * vec - vec3 specifying the scale for each axis
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.scale = function(mat, vec, dest) {
  var x = vec[0], y = vec[1], z = vec[2];
  
  if(!dest || mat == dest) {
    mat[0] *= x;
    mat[1] *= x;
    mat[2] *= x;
    mat[3] *= x;
    mat[4] *= y;
    mat[5] *= y;
    mat[6] *= y;
    mat[7] *= y;
    mat[8] *= z;
    mat[9] *= z;
    mat[10] *= z;
    mat[11] *= z;
    return mat;
  }
  
  dest[0] = mat[0]*x;
  dest[1] = mat[1]*x;
  dest[2] = mat[2]*x;
  dest[3] = mat[3]*x;
  dest[4] = mat[4]*y;
  dest[5] = mat[5]*y;
  dest[6] = mat[6]*y;
  dest[7] = mat[7]*y;
  dest[8] = mat[8]*z;
  dest[9] = mat[9]*z;
  dest[10] = mat[10]*z;
  dest[11] = mat[11]*z;
  dest[12] = mat[12];
  dest[13] = mat[13];
  dest[14] = mat[14];
  dest[15] = mat[15];
  return dest;
};

/*
 * mat4.rotate
 * Rotates a matrix by the given angle around the specified axis
 * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * axis - vec3 representing the axis to rotate around 
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotate = function(mat, angle, axis, dest) {
  var x = axis[0], y = axis[1], z = axis[2];
  var len = Math.sqrt(x*x + y*y + z*z);
  if (!len) { return null; }
  if (len != 1) {
    len = 1 / len;
    x *= len; 
    y *= len; 
    z *= len;
  }
  
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  var t = 1-c;
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  
  // Construct the elements of the rotation matrix
  var b00 = x*x*t + c, b01 = y*x*t + z*s, b02 = z*x*t - y*s;
  var b10 = x*y*t - z*s, b11 = y*y*t + c, b12 = z*y*t + x*s;
  var b20 = x*z*t + y*s, b21 = y*z*t - x*s, b22 = z*z*t + c;
  
  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform rotation-specific matrix multiplication
  dest[0] = a00*b00 + a10*b01 + a20*b02;
  dest[1] = a01*b00 + a11*b01 + a21*b02;
  dest[2] = a02*b00 + a12*b01 + a22*b02;
  dest[3] = a03*b00 + a13*b01 + a23*b02;
  
  dest[4] = a00*b10 + a10*b11 + a20*b12;
  dest[5] = a01*b10 + a11*b11 + a21*b12;
  dest[6] = a02*b10 + a12*b11 + a22*b12;
  dest[7] = a03*b10 + a13*b11 + a23*b12;
  
  dest[8] = a00*b20 + a10*b21 + a20*b22;
  dest[9] = a01*b20 + a11*b21 + a21*b22;
  dest[10] = a02*b20 + a12*b21 + a22*b22;
  dest[11] = a03*b20 + a13*b21 + a23*b22;
  return dest;
};

/*
 * mat4.rotateX
 * Rotates a matrix by the given angle around the X axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateX = function(mat, angle, dest) {
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  
  // Cache the matrix values (makes for huge speed increases!)
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
    dest[0] = mat[0];
    dest[1] = mat[1];
    dest[2] = mat[2];
    dest[3] = mat[3];
    
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform axis-specific matrix multiplication
  dest[4] = a10*c + a20*s;
  dest[5] = a11*c + a21*s;
  dest[6] = a12*c + a22*s;
  dest[7] = a13*c + a23*s;
  
  dest[8] = a10*-s + a20*c;
  dest[9] = a11*-s + a21*c;
  dest[10] = a12*-s + a22*c;
  dest[11] = a13*-s + a23*c;
  return dest;
};

/*
 * mat4.rotateY
 * Rotates a matrix by the given angle around the Y axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateY = function(mat, angle, dest) {
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  
  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
    dest[4] = mat[4];
    dest[5] = mat[5];
    dest[6] = mat[6];
    dest[7] = mat[7];
    
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform axis-specific matrix multiplication
  dest[0] = a00*c + a20*-s;
  dest[1] = a01*c + a21*-s;
  dest[2] = a02*c + a22*-s;
  dest[3] = a03*c + a23*-s;
  
  dest[8] = a00*s + a20*c;
  dest[9] = a01*s + a21*c;
  dest[10] = a02*s + a22*c;
  dest[11] = a03*s + a23*c;
  return dest;
};

/*
 * mat4.rotateZ
 * Rotates a matrix by the given angle around the Z axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateZ = function(mat, angle, dest) {
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  
  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
    dest[8] = mat[8];
    dest[9] = mat[9];
    dest[10] = mat[10];
    dest[11] = mat[11];
    
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform axis-specific matrix multiplication
  dest[0] = a00*c + a10*s;
  dest[1] = a01*c + a11*s;
  dest[2] = a02*c + a12*s;
  dest[3] = a03*c + a13*s;
  
  dest[4] = a00*-s + a10*c;
  dest[5] = a01*-s + a11*c;
  dest[6] = a02*-s + a12*c;
  dest[7] = a03*-s + a13*c;
  
  return dest;
};

/*
 * mat4.frustum
 * Generates a frustum matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.frustum = function(left, right, bottom, top, near, far, dest) {
  if(!dest) { dest = mat4.create(); }
  var rl = (right - left);
  var tb = (top - bottom);
  var fn = (far - near);
  dest[0] = (near*2) / rl;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 0;
  dest[5] = (near*2) / tb;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = (right + left) / rl;
  dest[9] = (top + bottom) / tb;
  dest[10] = -(far + near) / fn;
  dest[11] = -1;
  dest[12] = 0;
  dest[13] = 0;
  dest[14] = -(far*near*2) / fn;
  dest[15] = 0;
  return dest;
};

/*
 * mat4.perspective
 * Generates a perspective projection matrix with the given bounds
 *
 * Params:
 * fovy - scalar, vertical field of view
 * aspect - scalar, aspect ratio. typically viewport width/height
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.perspective = function(fovy, aspect, near, far, dest, flip) {
  var top = near*Math.tan(fovy*Math.PI / 360.0);
  var right = top*aspect;
  return mat4.frustum(-right, right, -top * (flip ? -1 : 1), top * (flip ? -1 : 1), near, far, dest);
};

/*
 * mat4.ortho
 * Generates a orthogonal projection matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.ortho = function(left, right, bottom, top, near, far, dest) {
  if(!dest) { dest = mat4.create(); }
  var rl = (right - left);
  var tb = (top - bottom);
  var fn = (far - near);
  dest[0] = 2 / rl;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 0;
  dest[5] = 2 / tb;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = 0;
  dest[9] = 0;
  dest[10] = -2 / fn;
  dest[11] = 0;
  dest[12] = -(left + right) / rl;
  dest[13] = -(top + bottom) / tb;
  dest[14] = -(far + near) / fn;
  dest[15] = 1;
  return dest;
};

/*
 * mat4.ortho
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * Params:
 * eye - vec3, position of the viewer
 * center - vec3, point the viewer is looking at
 * up - vec3 pointing "up"
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.lookAt = function(eye, center, up, dest) {
  if(!dest) { dest = mat4.create(); }
  
  var eyex = eye[0],
    eyey = eye[1],
    eyez = eye[2],
    upx = up[0],
    upy = up[1],
    upz = up[2],
    centerx = center[0],
    centery = center[1],
    centerz = center[2];

  if (eyex == centerx && eyey == centery && eyez == centerz) {
    return mat4.identity(dest);
  }
  
  var z0,z1,z2,x0,x1,x2,y0,y1,y2,len;
  
  //vec3.direction(eye, center, z);
  z0 = eyex - center[0];
  z1 = eyey - center[1];
  z2 = eyez - center[2];
  
  // normalize (no check needed for 0 because of early return)
  len = 1/Math.sqrt(z0*z0 + z1*z1 + z2*z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  
  //vec3.normalize(vec3.cross(up, z, x));
  x0 = upy*z2 - upz*z1;
  x1 = upz*z0 - upx*z2;
  x2 = upx*z1 - upy*z0;
  len = Math.sqrt(x0*x0 + x1*x1 + x2*x2);
  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1/len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  };
  
  //vec3.normalize(vec3.cross(z, x, y));
  y0 = z1*x2 - z2*x1;
  y1 = z2*x0 - z0*x2;
  y2 = z0*x1 - z1*x0;
  
  len = Math.sqrt(y0*y0 + y1*y1 + y2*y2);
  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1/len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }
  
  dest[0] = x0;
  dest[1] = y0;
  dest[2] = z0;
  dest[3] = 0;
  dest[4] = x1;
  dest[5] = y1;
  dest[6] = z1;
  dest[7] = 0;
  dest[8] = x2;
  dest[9] = y2;
  dest[10] = z2;
  dest[11] = 0;
  dest[12] = -(x0*eyex + x1*eyey + x2*eyez);
  dest[13] = -(y0*eyex + y1*eyey + y2*eyez);
  dest[14] = -(z0*eyex + z1*eyey + z2*eyez);
  dest[15] = 1;
  
  return dest;
};

/*
 * mat4.str
 * Returns a string representation of a mat4
 *
 * Params:
 * mat - mat4 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat4.str = function(mat) {
  return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + 
    ', '+ mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] + 
    ', '+ mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] + 
    ', '+ mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
};

/*
 * quat4 - Quaternions 
 */
quat4 = {};

/*
 * quat4.create
 * Creates a new instance of a quat4 using the default array type
 * Any javascript array containing at least 4 numeric elements can serve as a quat4
 *
 * Params:
 * quat - Optional, quat4 containing values to initialize with
 *
 * Returns:
 * New quat4
 */
quat4.create = function(quat) {
  var dest = new glMatrixArrayType(4);
  
  if(quat) {
    dest[0] = quat[0];
    dest[1] = quat[1];
    dest[2] = quat[2];
    dest[3] = quat[3];
  }
  
  return dest;
};

/*
 * quat4.set
 * Copies the values of one quat4 to another
 *
 * Params:
 * quat - quat4 containing values to copy
 * dest - quat4 receiving copied values
 *
 * Returns:
 * dest
 */
quat4.set = function(quat, dest) {
  dest[0] = quat[0];
  dest[1] = quat[1];
  dest[2] = quat[2];
  dest[3] = quat[3];
  
  return dest;
};

/*
 * quat4.calculateW
 * Calculates the W component of a quat4 from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length. 
 * Any existing W component will be ignored. 
 *
 * Params:
 * quat - quat4 to calculate W component of
 * dest - Optional, quat4 receiving calculated values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.calculateW = function(quat, dest) {
  var x = quat[0], y = quat[1], z = quat[2];

  if(!dest || quat == dest) {
    quat[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
    return quat;
  }
  dest[0] = x;
  dest[1] = y;
  dest[2] = z;
  dest[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
  return dest;
}

/*
 * quat4.inverse
 * Calculates the inverse of a quat4
 *
 * Params:
 * quat - quat4 to calculate inverse of
 * dest - Optional, quat4 receiving inverse values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.inverse = function(quat, dest) {
  if(!dest || quat == dest) {
    quat[0] *= -1;
    quat[1] *= -1;
    quat[2] *= -1;
    return quat;
  }
  dest[0] = -quat[0];
  dest[1] = -quat[1];
  dest[2] = -quat[2];
  dest[3] = quat[3];
  return dest;
}

/*
 * quat4.length
 * Calculates the length of a quat4
 *
 * Params:
 * quat - quat4 to calculate length of
 *
 * Returns:
 * Length of quat
 */
quat4.length = function(quat) {
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
  return Math.sqrt(x*x + y*y + z*z + w*w);
}

/*
 * quat4.normalize
 * Generates a unit quaternion of the same direction as the provided quat4
 * If quaternion length is 0, returns [0, 0, 0, 0]
 *
 * Params:
 * quat - quat4 to normalize
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.normalize = function(quat, dest) {
  if(!dest) { dest = quat; }
  
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
  var len = Math.sqrt(x*x + y*y + z*z + w*w);
  if(len == 0) {
    dest[0] = 0;
    dest[1] = 0;
    dest[2] = 0;
    dest[3] = 0;
    return dest;
  }
  len = 1/len;
  dest[0] = x * len;
  dest[1] = y * len;
  dest[2] = z * len;
  dest[3] = w * len;
  
  return dest;
}

/*
 * quat4.multiply
 * Performs a quaternion multiplication
 *
 * Params:
 * quat - quat4, first operand
 * quat2 - quat4, second operand
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.multiply = function(quat, quat2, dest) {
  if(!dest) { dest = quat; }
  
  var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3];
  var qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];
  
  dest[0] = qax*qbw + qaw*qbx + qay*qbz - qaz*qby;
  dest[1] = qay*qbw + qaw*qby + qaz*qbx - qax*qbz;
  dest[2] = qaz*qbw + qaw*qbz + qax*qby - qay*qbx;
  dest[3] = qaw*qbw - qax*qbx - qay*qby - qaz*qbz;
  
  return dest;
}

/*
 * quat4.multiplyVec3
 * Transforms a vec3 with the given quaternion
 *
 * Params:
 * quat - quat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
quat4.multiplyVec3 = function(quat, vec, dest) {
  if(!dest) { dest = vec; }
  
  var x = vec[0], y = vec[1], z = vec[2];
  var qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3];

  // calculate quat * vec
  var ix = qw*x + qy*z - qz*y;
  var iy = qw*y + qz*x - qx*z;
  var iz = qw*z + qx*y - qy*x;
  var iw = -qx*x - qy*y - qz*z;
  
  // calculate result * inverse quat
  dest[0] = ix*qw + iw*-qx + iy*-qz - iz*-qy;
  dest[1] = iy*qw + iw*-qy + iz*-qx - ix*-qz;
  dest[2] = iz*qw + iw*-qz + ix*-qy - iy*-qx;
  
  return dest;
}

/*
 * quat4.toMat3
 * Calculates a 3x3 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat3 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat3 otherwise
 */
quat4.toMat3 = function(quat, dest) {
  if(!dest) { dest = mat3.create(); }
  
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;

  var xx = x*x2;
  var xy = x*y2;
  var xz = x*z2;

  var yy = y*y2;
  var yz = y*z2;
  var zz = z*z2;

  var wx = w*x2;
  var wy = w*y2;
  var wz = w*z2;

  dest[0] = 1 - (yy + zz);
  dest[1] = xy - wz;
  dest[2] = xz + wy;

  dest[3] = xy + wz;
  dest[4] = 1 - (xx + zz);
  dest[5] = yz - wx;

  dest[6] = xz - wy;
  dest[7] = yz + wx;
  dest[8] = 1 - (xx + yy);
  
  return dest;
}

/*
 * quat4.toMat4
 * Calculates a 4x4 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat4 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
quat4.toMat4 = function(quat, dest) {
  if(!dest) { dest = mat4.create(); }
  
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;

  var xx = x*x2;
  var xy = x*y2;
  var xz = x*z2;

  var yy = y*y2;
  var yz = y*z2;
  var zz = z*z2;

  var wx = w*x2;
  var wy = w*y2;
  var wz = w*z2;

  dest[0] = 1 - (yy + zz);
  dest[1] = xy - wz;
  dest[2] = xz + wy;
  dest[3] = 0;

  dest[4] = xy + wz;
  dest[5] = 1 - (xx + zz);
  dest[6] = yz - wx;
  dest[7] = 0;

  dest[8] = xz - wy;
  dest[9] = yz + wx;
  dest[10] = 1 - (xx + yy);
  dest[11] = 0;

  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  
  return dest;
}

/*
 * quat4.slerp
 * Performs a spherical linear interpolation between two quat4
 *
 * Params:
 * quat - quat4, first quaternion
 * quat2 - quat4, second quaternion
 * slerp - interpolation amount between the two inputs
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.slerp = function(quat, quat2, slerp, dest) {
    if(!dest) { dest = quat; }
    
  var cosHalfTheta =  quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
  
  if (Math.abs(cosHalfTheta) >= 1.0){
      if(dest != quat) {
        dest[0] = quat[0];
        dest[1] = quat[1];
        dest[2] = quat[2];
        dest[3] = quat[3];
    }
    return dest;
  }
  
  var halfTheta = Math.acos(cosHalfTheta);
  var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);

  if (Math.abs(sinHalfTheta) < 0.001){
    dest[0] = (quat[0]*0.5 + quat2[0]*0.5);
    dest[1] = (quat[1]*0.5 + quat2[1]*0.5);
    dest[2] = (quat[2]*0.5 + quat2[2]*0.5);
    dest[3] = (quat[3]*0.5 + quat2[3]*0.5);
    return dest;
  }
  
  var ratioA = Math.sin((1 - slerp)*halfTheta) / sinHalfTheta;
  var ratioB = Math.sin(slerp*halfTheta) / sinHalfTheta; 
  
  dest[0] = (quat[0]*ratioA + quat2[0]*ratioB);
  dest[1] = (quat[1]*ratioA + quat2[1]*ratioB);
  dest[2] = (quat[2]*ratioA + quat2[2]*ratioB);
  dest[3] = (quat[3]*ratioA + quat2[3]*ratioB);
  
  return dest;
}


/*
 * quat4.str
 * Returns a string representation of a quaternion
 *
 * Params:
 * quat - quat4 to represent as a string
 *
 * Returns:
 * string representation of quat
 */
quat4.str = function(quat) {
  return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']'; 
}

/*
    http://www.JSON.org/json2.js
    2011-02-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());
/*
 * jTiltRenderer.js - Helper drawing functions for WebGL
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
var EXPORTED_SYMBOLS = ["Tilt.Renderer"];

/**
 * Tilt.Renderer constructor.
 *
 * @param {HTMLCanvasElement} canvas: the canvas element used for rendering
 * @param {Function} successCallback: to be called if gl initialization worked
 * @param {Function} failCallback: to be called if gl initialization failed
 * @return {Tilt.Renderer} the newly created object
 */
Tilt.Renderer = function(canvas, failCallback, successCallback) {

  /**
   * The WebGL context obtained from the canvas element, used for drawing.
   */
  this.gl = this.create3DContext(canvas);

  // first, clear the cache
  Tilt.clearCache();
  Tilt.$gl = this.gl;
  Tilt.$renderer = this;

  // check if the context was created successfully
  if ("undefined" !== typeof this.gl) {
    // set up some global enums
    this.TRIANGLES = this.gl.TRIANGLES;
    this.TRIANGLE_STRIP = this.gl.TRIANGLE_STRIP;
    this.TRIANGLE_FAN = this.gl.TRIANGLE_FAN;
    this.LINES = this.gl.LINES;
    this.LINE_STRIP = this.gl.LINE_STRIP;
    this.LINE_LOOP = this.gl.LINE_LOOP;
    this.POINTS = this.gl.POINTS;

    // if successful, run a success callback function if available
    if ("function" === typeof successCallback) {
      successCallback();
    }
  } else {
    // if unsuccessful, log the error and run a fail callback if available
    Tilt.Console.log(Tilt.StringBundle.get("initWebGL.error"));
    if ("function" === typeof failCallback) {
      failCallback();
    }
  }

  /**
   * Variables representing the current framebuffer width and height.
   */
  this.width = canvas.width;
  this.height = canvas.height;

  /**
   * A model view matrix stack, used for push/pop operations.
   */
  this.mvMatrixStack = [];

  /**
   * The current model view matrix;
   */
  this.mvMatrix = mat4.identity(mat4.create());

  /**
   * The current projection matrix;
   */
  this.projMatrix = mat4.identity(mat4.create());

  /**
   * The current clear color used to clear the color buffer bit.
   */
  this.clearColor = [0, 0, 0, 0];

  /**
   * The current tint color applied to any objects which can be tinted.
   * These mostly represent images or primitives which are textured.
   */
  this.tintColor = [0, 0, 0, 0];

  /**
   * The current fill color applied to any objects which can be filled.
   * These are rectangles, circles, boxes, 2d or 3d primitives in general.
   */
  this.fillColor = [0, 0, 0, 0];

  /**
   * The current stroke color applied to any objects which can be stroked.
   * This property mostly refers to lines.
   */
  this.strokeColor = [0, 0, 0, 0];

  /**
   * Variable representing the current stroke weight.
   */
  this.strokeWeightValue = 0;

  /**
   * A shader useful for drawing vertices with only a color component.
   */
  var color$vs = Tilt.Shaders.Color.vs;
  var color$fs = Tilt.Shaders.Color.fs;
  this.colorShader = new Tilt.Program(color$vs, color$fs);

  /**
   * A shader useful for drawing vertices with both a color component and
   * texture coordinates.
   */
  var texture$vs = Tilt.Shaders.Texture.vs;
  var texture$fs = Tilt.Shaders.Texture.fs;
  this.textureShader = new Tilt.Program(texture$vs, texture$fs);

  /**
   * Vertices buffer representing the corners of a rectangle.
   */
  this.rectangle = new Tilt.Rectangle();
  this.rectangleWireframe = new Tilt.RectangleWireframe();

  /**
   * Vertices buffer representing the corners of a cube.
   */
  this.cube = new Tilt.Cube();
  this.cubeWireframe = new Tilt.CubeWireframe();

  /** 
   * Helpers for managing variables like frameCount, frameRate, frameDelta,
   * used internally, in the requestAnimFrame function.
   */
  this.lastTime = 0;
  this.currentTime = null;

  /**
   * Time passed since initialization.
   */
  this.elapsedTime = 0;

  /**
   * Counter for the number of frames passed since initialization.
   */
  this.frameCount = 0;

  /**
   * Variable retaining the current frame rate.
   */
  this.frameRate = 0;

  /**
   * Variable representing the delta time elapsed between frames.
   * Use this to create smooth animations regardless of the frame rate.
   */
  this.frameDelta = 0;

  // set the default rendering properties
  this.blendMode("alpha");
  this.depthTest(true);

  // set the default model view and projection matrices
  this.origin();
  this.perspective();

  // set the default tint, fill, stroke and stroke weight
  this.tint("#fff");
  this.fill("#fff");
  this.stroke("#000");
  this.strokeWeight(1);
};

Tilt.Renderer.prototype = {

  /**
   * Clears the color and depth buffers to a specific color.
   * The color components are represented in the 0..1 range.
   *
   * @param {number} r: the red component of the clear color
   * @param {number} g: the green component of the clear color
   * @param {number} b: the blue component of the clear color
   * @param {number} a: the alpha component of the clear color
   */
  clear: function(r, g, b, a) {
    // cache some variables for easy access
    var col = this.clearColor,
      gl = this.gl;

    if (col[0] !== r || col[1] !== g || col[2] !== b || col[3] !== a) {
      col[0] = r;
      col[1] = g;
      col[2] = b;
      col[3] = a;
      gl.clearColor(r, g, b, a);
    }

    // clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  },

  /**
   * Clears the canvas context (usually at the beginning of each frame).
   * If the color is undefined, it will default to opaque black.
   * It is not recommended but possible to pass a number as a parameter,
   * in which case the color will be [n, n, n, 255], or directly an array of
   * [r, g, b, a] values, all in the 0..255 interval.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  background: function(color) {
    var rgba;

    if ("string" === typeof color) {
      rgba = Tilt.Math.hex2rgba(color);
    } else if ("undefined" === typeof color) {
      rgba = [0, 0, 0, 1];
    } else if ("number" === typeof color) {
      rgba = [color / 255, color / 255, color / 255, 1];
    } else {
      rgba = [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
    }

    // clear the color and depth buffers
    this.clear(rgba[0], rgba[1], rgba[2], rgba[3]);
  },

  /**
   * Sets a default perspective projection, with the near frustum rectangle
   * mapped to the canvas width and height bounds.
   */
  perspective: function() {
    var fov = 45,
      w = this.width,
      h = this.height,
      x = w / 2,
      y = h / 2,
      z = y / Math.tan(Tilt.Math.radians(45) / 2),
      znear = z / 10,
      zfar = z * 100,
      aspect = w / h;

    mat4.perspective(fov, aspect, znear, zfar, this.projMatrix, true);
    mat4.translate(this.projMatrix, [-x, -y, -z]);
  },

  /**
   * Sets a default orthographic projection (recommended for 2d rendering).
   */
  ortho: function() {
    mat4.ortho(0, this.width, this.height, 0, -1000, 1000, this.projMatrix);
  },

  /**
   * Sets a custom projection matrix.
   * @param {object} matrix: the custom projection matrix to be used
   */
  projection: function(matrix) {
    mat4.set(matrix, this.projMatrix);
  },

  /**
   * Pushes the current model view matrix on a stack, to be popped out later.
   * This can be used, for example, to create complex animations and be able
   * to revert back to the current model view.
   */
  pushMatrix: function() {
    this.mvMatrixStack.push(mat4.create(this.mvMatrix));
  },

  /**
   * Pops an existing model view matrix from stack.
   * Use this only after pushMatrix() has been previously called.
   */
  popMatrix: function() {
    if (this.mvMatrixStack.length > 0) {
      this.mvMatrix = this.mvMatrixStack.pop();
    }
  },

  /**
   * Resets the model view matrix to identity.
   * This is a default matrix with no rotation, no scaling, at (0, 0, 0);
   */
  origin: function() {
    mat4.identity(this.mvMatrix);
  },

  /**
   * Transforms the model view matrix with a new matrix.
   * Useful for creating custom transformations.
   *
   * @param {object} matrix: the matrix to be multiply the model view with
   */
  transform: function(matrix) {
    mat4.multiply(this.mvMatrix, matrix);
  },

  /**
   * Translates the model view by the x, y and z coordinates.
   *
   * @param {number} x: the x amount of translation
   * @param {number} y: the y amount of translation
   * @param {number} z: the z amount of translation
   */
  translate: function(x, y, z) {
    mat4.translate(this.mvMatrix, [x, y, z]);
  },

  /**
   * Rotates the model view by a specified angle on the x, y and z axis.
   *
   * @param {number} angle: the angle expressed in radians
   * @param {number} x: the x axis of the rotation
   * @param {number} y: the y axis of the rotation
   * @param {number} z: the z axis of the rotation
   */
  rotate: function(angle, x, y, z) {
    mat4.rotate(this.mvMatrix, angle, [x, y, z]);
  },

  /**
   * Rotates the model view by a specified angle on the x axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  rotateX: function(angle) {
    mat4.rotateX(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the y axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  rotateY: function(angle) {
    mat4.rotateY(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the z axis.
   *
   * @param {number} angle: the angle expressed in radians
   */
  rotateZ: function(angle) {
    mat4.rotateZ(this.mvMatrix, angle);
  },

  /**
   * Scales the model view by the x, y and z coordinates.
   *
   * @param {number} x: the x amount of scaling
   * @param {number} y: the y amount of scaling
   * @param {number} z: the z amount of scaling
   */
  scale: function(x, y, z) {
    mat4.scale(this.mvMatrix, [x, y, z]);
  },

  /**
   * Sets the current tint color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  tint: function(color) {
    this.tintColor = Tilt.Math.hex2rgba(color);
  },

  /**
   * Disables the current tint color value.
   */
  noTint: function() {
    var tint = this.tintColor;
    tint[0] = 1;
    tint[1] = 1;
    tint[2] = 1;
    tint[3] = 1;
  },

  /**
   * Sets the current fill color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  fill: function(color) {
    this.fillColor = Tilt.Math.hex2rgba(color);
  },

  /**
   * Disables the current fill color value.
   */
  noFill: function() {
    var fill = this.fillColor;
    fill[0] = 0;
    fill[1] = 0;
    fill[2] = 0;
    fill[3] = 0;
  },

  /**
   * Sets the current stroke color.
   *
   * @param {string} color: the color, defined in hex or as rgb() or rgba()
   */
  stroke: function(color) {
    this.strokeColor = Tilt.Math.hex2rgba(color);
  },

  /**
   * Disables the current stroke color value.
   */
  noStroke: function() {
    var stroke = this.strokeColor;
    stroke[0] = 0;
    stroke[1] = 0;
    stroke[2] = 0;
    stroke[3] = 0;
  },

  /**
   * Sets the current stroke weight (line width).
   *
   * @param {number} weight: the stroke weight
   */
  strokeWeight: function(value) {
    if (this.strokeWeightValue !== value) {
      this.strokeWeightValue = value;
      this.gl.lineWidth(value);
    }
  },

  /**
   * Sets blending, either "alpha" or "add" (additive blending).
   * Anything else disables blending.
   *
   * @param {string} mode: blending, either "alpha", "add" or undefined
   */
  blendMode: function(mode) {
    var gl = this.gl;

    if ("alpha" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else if ("add" === mode || "additive" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    } else {
      gl.disable(gl.BLEND);
    }
  },

  /**
   * Sets if depth testing should be enabled or not.
   * Disabling could be useful when handling transparency (for example).
   *
   * @param {boolean} mode: true if depth testing should be enabled
   */
  depthTest: function(mode) {
    var gl = this.gl;

    if (mode) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
  },

  /**
   * Helper function to set active the color shader with the required params
   * 
   * @param {object} verticesBuffer: a buffer of vertices positions
   * @param {object} color: the color to be used
   */
  useColorShader: function(verticesBuffer, color) {
    var program = this.colorShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", verticesBuffer);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
  },

  /**
   * Helper function to set active the texture shader with the required params
   * 
   * @param {object} verticesBuffer: a buffer of vertices positions
   * @param {object} texCoordBuffer: a buffer of vertices texture coordinates
   * @param {object} color: the color to be used
   * @param {object} texture: the texture to be applied
   */
  useTextureShader: function(verticesBuffer, texCoordBuffer, color, texture) {
    var program = this.textureShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", verticesBuffer);
    program.bindVertexBuffer("vertexTexCoord", texCoordBuffer);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
    program.bindTexture("sampler", texture);
  },

  /**
   * Draw a single triangle.
   * Do not abuse this function, it is quite slow, use for debugging only!
   *
   * @param {array} v0: the [x, y, z] position of the first triangle point
   * @param {array} v1: the [x, y, z] position of the second triangle point
   * @param {array} v2: the [x, y, z] position of the third triangle point
   */
  triangle: function(v0, v1, v2) {
    var vertices = new Tilt.VertexBuffer(v0.concat(v1, v2), 3),
      fill = this.fillColor,
      stroke = this.strokeColor;

    // draw the triangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, stroke);
      this.drawVertices(this.LINE_LOOP, vertices.numItems);
    }
  },

  /**
   * Modifies the location from which rectangles draw. The default mode is
   * rectMode("corner"), which specifies the location to be the upper left
   * corner of the shape and uses the third and fourth parameters of rect() to
   * specify the width and height. Use rectMode("center") to draw centered
   * at the given x and y position.
   *
   * @param {string} mode: either "corner" or "center"
   */
  rectMode: function(mode) {
    this.rectangle.rectModeValue = mode;
  },

  /**
   * Draws a rectangle using the specified parameters.
   *
   * @param {number} x: the x position of the object
   * @param {number} y: the y position of the object
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   */
  rect: function(x, y, width, height) {
    var rectangle = this.rectangle,
      wireframe = this.rectangleWireframe,
      fill = this.fillColor,
      stroke = this.strokeColor;

    // if rectMode is set to "center", we need to offset the origin
    if ("center" === this.rectangle.rectModeValue) {
      x -= width / 2;
      y -= height / 2;
    }

    // in memory, the rectangle is represented as a perfect 1x1 square, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.translate(x, y, 0);
    this.scale(width, height, 1);

    // draw the rectangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(rectangle.vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, rectangle.vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wireframe.vertices, stroke);
      this.drawVertices(this.LINE_STRIP, wireframe.vertices.numItems);
    }

    this.popMatrix();
  },

  /**
   * Modifies the location from which images draw. The default mode is
   * imageMode("corner"), which specifies the location to be the upper left
   * corner and uses the fourth and fifth parameters of image() to set the
   * image"s width and height. Use imageMode("center") to draw images centered
   * at the given x and y position.
   *
   * @param {string} mode: either "corner" or "center"
   */
  imageMode: function(mode) {
    this.rectangle.imageModeValue = mode;
  },

  /**
   * Draws an image using the specified parameters.
   *
   * @param {object} t: the texture to be used
   * @param {number} x: the x position of the object
   * @param {number} y: the y position of the object
   * @param {number} z: the z position of the object
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   */
  image: function(t, x, y, width, height) {
    var rectangle = this.rectangle,
      tint = this.tintColor,
      stroke = this.strokeColor;

    // if the width and height are not specified, we use the embedded
    // texture dimensions, from the source image or framebuffer
    if ("undefined" === typeof width || "undefined" === typeof height) {
      width = texture.width;
      height = texture.height;
    }

    // if imageMode is set to "center", we need to offset the origin
    if ("center" === rectangle.imageModeValue) {
      x -= width / 2;
      y -= height / 2;
    }

    // draw the image only if the tint alpha channel is not transparent
    if (tint[3]) {
      // in memory, the rectangle is represented as a perfect 1x1 square, so
      // some transformations are applied to achieve the desired shape
      this.pushMatrix();
      this.translate(x, y, 0);
      this.scale(width, height, 1);

      // use the necessary shader and draw the vertices
      this.useTextureShader(rectangle.vertices, rectangle.texCoord, tint, t);
      this.drawVertices(this.TRIANGLE_STRIP, rectangle.vertices.numItems);

      this.popMatrix();
    }
  },

  /**
   * Draws a box using the specified parameters.
   *
   * @param {number} width: the width of the object
   * @param {number} height: the height of the object
   * @param {number} depth: the depth of the object
   * @param {object} texture: the texture to be used
   */
  box: function(width, height, depth, texture) {
    var cube = this.cube,
      wireframe = this.cubeWireframe,
      tint = this.tintColor,
      fill = this.fillColor,
      stroke = this.strokeColor;

    // in memory, the box is represented as a simple perfect 1x1 cube, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.scale(width, height, depth);

    if (texture) {
      // draw the box only if the tint alpha channel is not transparent
      if (tint[3]) {
        // use the necessary shader and draw the vertices
        this.useTextureShader(cube.vertices, cube.texCoord, tint, texture);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    } else {
      // draw the box only if the fill alpha channel is not transparent
      if (fill[3]) {
        // use the necessary shader and draw the vertices
        this.useColorShader(cube.vertices, fill);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wireframe.vertices, stroke);
      this.drawIndexedVertices(this.LINES, wireframe.indices);
    }

    this.popMatrix();
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   *
   * @param {number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {number} count: the number of indices to be rendered
   */
  drawVertices: function(drawMode, count) {
    this.gl.drawArrays(drawMode, 0, count);
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   * This function also makes use of an index buffer.
   *
   * @param {number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {object} indicesBuffer: indices for the passed vertices buffer
   */
  drawIndexedVertices: function(drawMode, indicesBuffer) {
    var gl = this.gl;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.ref);
    gl.drawElements(drawMode, indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  },

  /**
   * Helper function to create a 3D context in a cross browser way.
   *
   * @param {object} canvas: the canvas to get the WebGL context from
   * @param {object} opt_attribs: optional attributes used for initialization
   */
  create3DContext: function(canvas, opt_attribs) {
    var names = ["experimental-webgl", "webgl", "webkit-3d", "moz-webgl"];
    var context, i, length;

    for (i = 0, length = names.length; i < length; ++i) {
      try {
        context = canvas.getContext(names[i], opt_attribs);
      }
      catch(e) {}

      if (context) {
        break;
      }
    }
    return context;
  },

  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally,
   * and resets the model view and projection matrices.
   * Use it at the beginning of your loop function, like this:
   *
   *      function draw() {
   *        tilt.loop(draw);
   *
   *        // do rendering
   *        ...
   *      };
   *
   * @param {function} loop: the function to be called each frame
   */
  loop: function(draw) {
    window.requestAnimFrame(draw);

    // reset the model view and projection matrices
    this.origin();
    this.perspective();

    // calculate the frame delta and frame rate using the current time
    this.currentTime = new Date().getTime();

    if (this.lastTime !== 0) {
      this.frameDelta = this.currentTime - this.lastTime;
      this.frameRate = 1000 / this.frameDelta;
    }
    this.lastTime = this.currentTime;

    // increment the elapsed time and total frame count
    this.elapsedTime += this.frameDelta;
    this.frameCount++;
  },

  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    Tilt.clearCache();
    
    for (var i in this) {
      if ("function" === typeof this[i].destroy) {
        this[i].destroy();
      }
      this[i] = null;
    }
  }
};
/* 
 * jTiltShaders.js - Various simple shaders used internally by Tilt
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
"use strict";

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.Shaders.Color"];

Tilt.Shaders = {};

/**
 * A color shader. The only useful thing it does is set the gl_FragColor.
 *
 * @param {attribute} vertexPosition: the vertex position
 * @param {uniform} mvMatrix: the model view matrix
 * @param {uniform} projMatrix: the projection matrix
 * @param {uniform} color: the color to set the gl_FragColor to
 */  
Tilt.Shaders.Color = {

  /**
   * Vertex shader.
   */
  vs: [
"attribute vec3 vertexPosition;",

"uniform mat4 mvMatrix;",
"uniform mat4 projMatrix;",

"void main(void) {",
"    gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);",
"}"
].join("\n"),

  /**
   * Fragment shader.
   */
  fs: [
"#ifdef GL_ES",
"precision highp float;",
"#endif",

"uniform vec4 color;",

"void main(void) {",
"    gl_FragColor = color;",
"}"
].join("\n")
};

/** 
 * A simple texture shader. It uses one sampler and a uniform color.
 *
 * @param {attribute} vertexPosition: the vertex position
 * @param {attribute} vertexTexCoord: texture coordinates used by the sampler
 * @param {uniform} mvMatrix: the model view matrix
 * @param {uniform} projMatrix: the projection matrix
 * @param {uniform} color: the color to multiply the sampled pixel with
 */
Tilt.Shaders.Texture = {

  /**
   * Vertex shader.
   */
  vs: [
"attribute vec3 vertexPosition;",
"attribute vec2 vertexTexCoord;",

"uniform mat4 mvMatrix;",
"uniform mat4 projMatrix;",

"varying vec2 texCoord;",

"void main(void) {",
"  gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);",
"  texCoord = vertexTexCoord;",
"}"
].join("\n"),

  /**
   * Fragment shader.
   */
  fs: [
"#ifdef GL_ES",
"precision highp float;",
"#endif",

"uniform vec4 color;",
"uniform sampler2D sampler;",

"varying vec2 texCoord;",

"void main(void) {",
"  vec4 tex = texture2D(sampler, vec2(texCoord.s, texCoord.t));",
"  gl_FragColor = color * tex;",
"}"
].join("\n")
};
/*
 * jTiltControllers.js - Easy to use camera controllers for Tilt
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
var EXPORTED_SYMBOLS = ["Tilt.Arcball"];

/**
 * This is a general purpose 3D rotation controller described by Ken Shoemake
 * in the Graphics Interface ’92 Proceedings. It features good behavior
 * easy implementation, cheap execution, & optional axis constrain.
 *
 * @param {number} width: the width of canvas
 * @param {number} height: the height of canvas
 * @param {number} radius: optional, the radius of the arcball
 * @return {object} the created object
 */
Tilt.Arcball = function(width, height, radius) {

  /**
   * Values retaining the current horizontal and vertical mouse coordinates.
   */
  this.mouseX = 0;
  this.mouseY = 0;
  this.mouseDragX = 0;
  this.mouseDragY = 0;

  /**
   * Additionally, this implementation also handles zoom.
   */
  this.scrollValue = 0;

  /**
   * The vectors representing the mouse coordinates mapped on the arcball
   * and their perpendicular converted from (x, y) to (x, y, z) at specific 
   * events like mousePressed and mouseDragged.
   */
  this.startVec = vec3.create();
  this.endVec = vec3.create();
  this.pVec = vec3.create();

  /**
   * The corresponding rotation quaternions created using the mouse vectors.
   */
  this.lastRot = quat4.create([0, 0, 0, 1]);
  this.deltaRot = quat4.create([0, 0, 0, 1]);
  this.currentRot = quat4.create([0, 0, 0, 1]);

  /**
   * The zoom, calculated using mouse scroll deltas.
   */
  this.currentZoom = 0;

  /**
   * Set the current dimensions of the arcball.
   */
  this.resize(width, height, radius);
};

Tilt.Arcball.prototype = {

  /**
   * Call this function whenever you need the updated rotation quaternion
   * and the zoom amount. These values will be returned as "rotation" & "zoom"
   * properties inside an object.
   *
   * @param {number} frameDelta: optional, pass deltas for smooth animations
   * @return {object} the rotation quaternion and the zoom amount
   */
  loop: function(frameDelta) {
    if ("undefined" === typeof frameDelta) {
      frameDelta = 0.25;
    } else {
      // this should be in the (0..1) interval
      frameDelta = Tilt.Math.clamp(frameDelta / 100, 0.01, 0.99);
    }

    // update the zoom based on the mouse scroll
    this.currentZoom += (this.scrollValue - this.currentZoom) * frameDelta;

    // update the mouse coordinates
    this.mouseX += (this.mouseDragX - this.mouseX) * frameDelta;
    this.mouseY += (this.mouseDragY - this.mouseY) * frameDelta;

    var radius = this.radius,
      width = this.width,
      height = this.height,
      mouseX = this.mouseX,
      mouseY = this.mouseY;

    // find the sphere coordinates of the mouse positions
    this.pointToSphere(mouseX, mouseY, width, height, radius, this.endVec);

    // compute the vector perpendicular to the start & end vectors
    vec3.cross(this.startVec, this.endVec, this.pVec);

    // if the begin and end vectors don't coincide
    if (vec3.length(this.pVec) > 0) {
      this.deltaRot[0] = this.pVec[0];
      this.deltaRot[1] = this.pVec[1];
      this.deltaRot[2] = this.pVec[2];

      // in the quaternion values, w is cosine (theta / 2),
      // where theta is the rotation angle
      this.deltaRot[3] = -vec3.dot(this.startVec, this.endVec);
    } else {
      // return an identity rotation quaternion
      this.deltaRot[0] = 0;
      this.deltaRot[1] = 0;
      this.deltaRot[2] = 0;
      this.deltaRot[3] = 1;
    }

    // calculate the current rotation using the delta quaternion
    return {
      rotation: quat4.multiply(this.lastRot, this.deltaRot, this.currentRot),
      zoom: this.currentZoom
    };
  },

  /**
   * Function handling the mousePressed event.
   * Call this when the mouse was pressed.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  mousePressed: function(x, y) {
    this.mouseX = x;
    this.mouseY = y;

    var radius = this.radius,
      width = this.width,
      height = this.height,
      mouseX = this.mouseX,
      mouseY = this.mouseY;

    this.pointToSphere(mouseX, mouseY, width, height, radius, this.startVec);
    quat4.set(this.currentRot, this.lastRot);
  },

  /**
   * Function handling the mouseDragged event.
   * Call this when the mouse was dragged.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  mouseDragged: function(x, y) {
    this.mouseDragX = x;
    this.mouseDragY = y;
  },

  /**
   * Function handling the mouseScroll event.
   * Call this when the mouse wheel was scrolled.
   *
   * @param {number} scroll: the mouse wheel direction and speed
   */
  mouseScroll: function(scroll) {
    this.scrollValue -= scroll * 10;
  },

  /**
   * Maps the 2d coordinates of the mouse location to a 3d point on a sphere.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   * @param {number} width: the width of canvas
   * @param {number} height: the height of canvas
   * @param {number} radius: optional, the radius of the arcball
   * @param {array} sphereVec: a 3d vector to store the sphere coordinates
   */
  pointToSphere: function(x, y, width, height, radius, sphereVec) {
    // adjust point coords and scale down to range of [-1..1]
    x = (x - width / 2) / radius;
    y = (y - height / 2) / radius;

    // compute the square length of the vector to the point from the center
    var sqlength = x * x + y * y,
      normal = 0;

    // if the point is mapped outside of the sphere  
    if (sqlength > 1) {
      // calculate the normalization factor
      normal = 1 / Math.sqrt(sqlength);

      // set the normalized vector (a point on the sphere)
      sphereVec[0] = x * normal;
      sphereVec[1] = y * normal;
      sphereVec[2] = 0;
    } else {
      // set the vector to a point mapped inside the sphere
      sphereVec[0] = x;
      sphereVec[1] = y;
      sphereVec[2] = Math.sqrt(1 - sqlength);
    }
  },

  /**
   * Resize this implementation to use different bounds.
   * This function is automatically called when the arcball is created.
   *
   * @param {number} width: the width of canvas
   * @param {number} height: the height of canvas
   * @param {number} radius: optional, the radius of the arcball
   */
  resize: function(newWidth, newHeight, newRadius) {
    // set the new width, height and radius dimensions
    this.width = newWidth;
    this.height = newHeight;
    this.radius = "undefined" !== typeof newRadius ? newRadius : newHeight;

    var radius = this.radius,
      width = this.width,
      height = this.height,
      mouseX = this.mouseX,
      mouseY = this.mouseY;

    this.pointToSphere(mouseX, mouseY, width, height, radius, this.startVec);
    quat4.set(this.currentRot, this.lastRot);
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
/*
 * jTiltExtensions.js - Various JavaScript shims and extensions
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
var EXPORTED_SYMBOLS = ["Tilt.Extensions.WebGL"];

/**
 * WebGL extensions
 */
Tilt.Extensions = {};
Tilt.Extensions.WebGL = {

  /**
   * JavaScript implementation of WebGL MOZ_dom_element_texture (#653656).
   * This shim renders a content window to a canvas element, but clamps the
   * maximum width and height of the canvas to MAX_TEXTURE_SIZE.
   * 
   * @param {object} contentWindow: the window content to draw
   */
  initDocumentImage: function(contentWindow) {
    var canvasgl, canvas2d, gl, ctx, maxSize, pWidth, pHeight, width, height;

    // use a canvas and a WebGL context to get the maximum texture size
    canvasgl = Tilt.Document.initCanvas();

    // use a custom canvas element and a 2d context to draw the window
    canvas2d = Tilt.Document.initCanvas();

    // create the WebGL context
    gl = Tilt.Renderer.prototype.create3DContext(canvasgl);
    maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // calculate the total width and height of the content page
    pWidth = contentWindow.innerWidth + contentWindow.scrollMaxX;
    pHeight = contentWindow.innerHeight + contentWindow.scrollMaxY;

    // calculate the valid width and height of the content page
    width = Tilt.Math.clamp(pWidth, 0, maxSize);
    height = Tilt.Math.clamp(pHeight, 0, maxSize);

    canvas2d.width = width;
    canvas2d.height = height;

    // use the 2d context.drawWindow() magic
    ctx = canvas2d.getContext("2d");
    ctx.drawWindow(contentWindow, 0, 0, width, height, "#fff");

    try {
      return canvas2d;
    }
    finally {
      canvasgl = null;
      canvas2d = null;
      gl = null;
      ctx = null;
    }
  }
};
/*
 * jTiltUtils.js - Various helper functions
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
"use strict";

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = [
  "Tilt.Iframe",
  "Tilt.Document",
  "Tilt.Image",
  "Tilt.Math",
  "Tilt.String"];
  
/** 
 * Utilities for accessing and manipulating a document.
 */
Tilt.Document = {
  
  /**
   *
   */
  currentContentDocument: undefined,
  
  /**
   *
   */
  currentParentNode: undefined,
  
  /**
   * Helper method, allowing to easily create and manage a canvas element.
   *
   * @param {number} width: specifies the width of the canvas
   * @param {number} height: specifies the height of the canvas
   * @param {boolean} append: true to append the canvas to the parent node
   * @param {string} id: optional, id for the created canvas element
   * @return {object} the newly created canvas
   */
  initCanvas: function(width, height, append, id) {
    if ("undefined" === typeof this.currentContentDocument) {
      this.currentContentDocument = document;
    }
    if ("undefined" === typeof this.currentParentNode) {
      this.currentParentNode = document.body;
    }
    
    var doc = this.currentContentDocument, node = this.currentParentNode;
    var canvas = doc.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.id = id;
    
    if (append) {
      this.append(canvas, node);
    }
    
    try {
      return canvas;
    }
    finally {
      doc = null;
      node = null;
      canvas = null;
    }
  },
  
  /**
   * Helper method, initializing a full screen canvas.
   * This is mostly likely useful in a plain html page with an empty body.
   *
   * @return {object} the newly created canvas
   */
  initFullScreenCanvas: function() {
    var width = window.innerWidth,
      height = window.innerHeight,
      canvas = this.initCanvas(width, height, true);
      
    canvas.setAttribute("style", "width: 100%; height: 100%;");
    this.currentParentNode.setAttribute("style", "margin: 0px 0px 0px 0px;");
    
    try {
      return canvas;
    }
    finally {
      canvas = null;
    }
  },
  
  /**
   * Appends an element to a specific node.
   *
   * @param {object} element: the element to be appended
   * @param {object} node: the node to append the element to
   */
  append: function(element, node) {
    try {
      node.appendChild(element);
    }
    finally {
      element = null;
      node = null;
    }
  },
  
  /**
   * Removes an element from the parent node.
   *
   * @param {object} element: the element to be removed
   */
  remove: function(element) {
    try {
      element.parentNode.removeChild(element);
    }
    finally {
      element = null;
    }
  },
  
  /**
   * Traverses a document object model and calls function for each node.
   * If the dom parameter is omitted, then the current content.document will
   * be used. The nodeCallback function will have the current node and depth
   * passed as parameters, and the readyCallback function will have the 
   * maximum depth passed as parameter.
   *
   * @param {Function} nodeCallback: the function to call for each node
   * @param {Function} readyCallback: called when no more nodes are found
   * @param {object} dom: the document object model to traverse
   */
  traverse: function(nodeCallback, readyCallback, dom) {    
    // used to calculate the maximum depth of a dom node
    var maxDepth = 0;
    
    // used internally for recursively traversing a document object model
    function recursive(nodeCallback, dom, depth) {
      var i, length, child;
      
      for (i = 0, length = dom.childNodes.length; i < length; i++) {
        child = dom.childNodes[i];
        
        if (depth > maxDepth) {
          maxDepth = depth;
        }
        
        // run the node callback function for each node, pass the depth, and 
        // also continue the recursion with all the children
        nodeCallback(child, depth);
        recursive(nodeCallback, child, depth + 1);
      }
    }
    
    try {
      if ("function" === typeof nodeCallback) {
        recursive(nodeCallback, dom || window.content.document, 0);
        nodeCallback = null;
      }
    
      // once we recursively traversed all the dom nodes, run a callback
      if ("function" === typeof readyCallback) {
        readyCallback(maxDepth);
        readyCallback = null;
      }
    }
    finally {
      dom = null;
    }
  },
  
  /**
   * Returns a node's absolute x, y, width and height coordinates.
   *
   * @param {object} node: the node which type needs to be analyzed
   * @return {object} an object containing the x, y, width and height coords
   */
  getNodeCoordinates: function(node) {
    var x = 0, y = 0, w = node.clientWidth, h = node.clientHeight;
    
    // if the node isn't the parent of everything
    if (node.offsetParent) {
      // calculate the offset recursively
      do {
        x += node.offsetLeft;
        y += node.offsetTop;
      } while ((node = node.offsetParent));
    }
    else {
      // just get the x and y coordinates of this node if available
      if (node.x) {
        x = node.x;
      }
      if (node.y) {
        y = node.y;
      }
    }
    
    try {
      // a bit more verbose than a simple array
      return {
        x: x,
        y: y,
        width: w,
        height: h
      };
    }
    finally {
      node = null;
    }
  },
  
  /**
   * Returns the string equivalent of a node type.
   * If the node type is invalid, undefined is returned.
   *
   * @param {object} node: the node which type needs to be analyzed
   * @return {string} the string equivalent of the node type
   */
  getNodeType: function(node) {
    var type;
    
    if (node.nodeType === 1) {
      type = "ELEMENT_NODE";
    }
    else if (node.nodeType === 2) {
      type = "ATTRIBUTE_NODE";
    }
    else if (node.nodeType === 3) {
      type = "TEXT_NODE";
    }
    else if (node.nodeType === 4) {
      type = "CDATA_SECTION_NODE";
    }
    else if (node.nodeType === 5) {
      type = "ENTITY_REFERENCE_NODE";
    }
    else if (node.nodeType === 6) {
      type = "ENTITY_NODE";
    }
    else if (node.nodeType === 7) {
      type = "PROCESSING_INSTRUCTION_NODE";
    }
    else if (node.nodeType === 8) {
      type = "COMMENT_NODE";
    }
    else if (node.nodeType === 9) {
      type = "DOCUMENT_NODE";
    }
    else if (node.nodeType === 10) {
      type = "DOCUMENT_TYPE_NODE";
    }
    else if (node.nodeType === 11) {
      type = "DOCUMENT_FRAGMENT_NODE";
    }
    else if (node.nodeType === 12) {
      type = "NOTATION_NODE";
    }
    
    try {
      return type;
    }
    finally {
      node = null;
    }
  }
};

/**
 *
 */
Tilt.Xhr = {
  
  /**
   * Handles a generic get request, performed on a specified url. When done,
   * it fires the ready callback function if it exists, & passes the http
   * request object and also an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {string} url: the url to perform the GET to
   * @param {Function} readyCallback: function to be called when request ready
   * @param {object} aParam: optional parameter passed to readyCallback
   */
  request: function(url, readyCallback, aParam) {
    var xhr = new XMLHttpRequest();
    
    xhr.open("GET", url, true);
    xhr.send(null);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if ("function" === typeof readyCallback) {
          readyCallback(xhr, aParam);
          readyCallback = null;
        }
      }
    };
  },
  
  /**
   * Handles multiple get requests from specified urls. When all requests are
   * completed, it fires the ready callback function if it exists, & passes
   * the http request object and an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {array} urls: an array of urls to perform the GET to
   * @param {Function} readyCallback: function called when all requests ready
   * @param {object} aParam: optional parameter passed to readyCallback
   */
  requests: function(urls, readyCallback, aParam) {
    var xhrs = [], finished = 0, i, length;
    
    function requestReady() {
      finished++;
      if (finished === urls.length) {
        if ("function" === typeof readyCallback) {
          readyCallback(xhrs, aParam);
          readyCallback = null;
        }
      }
    }
    
    function requestCallback(xhr, index) {
      xhrs[index] = xhr;
      requestReady();
    }
    
    for (i = 0, length = urls.length; i < length; i++) {
      this.request(urls[i], requestCallback, i);
    }
  }
};

/**
 * Various math functions required by the engine.
 */
Tilt.Math = {
  
  /**
   * Helper function, converts degrees to radians.
   *
   * @param {number} degrees: the degrees to be converted to radians
   * @return {number} the degrees converted to radians
   */
  radians: function(degrees) {
    return degrees * Math.PI / 180;
  },
  
  /**
   * Creates a rotation quaternion from axis-angle.
   * This function implies that the axis is a normalized vector.
   *
   * @param {array} axis: an array of elements representing the [x, y, z] axis
   * @param {number} angle: the angle of rotation
   * @param {array} out: optional parameter, the array to write the values to
   * @return {array} the quaternion as [x, y, z, w]
   */
  quat4fromAxis: function(axis, angle, out) {
    angle *= 0.5;
    
    var sin = Math.sin(angle),
        x = (axis[0] * sin), 
        y = (axis[1] * sin),
        z = (axis[2] * sin),
        w = Math.cos(angle);
        
    if ("undefined" === typeof out) {
      return [x, y, z, w];
    }
    else {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    }
  },
  
  /**
   * Creates a rotation quaternion from Euler angles.
   *
   * @param {number} yaw: the yaw angle of rotation
   * @param {number} pitch: the pitch angle of rotation
   * @param {number} roll: the roll angle of rotation
   * @param {array} out: optional parameter, the array to write the values to   
   * @return {array} the quaternion as [x, y, z, w]
   */
  quat4fromEuler: function(yaw, pitch, roll, out) {
    // basically we create 3 quaternions, for pitch, yaw and roll
    // and multiply those together
    var y = yaw   * 0.5,
        x = pitch * 0.5,
        z = roll  * 0.5,
        w,
        
        siny = Math.sin(z),
        sinp = Math.sin(y),
        sinr = Math.sin(x),
        cosy = Math.cos(z),
        cosp = Math.cos(y),
        cosr = Math.cos(x);
        
    x = sinr * cosp * cosy - cosr * sinp * siny;
    y = cosr * sinp * cosy + sinr * cosp * siny;
    z = cosr * cosp * siny - sinr * sinp * cosy;
    w = cosr * cosp * cosy + sinr * sinp * siny;
    
    if ("undefined" === typeof out) {
      return [x, y, z, w];
    }
    else {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    }
  },
  
  /**
   * Port of gluUnProject.
   *
   * @param {number} winX: the window point for the x value
   * @param {number} winY: the window point for the y value
   * @param {number} winZ: the window point for the z value; this should range
   * between 0 and 1, 0 meaning the near clipping plane and 1 for the far
   * @param {array} mvMatrix: the model view matrix
   * @param {array} projMatrix: the projection matrix
   * @param {number} viewportX: the viewport top coordinate
   * @param {number} viewportY: the viewport bottom coordinate
   * @param {number} viewportWidth: the viewport width coordinate
   * @param {number} viewportHeight: the viewport height coordinate
   * @return {array} the unprojected array
   */
  unproject: function(winX, winY, winZ, mvMatrix, projMatrix,
                      viewportX, viewportY, viewportWidth, viewportHeight) {
                                                
    var mvpMatrix = mat4.create();
    var coordinates = quat4.create();
    
    // compute the inverse of the perspective x model-view matrix
    mat4.multiply(projMatrix, mvMatrix, mvpMatrix);
    mat4.inverse(mvpMatrix);
    
    // transformation of normalized coordinates (-1 to 1)
    coordinates[0] = +((winX - viewportX) / viewportWidth * 2 - 1);
    coordinates[1] = -((winY - viewportY) / viewportHeight * 2 - 1);
    coordinates[2] = 2 * winZ - 1;
    coordinates[3] = 1;
    
    // now transform that vector into object coordinates
    mat4.multiplyVec4(mvpMatrix, coordinates);
    
    // invert to normalize x, y, and z values.
    coordinates[3] = 1 / coordinates[3];
    coordinates[0] *= coordinates[3];
    coordinates[1] *= coordinates[3];
    coordinates[2] *= coordinates[3];
    
    return coordinates;
  },
  
  /**
   * Create a ray between two points using the current modelview & projection
   * matrices. This is useful when creating a ray destined for 3d picking.
   *
   * @param {number} x0 the x coordinate of the first point
   * @param {number} y0 the y coordinate of the first point
   * @param {number} z0 the z coordinate of the first point
   * @param {number} x1 the x coordinate of the second point
   * @param {number} y1 the y coordinate of the second point
   * @param {number} z1 the z coordinate of the second point
   * @param {array} mvMatrix: the model view matrix
   * @param {array} projMatrix: the projection matrix
   * @param {number} viewportX: the viewport top coordinate
   * @param {number} viewportY: the viewport bottom coordinate
   * @param {number} viewportWidth: the viewport width coordinate
   * @param {number} viewportHeight: the viewport height coordinate
   * @return {array} a directional vector between the two unprojected points
   */
  createRay: function(x0, y0, z0, x1, y1, z1, mvMatrix, projMatrix,
                      viewportX, viewportY, viewportWidth, viewportHeight) {
    
    var p0, p1;
    
    // unproject the first point
    p0 = this.unproject(x0, y0, z0,
                        mvMatrix, projMatrix,
                        viewportX, viewportY, viewportWidth, viewportHeight);

    // unproject the second point
    p1 = this.unproject(x1, y1, z1,
                        mvMatrix, projMatrix,
                        viewportX, viewportY, viewportWidth, viewportHeight);
                        
    // subtract to obtain a directional vector
    return {
      position: p0,
      lookAt: p1,
      direction: vec3.normalize(vec3.subtract(p1, p0))
    };
  },
  
  /**
   * Intersect a ray with a 3D triangle.
   *
   * @param {array} v0: the [x, y, z] position of the first triangle point
   * @param {array} v1: the [x, y, z] position of the second triangle point
   * @param {array} v2: the [x, y, z] position of the third triangle point
   * @param {object} ray: a ray, containing position and direction vectors
   * @param {array} intersection: point to store the intersection to
   * @return {number} -1 if the triangle is degenerate, 
   *                   0 disjoint (no intersection)
   *                   1 intersects in unique point
   *                   2 the ray and the triangle are in the same plane
   */
  intersectRayTriangle: function(v0, v1, v2, ray, intersection) {
    var u = vec3.create(), v = vec3.create(), n = vec3.create(),
        w = vec3.create(), w0 = vec3.create(),
        pos = ray.position, dir = ray.direction,
        a, b, r, uu, uv, vv, wu, wv, D, s, t;
    
    if ("undefined" === typeof intersection) {
      intersection = vec3.create();
    }
    
    // get triangle edge vectors and plane normal
    vec3.subtract(v1, v0, u);
    vec3.subtract(v2, v0, v);
    
    // get the cross product
    vec3.cross(u, v, n);
    
    // check if triangle is degenerate
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) {
      return -1;
    }
    
    vec3.subtract(pos, v0, w0);
    a = -vec3.dot(n, w0);
    b = +vec3.dot(n, dir);
    
    if (Math.abs(b) < 0.0001) { // ray is parallel to triangle plane
      if (a == 0) {             // ray lies in triangle plane
        return 2;
      }
      else {
        return 0;               // ray disjoint from plane
      }            
    }
    
    // get intersect point of ray with triangle plane
    r = a / b;
    if (r < 0) {                // ray goes away from triangle
      return 0;                 // => no intersect
    }
    
    // intersect point of ray and plane
    vec3.add(pos, vec3.scale(dir, r), intersection);

    // check if the intersection is inside the triangle
    uu = vec3.dot(u, u);
    uv = vec3.dot(u, v);
    vv = vec3.dot(v, v);
    
    vec3.subtract(intersection, v0, w);
    wu = vec3.dot(w, u);
    wv = vec3.dot(w, v);

    D = uv * uv - uu * vv;

    // get and test parametric coords
    s = (uv * wv - vv * wu) / D;
    if (s < 0 || s > 1) {       // intersection is outside the triangle
      return 0;
    }
    t = (uv * wu - uu * wv) / D;
    if (t < 0 || (s + t) > 1) { // intersection is outside the triangle
      return 0;
    }

    return 1;                   // intersection is inside the triangle
  },
  
  /**
   * Returns if parameter is a power of two.
   *
   * @param {number} x: the number to be verified
   * @return {boolean} true if x is power of two
   */
  isPowerOfTwo: function (x) {
    return (x & (x - 1)) === 0;
  },
  
  /**
   * Returns the next closest power of two greater than a number.
   *
   * @param {number} x: the number to be converted
   * @return {number} the next closest power of two for x
   */
  nextPowerOfTwo: function(x) {
    var i;
    
    --x;
    for (i = 1; i < 32; i <<= 1) {
      x = x | x >> i;
    }
    return x + 1;
  },
  
  /**
   * A convenient way of limiting values to a set boundary.
   *
   * @param {number} value: the number to be limited
   * @param {number} min: the minimum allowed value for the number
   * @param {number} max: the maximum allowed value for the number
   */
  clamp: function(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  
  /**
   * Converts a hex color to rgba.
   *
   * @param {string} a color expressed in hex, or using rgb() or rgba()
   * @return {array} an array with 4 color components: red, green, blue, alpha
   * with ranges from 0..1
   */
  hex2rgba: function(color) {
    if ("undefined" !== typeof this[color]) {
      return this[color];
    }
    
    var rgba, r, g, b, a, cr, cg, cb, ca,
      hex = color.charAt(0) === "#" ? color.substring(1) : color;
    
    // e.g. "f00"
    if (hex.length === 3) {
      cr = hex.charAt(0);
      cg = hex.charAt(1);
      cb = hex.charAt(2);
      hex = [cr, cr, cg, cg, cb, cb, "ff"].join('');
    }
    // e.g. "f008" 
    else if (hex.length === 4) {
      cr = hex.charAt(0);
      cg = hex.charAt(1);
      cb = hex.charAt(2);
      ca = hex.charAt(3);
      hex = [cr, cr, cg, cg, cb, cb, ca, ca].join('');
    }
    // e.g. "rgba(255, 0, 0, 128)"
    else if (hex.match("^rgba") == "rgba") {
      rgba = hex.substring(5, hex.length - 1).split(',');
      rgba[0] /= 255;
      rgba[1] /= 255;
      rgba[2] /= 255;
      rgba[3] /= 255;
      
      this[color] = rgba;
      return rgba;
    }
    // e.g. "rgb(255, 0, 0)"
    else if (hex.match("^rgb") == "rgb") {
      rgba = hex.substring(4, hex.length - 1).split(',');
      rgba[0] /= 255;
      rgba[1] /= 255;
      rgba[2] /= 255;
      rgba[3] = 1;

      this[color] = rgba;
      return rgba;
    }
    
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
    a = hex.length === 6 ? 1 : parseInt(hex.substring(6, 8), 16) / 255;
    
    this[color] = [r, g, b, a];
    return [r, g, b, a];
  }
};

/**
 * Helper functions for manipulating strings.
 */
Tilt.String = {
  
  /**
   * Trims whitespace characters from the left and right side of a string.
   *
   * @param {string} str: the string to trim
   * @return {string} the trimmed string
   */
  trim: function(str) {
    return str.replace(/^\s+|\s+$/g, "");
  },
  
  /**
   * Trims whitespace characters from the left side a string.
   *
   * @param {string} str: the string to trim
   * @return {string} the trimmed string
   */
  ltrim: function(str) {
    return str.replace(/^\s+/, "");
  },
  
  /**
   * Trims whitespace characters from the right side a string.
   *
   * @param {string} str: the string to trim
   * @return {string} the trimmed string
   */
  rtrim: function(str) {
    return str.replace(/\s+$/, "");
  }
};

/**
 * Easy way to access the string bundle.
 * Usually useful only when this is used inside an extension environment.
 */
Tilt.StringBundle = {
  
  /** 
   * The bundle name used.
   */
  bundle: "tilt-string-bundle",
  
  /**
   * Returns a string in the string bundle.
   * If the string bundle is not found, the parameter string is returned.
   *
   * @param {string} string: the string name in the bundle
   * @return {string} the equivalent string from the bundle
   */
  get: function(string) {
    // undesired, you should always pass a defined string for the bundle
    if ("undefined" === typeof string) {
      return "undefined";
    }
    
    var elem = document.getElementById(this.bundle);
    try {
      if (elem) {
        // return the equivalent string from the bundle
        return elem.getString(string);
      }
      else {
        // this should never happen when inside a chrome environment
        return string;
      }
    }
    finally {
      elem = null;
    }
  },
  
  /**
   * Returns a formatted string using the string bundle.
   * If the string bundle is not found, the parameter arguments are returned.
   *
   * @param {string} string: the string name in the bundle
   * @param {array} args: an array of args for the formatted string
   * @return {string} the equivalent formatted string from the bundle
   */
  format: function(string, args) {
    // undesired, you should always pass a defined string for the bundle
    if ("undefined" === typeof string) {
      return "undefined";
    }
    // undesired, you should always pass arguments when formatting strings
    if ("undefined" === typeof args) {
      return string;
    }
    
    var elem = document.getElementById(this.bundle);
    try {
      if (elem) {
        // return the equivalent formatted string from the bundle
        return elem.getFormattedString(string, args);
      }
      else {
        // this should never happen when inside a chrome environment
        return [string, args].join(" ");
      }
    }
    finally {
      elem = null;
    }
  }
};

/**
 * Various console functions required by the engine.
 */
Tilt.Console = {
  
  /**
   * Logs a message to the console.
   * If this is not inside an extension environment, an alert() is used.
   *
   * @param {string} aMessage: the message to be logged
   */
  log: function(aMessage) {
    try {
      if ("undefined" === typeof aMessage) {
        aMessage = "undefined";
      }
      
      // get the console service
      var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
        
      // log the message
      consoleService.logStringMessage(aMessage);
    }
    catch(e) {
      // running from an unprivileged environment
      alert(aMessage);      
    }
  },
  
  /**
   * Logs an error to the console.
   * If this is not inside an extension environment, an alert() is used.
   *
   * @param {string} aMessage: the message to be logged
   * @param {string} aSourceName: the URL of file with error. This will be a 
   * hyperlink in the JavaScript Console, so you'd better use real URL. You 
   * may pass null if it's not applicable.
   * @param {string} aSourceLine: the line #aLineNumber from aSourceName file. 
   * You are responsible for providing that line. You may pass null if you are 
   * lazy; that will prevent showing the source line in JavaScript Console.
   * @param {string} aLineNumber: specify the exact location of error
   * @param {string} aColumnNumber: is used to draw the arrow pointing to the 
   * problem character.
   * @param {number} aFlags: one of flags declared in nsIScriptError. At the 
   * time of writing, possible values are: 
   *  nsIScriptError.errorFlag = 0
   *  nsIScriptError.warningFlag = 1
   *  nsIScriptError.exceptionFlag = 2
   *  nsIScriptError.strictFlag = 4
   * @param {string} aCategory: a string indicating what kind of code caused 
   * the message. There are quite a few category strings and they do not seem 
   * to be listed in a single place. Hopefully, they will all be listed in 
   * nsIScriptError.idl eventually.
   */
  error: function(aMessage, aSourceName, aSourceLine, 
                  aLineNumber, aColumnNumber, aFlags, aCategory) {
    try {
      if ("undefined" === typeof aMessage) {
        aMessage = "undefined";
      }
      
      // get the console service
      var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
        
      // also the script error service
      var scriptError = Components.classes["@mozilla.org/scripterror;1"]
        .createInstance(Components.interfaces.nsIScriptError);
        
      // initialize a script error
      scriptError.init(aMessage, aSourceName, aSourceLine,
                       aLineNumber, aColumnNumber, aFlags, aCategory);
                       
      // log the error
      consoleService.logMessage(scriptError);
    }
    catch(e) {
      // running from an unprivileged environment
      alert(aMessage);
    }
  }
};