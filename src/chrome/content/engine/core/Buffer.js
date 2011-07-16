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
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    for (var i in this) {
      delete this[i];
    }
  }
};
