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
var EXPORTED_SYMBOLS = ["Tilt.Document"];

/*global Exception */

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

    // this should never happen, but just in case
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
      "background: #000; margin: 0px; padding: 0px; overflow: hidden;");

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
   * maximum depth and total nodes passed as parameters.
   *
   * @param {Function} nodeCallback: the function to call for each node
   * @param {Function} readyCallback: called when no more nodes are found
   * @param {Boolean} traverseChildIframes: true if 'we need to go deeper'
   * @param {HTMLDocument} dom: the document object model to traverse
   */
  traverse: function(nodeCallback, readyCallback, traverseChildIframes, dom) {
    this.uid = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.sliceWidth = Number.MAX_VALUE;
    this.sliceHeight = Number.MAX_VALUE;

    // used to calculate the maximum depth of a dom node
    var maxDepth = 0,
      totalNodes = 0,

    // used internally for recursively traversing a document object model
    recursive = function(parent, depth) {
      var i, len, child, coord, offsetX, offsetY, sliceWidth, sliceHeight;

      for (i = 0, len = parent.childNodes.length; i < len; i++) {
        child = parent.childNodes[i];

        if (depth > maxDepth) {
          maxDepth = depth;
        }
        totalNodes++;
        this.uid++;

        // run the node callback function for each node, pass the depth
        nodeCallback(child, depth, totalNodes, this.uid,
          this.offsetX, this.offsetY, this.sliceWidth, this.sliceHeight);

        // also continue the recursion with all the children
        recursive(child, depth + 1);

        // iframes requrie special handling
        if (traverseChildIframes && child.localName === "iframe") {
          coord = Tilt.Document.getNodeCoordinates(child);
          offsetX = coord.x - window.content.pageXOffset;
          offsetY = coord.y - window.content.pageYOffset;
          sliceWidth = coord.width;
          sliceHeight = coord.height;

          this.offsetX += offsetX;
          this.offsetY += offsetY;
          this.sliceWidth = sliceWidth;
          this.sliceHeight = sliceHeight;
          recursive(child.contentDocument, depth + 1);
          this.offsetX -= offsetX;
          this.offsetY -= offsetY;
          this.sliceWidth = Number.MAX_VALUE;
          this.sliceHeight = Number.MAX_VALUE;
        }
      }
    }.bind(this);

    try {
      if ("function" === typeof nodeCallback) {
        recursive(dom || window.content.document, 0);
      }
      if ("function" === typeof readyCallback) {
        readyCallback(maxDepth, totalNodes);
      }
    }
    finally {
      dom = null;
    }
  },

  /**
   * Gets the full webpage dimensions (width and height);
   *
   * @param {Object} contentWindow: the content window holding the webpage
   * @return {Object} an object containing the width and height coords
   */
  getContentWindowDimensions: function(contentWindow) {
    var coords,
      size = {
        width: contentWindow.innerWidth + contentWindow.scrollMaxX,
        height: contentWindow.innerHeight + contentWindow.scrollMaxY
      };

    this.traverse(function(child) {
      coords = this.getNodeCoordinates(child);

      size.width = Math.max(size.width, coords.x||0 + coords.width||0);
      size.height = Math.max(size.height, coords.y||0 + coords.height||0);
    }.bind(this), null, contentWindow.document);

    return size;
  },

  /**
   * Returns a node's absolute x, y, width and height coordinates.
   *
   * @param {Object} node: the node which type needs to be analyzed
   * @return {Object} an object containing the x, y, width and height coords
   */
  getNodeCoordinates: function(node) {
    if (node.nodeType !== 1) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }

    var x, y, w, h, clientRect;

    try {
      if (window.content.location.href === "about:blank" &&
          (node.localName === "head" ||
           node.localName === "body")) {

        throw new Exception();
      }

      // this is the preferred way of getting the bounding client rectangle
      clientRect = node.getBoundingClientRect();
      x = window.content.pageXOffset;
      y = window.content.pageYOffset;

      // a bit more verbose than a simple array
      return {
        x: clientRect.left + x,
        y: clientRect.top + y,
        width: clientRect.width,
        height: clientRect.height
      };
    }
    catch(e) {
      x = 0;
      y = 0;
      w = node.clientWidth;
      h = node.clientHeight;

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
  },

  /**
   * Returns the attributes from a dom node as a string.
   *
   * @param {NamedNodeMap} attributes: attributes to be analyzed
   * @return {String} the custom attributes text
   */
  getAttributesString: function(attributes) {
    var attText = [],
      i, len;

    for (i = 0, len = attributes.length; i < len; i++) {
      attText.push(attributes[i].name + " = \"" + attributes[i].value + "\"");
    }

    return attText.join("\n") + "\n";
  },

  /**
   * Returns the modified css values from a computed style.
   *
   * @param {CSSComputedStyle} style: the style to analyze
   * @return {String} the custom css text
   */
  getModifiedCss: function(style) {
    var cssText = [], n, v, t, i,
      defaults = [
"background-attachment: scroll;",
"background-clip: border-box;",
"background-color: transparent;",
"background-image: none;",
"background-origin: padding-box;",
"background-position: 0% 0%;",
"background-repeat: repeat;",
"background-size: auto auto;",
"border-bottom-color: rgb(0, 0, 0);",
"border-bottom-left-radius: 0px;",
"border-bottom-right-radius: 0px;",
"border-bottom-style: none;",
"border-bottom-width: 0px;",
"border-collapse: separate;",
"border-left-color: rgb(0, 0, 0);",
"border-left-style: none;",
"border-left-width: 0px;",
"border-right-color: rgb(0, 0, 0);",
"border-right-style: none;",
"border-right-width: 0px;",
"border-spacing: 0px 0px;",
"border-top-color: rgb(0, 0, 0);",
"border-top-left-radius: 0px;",
"border-top-right-radius: 0px;",
"border-top-style: none;",
"border-top-width: 0px;",
"bottom: auto;",
"box-shadow: none;",
"caption-side: top;",
"clear: none;",
"clip: auto;",
"color: rgb(0, 0, 0);",
"content: none;",
"counter-increment: none;",
"counter-reset: none;",
"cursor: auto;",
"direction: ltr;",
"display: block;",
"empty-cells: -moz-show-background;",
"float: none;",
"font-family: serif;",
"font-size: 16px;",
"font-size-adjust: none;",
"font-stretch: normal;",
"font-style: normal;",
"font-variant: normal;",
"font-weight: 400;",
"height: 0px;",
"ime-mode: auto;",
"left: auto;",
"letter-spacing: normal;",
"line-height: 19.2px;",
"list-style-image: none;",
"list-style-position: outside;",
"list-style-type: disc;",
"margin-bottom: 8px;",
"margin-left: 8px;",
"margin-right: 8px;",
"margin-top: 8px;",
"marker-offset: auto;",
"max-height: none;",
"max-width: none;",
"min-height: 0px;",
"min-width: 0px;",
"opacity: 1;",
"outline-color: rgb(0, 0, 0);",
"outline-offset: 0px;",
"outline-style: none;",
"outline-width: 0px;",
"overflow: visible;",
"overflow-x: visible;",
"overflow-y: visible;",
"padding-bottom: 0px;",
"padding-left: 0px;",
"padding-right: 0px;",
"padding-top: 0px;",
"page-break-after: auto;",
"page-break-before: auto;",
"pointer-events: auto;",
"position: static;",
"quotes: \"“\" \"”\" \"‘\" \"’\";",
"resize: none;",
"right: auto;",
"table-layout: auto;",
"text-align: start;",
"text-decoration: none;",
"text-indent: 0px;",
"text-overflow: clip;",
"text-shadow: none;",
"text-transform: none;",
"top: auto;",
"unicode-bidi: embed;",
"vertical-align: baseline;",
"visibility: visible;",
"white-space: normal;",
"width: 1157px;",
"word-spacing: 0px;",
"word-wrap: normal;",
"z-index: auto;",
"-moz-animation-delay: 0s;",
"-moz-animation-direction: normal;",
"-moz-animation-duration: 0s;",
"-moz-animation-fill-mode: none;",
"-moz-animation-iteration-count: 1;",
"-moz-animation-name: none;",
"-moz-animation-play-state: running;",
"-moz-animation-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);",
"-moz-appearance: none;",
"-moz-background-inline-policy: continuous;",
"-moz-binding: none;",
"-moz-border-bottom-colors: none;",
"-moz-border-image: none;",
"-moz-border-left-colors: none;",
"-moz-border-right-colors: none;",
"-moz-border-top-colors: none;",
"-moz-box-align: stretch;",
"-moz-box-direction: normal;",
"-moz-box-flex: 0;",
"-moz-box-ordinal-group: 1;",
"-moz-box-orient: horizontal;",
"-moz-box-pack: start;",
"-moz-box-sizing: content-box;",
"-moz-column-count: auto;",
"-moz-column-gap: 16px;",
"-moz-column-rule-color: rgb(0, 0, 0);",
"-moz-column-rule-style: none;",
"-moz-column-rule-width: 0px;",
"-moz-column-width: auto;",
"-moz-float-edge: content-box;",
"-moz-font-feature-settings: normal;",
"-moz-font-language-override: normal;",
"-moz-force-broken-image-icon: 0;",
"-moz-hyphens: manual;",
"-moz-image-region: auto;",
"-moz-orient: horizontal;",
"-moz-outline-radius-bottomleft: 0px;",
"-moz-outline-radius-bottomright: 0px;",
"-moz-outline-radius-topleft: 0px;",
"-moz-outline-radius-topright: 0px;",
"-moz-stack-sizing: stretch-to-fit;",
"-moz-tab-size: 8;",
"-moz-text-blink: none;",
"-moz-text-decoration-color: rgb(0, 0, 0);",
"-moz-text-decoration-line: none;",
"-moz-text-decoration-style: solid;",
"-moz-transform: none;",
"-moz-transform-origin: 50% 50%;",
"-moz-transition-delay: 0s;",
"-moz-transition-duration: 0s;",
"-moz-transition-property: all;",
"-moz-transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);",
"-moz-user-focus: none;",
"-moz-user-input: auto;",
"-moz-user-modify: read-only;",
"-moz-user-select: auto;",
"-moz-window-shadow: default;",
"clip-path: none;",
"clip-rule: nonzero;",
"color-interpolation: srgb;",
"color-interpolation-filters: linearrgb;",
"dominant-baseline: auto;",
"fill: rgb(0, 0, 0);",
"fill-opacity: 1;",
"fill-rule: nonzero;",
"filter: none;",
"flood-color: rgb(0, 0, 0);",
"flood-opacity: 1;",
"image-rendering: auto;",
"lighting-color: rgb(255, 255, 255);",
"marker-end: none;",
"marker-mid: none;",
"marker-start: none;",
"mask: none;",
"shape-rendering: auto;",
"stop-color: rgb(0, 0, 0);",
"stop-opacity: 1;",
"stroke: none;",
"stroke-dasharray: none;",
"stroke-dashoffset: 0px;",
"stroke-linecap: butt;",
"stroke-linejoin: miter;",
"stroke-miterlimit: 4;",
"stroke-opacity: 1;",
"stroke-width: 1px;",
"text-anchor: start;",
"text-rendering: auto;"].join("\n");

    for (i = 0; i < style.length; i++) {
      n = style[i];
      v = style.getPropertyValue(n);
      t = n + ": " + v + ";";

      if (defaults.indexOf(t) === -1) {
        cssText.push(t);
      }
    }

    return cssText.join("\n") + "\n";
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Document);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Document", Tilt.Document);
