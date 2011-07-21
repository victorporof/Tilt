/*
 * Document.js - Various helper functions for manipulating the DOM
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
var EXPORTED_SYMBOLS = ["Tilt.Document"];

/**
 * Utilities for accessing and manipulating a document.
 */
Tilt.Document = {

  /**
   * Current document object used when creating elements.
   * If unspecified, it will default to the window.document variable.
   */
  currentContentDocument: undefined,

  /**
   * Current parent node object used when appending elements.
   * If unspecified, it will default to the window.document.body variable.
   */
  currentParentNode: undefined,

  /**
   * Helper method, allowing to easily create and manage a canvas element.
   *
   * @param {Number} width: specifies the width of the canvas
   * @param {Number} height: specifies the height of the canvas
   * @param {Boolean} append: true to append the canvas to the parent node
   * @param {String} id: optional, id for the created canvas element
   * @return {HTMLCanvasElement} the newly created canvas element
   */
  initCanvas: function(width, height, append, id) {
    if ("undefined" === typeof this.currentContentDocument) {
      this.currentContentDocument = document;
    }
    if ("undefined" === typeof this.currentParentNode) {
      this.currentParentNode = document.body;
    }

    var doc = this.currentContentDocument,
      node = this.currentParentNode,
      canvas;

    if ("undefined" === typeof doc || doc === null ||
        "undefined" === typeof node || node === null) {

      return null;
    }

    // create the canvas element
    canvas = doc.createElement("canvas");
    canvas.setAttribute("style", "width: 100%; height: 100%;");
    canvas.width = width;
    canvas.height = height;
    canvas.id = id;

    // append the canvas element to the current parent node, if specified
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
   * Helper method, initializing a canvas stretching the entire window.
   * This is mostly likely useful in a plain html page with an empty body.
   *
   * @return {HTMLCanvasElement} the newly created canvas
   */
  initFullScreenCanvas: function() {
    var width = window.innerWidth,
      height = window.innerHeight,
      canvas = this.initCanvas(width, height, true);
    
    this.currentParentNode.setAttribute("style",
      "background:#000; margin: 0px; padding: 0px; overflow: hidden;");

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
   * @param {Object} element: the element to be appended
   * @param {Object} node: the node to append the element to
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
   * @param {Object} element: the element to be removed
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
   * @param {HTMLDocument} dom: the document object model to traverse
   */
  traverse: function(nodeCallback, readyCallback, dom) {
    // used to calculate the maximum depth of a dom node
    var maxDepth = 0;

    // used internally for recursively traversing a document object model
    function recursive(nodeCallback, dom, depth) {
      var i, len, child;

      for (i = 0, len = dom.childNodes.length; i < len; i++) {
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
      }

      // once we recursively traversed all the dom nodes, run a callback
      if ("function" === typeof readyCallback) {
        readyCallback(maxDepth);
      }
    }
    finally {
      dom = null;
    }
  },

  /**
   * Returns a node's absolute x, y, width and height coordinates.
   *
   * @param {Object} node: the node which type needs to be analyzed
   * @return {Object} an object containing the x, y, width and height coords
   */
  getNodeCoordinates: function(node) {
    try {
      if (node.localName === "head" || node.localName === "body")
        throw new Exception();

      // this is the preferred way of getting the bounding client rectangle
      var clientRect = node.getBoundingClientRect();

      // a bit more verbose than a simple array
      return {
        x: clientRect.left + window.content.pageXOffset,
        y: clientRect.top + window.content.pageYOffset,
        width: clientRect.width,
        height: clientRect.height
      };
    }
    catch (e) {
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
   * @param {Object} node: the node which type needs to be analyzed
   * @return {String} the string equivalent of the node type
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
