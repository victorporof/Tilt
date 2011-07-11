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