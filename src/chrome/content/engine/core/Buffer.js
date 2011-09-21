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
var EXPORTED_SYMBOLS = ["Tilt.VertexBuffer", "Tilt.IndexBuffer"];

/**
 * Vertex buffer constructor.
 * Creates a vertex buffer containing an array of elements.
 *
 * @param {Tilt.Renderer} renderer: an instance of Tilt.Renderer
 * @param {Array} elementsArray: an array of floats
 * @param {Number} itemSize: how many items create a block
 * @param {Number} numItems: optional, how many items to use from the array
 * @return {Tilt.VertexBuffer} the newly created object
 */
Tilt.VertexBuffer = function(elementsArray, itemSize, numItems) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.VertexBuffer", this);

  /**
   * The array buffer.
   */
  this.$ref = null;

  /**
   * Array of number components contained in the buffer.
   */
  this.components = null;

  /**
   * Variables defining the internal structure of the buffer.
   */
  this.itemSize = 0;
  this.numItems = 0;

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
    var gl = Tilt.$gl;

    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length / itemSize;
    }

    // create the Float32Array using the elements array
    this.components = new Float32Array(elementsArray);

    // create an array buffer and bind the elements as a Float32Array
    this.$ref = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.$ref);
    gl.bufferData(gl.ARRAY_BUFFER, this.components, gl.STATIC_DRAW);

    // remember some properties, useful when binding the buffer to a shader
    this.itemSize = itemSize;
    this.numItems = numItems;

    // cleanup
    elementsArray = null;
    gl = null;
  },

  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    try { Tilt.$gl.deleteBuffer(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};

/**
 * IndexBuffer constructor.
 * Creates an index buffer containing an array of indices.
 *
 * @param {Array} elementsArray: an array of unsigned integers
 * @param {Number} numItems: how many items to use from the array
 * @return {Tilt.IndexBuffer} the newly created object
 */
Tilt.IndexBuffer = function(elementsArray, numItems) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.IndexBuffer", this);

  /**
   * The element array buffer.
   */
  this.$ref = null;

  /**
   * Array of number components contained in the buffer.
   */
  this.components = null;

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
    var gl = Tilt.$gl;

    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length;
    }

    // create the Uint16Array using the elements array
    this.components = new Uint16Array(elementsArray);

    // create an array buffer and bind the elements as a Uint16Array
    this.$ref = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.$ref);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.components, gl.STATIC_DRAW);

    // remember some properties, useful when binding the buffer to a shader
    this.itemSize = 1;
    this.numItems = numItems;

    // cleanup
    elementsArray = null;
    gl = null;
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    try { Tilt.$gl.deleteBuffer(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};
