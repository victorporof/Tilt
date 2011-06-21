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
if ("undefined" === typeof(TiltUtils)) {
  var TiltUtils = {};
}

var EXPORTED_SYMBOLS = [
  "TiltUtils.Iframe",
  "TiltUtils.Document",
  "TiltUtils.Image",
  "TiltUtils.Math",
  "TiltUtils.String"];

/**
 * Creates a WebGL context.
 *
 * @param {object} canvas: the canvas to get context from
 * @return {object} the created context.
 */
function create3DContext(canvas, opt_attribs) {
  var names = ["experimental-webgl", "webgl", "webkit-3d", "moz-webgl"];
  var context = null;
  for (var i = 0; i < names.length; ++i) {
    try {
      context = canvas.getContext(names[i], opt_attribs);
    } catch(e) { }

    if (context) {
      break;
    }
  }
  return context;
};

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
window.requestAnimFrame = (function() {
  return window.requestAnimFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback, Element) {
           window.setTimeout(callback, 1000 / 60);
         };
})();

/** 
 * Utilities for accessing and manipulating a document.
 */
TiltUtils.Document = {

  /**
   * Helper method, allowing to easily create an iframe with a canvas element
   * if running in a chrome environment. If this is running from a html page, 
   * just a canvas element is directly created.
   * When loaded, the readyCallback function is called with the canvas and the
   * iframe passed as parameters to it. You can also use the specified 
   * iframe or canvas id to get the elements by id.
   *
   * @param {function} readyCallback: function called when initialization done
   * @param {boolean} keepInStack: true if the iframe should be retained
   * @param {string} iframe_id: optional, id for the created iframe
   * @param {string} canvas_id: optional, id for the created canvas element
   * @param {string} type: optional, the type of the iframe
   * @return {object} the newly created iframe or canvas
   */
  initCanvas: function(readyCallback, keepInStack, canvas_id, iframe_id) {
    if (!canvas_id) {
      canvas_id = "tilt-canvas";
    }    
    if (!iframe_id) {
      iframe_id = "tilt-iframe";
    }
    
    var that = this;

    if ("undefined" !== typeof(gBrowser)) {
      var iframe = document.createElement("iframe");
      iframe.setAttribute("style", "visibility: hidden;");
      iframe.id = iframe_id;

      iframe.addEventListener("load", function loadCallback() {
        iframe.removeEventListener("load", loadCallback, true);

        if (readyCallback) {
          var canvas = iframe.contentDocument.getElementById(canvas_id);
          readyCallback(canvas, iframe);
        }
        if (!keepInStack) {
          that.remove(iframe);
        }
        else {
          iframe.setAttribute("style", "visibility: visible;");
        }
      }, true);

      iframe.setAttribute("src", 'data:text/html,\
      <html>\
        <body style="margin: 0px 0px 0px 0px;">\
          <canvas id="' + canvas_id + '"/>\
        </body>\
      </html>');

      return that.append(iframe);
    }
    else {
      var canvas = document.createElement("canvas");
      canvas.setAttribute("style", "visibility: hidden;");
      canvas.id = canvas_id;

      that.append(canvas);

      if (readyCallback) {
        readyCallback(canvas);
      }
      if (!keepInStack) {
        that.remove(canvas);
      }
      else {
        canvas.setAttribute("style", "visibility: visible;");
      }
      
      return canvas;
    }
  },
  
  /**
   * Appends an element to a specific node.
   * If the node is not specified, it defaults to selectedBrowser.parentNode.
   *
   * @param {object} iframe: the element to be appended
   * @param {object} node: the node to append the element to
   * @return {object} the same iframe
   */
  append: function(element, node) {
    if (!node) {
      if ("undefined" !== typeof(gBrowser)) {
        node = gBrowser.selectedBrowser.parentNode;
      }
      else {
        node = document.body;
      }
    }
    
    node.appendChild(element);
    return element;
  },

  /**
   * Removes an element from it's parent node.
   *
   * @param {object} iframe: the iframe to be removed
   * @return {object} the same iframe
   */
  remove: function(element) {
    element.parentNode.removeChild(element);
    return element;
  },
  
  /**
   * Returns the current content document.
   *
   * @return {object} the current content document
   */
  get: function() {
    return window.content.document;
  },
  
  /**
   * Traverses a document object model and calls function for each node.
   * If the dom parameter is ommited, then the window.content.document will
   * be used. The nodeCallback function will have the current node and depth
   * passed as parameters, and the readyCallback function will have the 
   * entire dom passed as parameter.
   *
   * @param {function} nodeCallback: the function to call for each node
   * @param {function} readyCallback: called when no more nodes are found
   * @param {object} dom: the document object model to traverse
   */
  traverse: function(nodeCallback, readyCallback, dom) {
    if (nodeCallback) {
      recursive(nodeCallback, dom ? dom : this.get(), 0);
    }

    // Used internally for recursively traversing a document object model
    function recursive(nodeCallback, dom, depth) {
      for (var i = 0, len = dom.childNodes.length; i < len; i++) {
        var child = dom.childNodes[i];
        
        nodeCallback(child, depth);
        recursive(nodeCallback, child, depth + 1);
      }
    }
    
    if (readyCallback) {
      readyCallback(dom ? dom : this.get());
    }
  },
  
  /**
   * Returns a node's absolute x, y, width and height coordinates.
   *
   * @param {object} node: the node which type needs to be analyzed
   * @return {object} an object containing the x, y, width and height coords
   */
  getNodeCoordinates: function(node) {
    var x = y = 0;
    var w = node.clientWidth;
    var h = node.clientHeight;
    
    if (node.offsetParent) {
      do {
        x += node.offsetLeft;
        y += node.offsetTop;
    	} while (node = node.offsetParent);
    }
    else {
      if (node.x) {
        x = node.x;
      }
      if (node.y) {
        y = node.y;
      }
    }
    
    return {
      x: x,
      y: y,
      width: w,
      height: h
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
    
    return type;
  }
};

/**
 * Utilities for manipulating images.
 */
TiltUtils.Image = {

  /**
   * Scales an image to power of two width and height.
   * If the image already has power of two dimensions, the readyCallback
   * function is called immediately. In either case the newly created image
   * will be passed to the readyCallback function.
   *
   * @param {object} image: the image to be scaled
   * @param {function} readyCallback: function called when scaling is finished
   * @param {string} fillColor: optional, color to fill the transparent bits
   * @param {string} strokeColor: optional, color to draw an outline
   * @param {number} strokeWeight: optional, the width of the outline
   * @param {boolean} forceResize: true if image should be resized regardless
   * if it already has power of two dimensions
   */
  resizeToPowerOfTwo: function(image, readyCallback,
                               fillColor, strokeColor, strokeWeight,
                               forceResize) {
                                 
    if (TiltUtils.Math.isPowerOfTwo(image.width) &&
        TiltUtils.Math.isPowerOfTwo(image.height) && !forceResize) {

      if (readyCallback) {
        readyCallback(image);
        return;
      }
    }

    var canvas_id = "tilt-canvas-" + image.src;
    var iframe_id = "tilt-iframe-" + image.src;

    TiltUtils.Document.initCanvas(function initCallback(canvas) {
      canvas.width = TiltUtils.Math.nextPowerOfTwo(image.width);
      canvas.height = TiltUtils.Math.nextPowerOfTwo(image.height);

      var context = canvas.getContext('2d');

      if (fillColor) {
        context.fillStyle = fillColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      context.drawImage(image,
        0, 0, image.width, image.height,
        0, 0, canvas.width, canvas.height);

      if (strokeColor) {
        if (!strokeWeight) {
          strokeWeight = 1;
        }
        context.strokeStyle = strokeColor;
        context.lineWidth = strokeWeight;
        context.strokeRect(0, 0, canvas.width, canvas.height);
      }

      if (readyCallback) {
        readyCallback(canvas);
      }
    }, false, canvas_id, iframe_id);
  }
};

/**
 * Various math functions required by the engine.
 */
TiltUtils.Math = {

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
    --x;
    for (var i = 1; i < 32; i <<= 1) {
      x = x | x >> i;
    }
    return x + 1;
  },

  /**
   * Converts a hex color to rgba.
   *
   * @param {string} a color expressed in hex, or using rgb() or rgba()
   * @return {array} an array with 4 color components: red, green, blue, alpha
   * with ranges from 0..1
   */
  hex2rgba: function(hex) {
    hex = hex.charAt(0) === "#" ? hex.substring(1) : hex;

    if (hex.length === 3) {
      var r = parseInt(hex.charAt(0), 16);
      var g = parseInt(hex.charAt(1), 16);
      var b = parseInt(hex.charAt(2), 16);
      return [r * r / 255, g * g / 255, b * b / 255, 1];
    }
    else if (hex.length === 4) {
      var r = parseInt(hex.charAt(0), 16);
      var g = parseInt(hex.charAt(1), 16);
      var b = parseInt(hex.charAt(2), 16);
      var a = parseInt(hex.charAt(3), 16);
      return [r * r / 255, g * g / 255, b * b / 255, a * a / 255];
    }
    else if (hex.match("^rgba") == "rgba") {
      var rgba = hex.substring(5, hex.length - 1).split(',');
      rgba[0] /= 255;
      rgba[1] /= 255;
      rgba[2] /= 255;
      rgba[3] /= 255;
      return rgba;
    }
    else if (hex.match("^rgb") == "rgb") {
      var rgba = hex.substring(4, hex.length - 1).split(',');
      rgba[0] /= 255;
      rgba[1] /= 255;
      rgba[2] /= 255;
      rgba[3] = 1;
      return rgba;
    }
    else {
      var r = parseInt(hex.substring(0, 2), 16) / 255;
      var g = parseInt(hex.substring(2, 4), 16) / 255;
      var b = parseInt(hex.substring(4, 6), 16) / 255;
      var a = parseInt(hex.substring(6, 8), 16) / 255;
      return [r, g, b, a];
    }
  }
};

/**
 * Helper functions for manipulating strings.
 */
TiltUtils.String = {
  
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
 * Usually useful only when this is used inside an extension evironment.
 */
TiltUtils.StringBundle = {
  
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
    if (!string) {
      return "undefined";
    }
    
    var elem = document.getElementById(this.bundle);
    if (elem) {
      return elem.getString(string);
    }
    else {
      return string;
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
    if (!string) {
      return "undefined";
    }
    if (!args) {
      return string;
    }

    var elem = document.getElementById(this.bundle);
    if (elem) {
      return elem.getFormattedString(string, args);
    }
    else {
      return string + " " + args;
    }
  }
};

/**
 * Various console functions required by the engine.
 */
TiltUtils.Console = {
  
  /**
   * Logs a message to the console.
   * If this is not inside an extension environment, an alert() is used
   *
   * @param {string} aMessage: the message to be logged
   */
  log: function(aMessage) {
    try {
      if (!aMessage) {
        aMessage = "undefined";
      }
      
      var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
    
      consoleService.logStringMessage(aMessage);
    }
    catch(exception) {
      alert(aMessage);      
    }
  },

  /**
   * Logs an error to the console.
   * If this is not inside an extension environment, an alert() is used
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
  error: function(aMessage, aSourceName, aSourceLine, aLineNumber, 
                  aColumnNumber, aFlags, aCategory) {
    try {
      if (!aMessage) {
        aMessage = "undefined";
      }

      var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);

      var scriptError = Components.classes["@mozilla.org/scripterror;1"]
        .createInstance(Components.interfaces.nsIScriptError);

      scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, 
                       aColumnNumber, aFlags, aCategory);

      consoleService.logMessage(scriptError);
    }
    catch(exception) {
      alert(aMessage);
    }
  }
};