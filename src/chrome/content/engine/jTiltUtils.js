/*
 * jTiltUtils.js - Helper functions
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
if ("undefined" == typeof(TiltUtils)) {
  var TiltUtils = {};
};

/**
 * Utilities for creating, using and removing iframes.
 */
TiltUtils.Iframe = {

  /**
   * Helper method, allowing to easily create an iframe with a canvas element,
   * anytime, anywhere.
   */
  initCanvas: function(loadCallback, keepInStack, iframe_id, canvas_id) {
    if (!iframe_id) {
      iframe_id = "tilt-iframe";
    }
    if (!canvas_id) {
      canvas_id = "tilt-canvas";
    }

    var iframe = document.createElement("iframe");
    iframe.id = iframe_id;
    iframe.setAttribute("transparent", "true");
    iframe.flex = 1;

    var that = this;
    iframe.addEventListener("load", function loadCallbackEventListener() {
      iframe.removeEventListener("load", loadCallbackEventListener, true);

      if (loadCallback) {
        var canvas = iframe.contentDocument.getElementById(canvas_id);
        loadCallback(iframe, canvas);
      }
      if (!keepInStack) {
        that.removeFromStack(iframe);
      }
    }, true);

    iframe.setAttribute("src", 'data:text/html,\
    <html>\
      <body style="margin: 0px 0px 0px 0px;">\
        <canvas id="' + canvas_id + '"/>\
      </body>\
    </html>');

    return this.appendToStack(iframe);
  },

  /**
   * Appends an iframe to the current selected browser parent node.
   */
  appendToStack: function(iframe) {
    window.gBrowser.selectedBrowser.parentNode.appendChild(iframe);
    return iframe;
  },

  /**
   * Removes an iframe to the current selected browser parent node.
   */
  removeFromStack: function(iframe) {
    window.gBrowser.selectedBrowser.parentNode.removeChild(iframe);
    return iframe;
  }
}

/**
 * Utilities for manipulating images.
 */
TiltUtils.Image = {

  /**
   * Scales an image to power of two width and height.
   */
  resizeToPowerOfTwo: function(image, readyCallback, forceResize) {
    if (TiltUtils.Math.isPowerOfTwo(image.width) &&
        TiltUtils.Math.isPowerOfTwo(image.height) && !forceResize) {

      if (readyCallback) {
        readyCallback(image);
        return;
      }
    }

    var iframe_id = "tilt-iframe-" + image.src;
    var canvas_id = "tilt-canvas-" + image.src;

    TiltUtils.Iframe.initCanvas(function loadCallback(iframe, canvas) {
      canvas.width = TiltUtils.Math.nextPowerOfTwo(image.width);
      canvas.height = TiltUtils.Math.nextPowerOfTwo(image.height);

      var context = canvas.getContext('2d');
      context.drawImage(image,
        0, 0, image.width, image.height,
        0, 0, canvas.width, canvas.height);

      if (readyCallback) {
        readyCallback(canvas);
      }
    }, false, iframe_id, canvas_id);
  }
}

/**
 * Various math functions required by the engine.
 */
TiltUtils.Math = {

  /**
   * Helper function, converts degrees to radians.
   */
  radians: function(degrees) {
    return degrees * Math.PI / 180;
  },

  /**
   * Returns if parameter is a power of two.
   */
  isPowerOfTwo: function (x) {
    return (x & (x - 1)) == 0;
  },

  /**
   * Returns the next highest power of two for a number.
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
   */
  hex2rgba: function(hex) {
    hex = hex.charAt(0) == "#" ? hex.substring(1, 7) : hex;

    if (hex.length == 3) {
      hex = hex.charAt(0) + hex.charAt(0) +
            hex.charAt(1) + hex.charAt(1) +
            hex.charAt(2) + hex.charAt(2);
    }
    else if (hex.match("^rgba") == "rgba") {
      return hex.substring(5, hex.length - 1).split(',');
    }
    else if (hex.match("^rgb") == "rgb") {
      return hex.substring(4, hex.length - 1).split(',');
    }

    var r = parseInt(hex.substring(0, 2), 16) / 255;
    var g = parseInt(hex.substring(2, 4), 16) / 255;
    var b = parseInt(hex.substring(4, 6), 16) / 255;

    return [r, g, b, 1];
  }
}

/**
 * Easy way to access the string bundle.
 */
TiltUtils.StringBundle = {
  
  /** 
   * The bundle name used.
   */
  bundle: "tilt-string-bundle",
  
  /**
   * Returns a string in the string bundle.
   */
  get: function(string) {
    return document.getElementById(this.bundle).getString(string);
  },
  
  /**
   * Returns a formatted string using the string bundle.
   */
   format: function(string, args) {
     return document.getElementById(this.bundle).getFormattedString(string,       
                                                                    args);
   }
}

/**
 * Various console functions required by the engine.
 */
TiltUtils.Console = {
  
  /**
   * Logs a message to the console.
   */
  log: function(aMessage) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);
    
    consoleService.logStringMessage(aMessage);
  },
  
  /**
   * Logs an error to the console.
   */
  error: function(aMessage, aSourceName, aSourceLine, aLineNumber, 
                  aColumnNumber, aFlags, aCategory) {

    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);

    var scriptError = Components.classes["@mozilla.org/scripterror;1"]
    .createInstance(Components.interfaces.nsIScriptError);
    
    scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, 
                     aColumnNumber, aFlags, aCategory);

    consoleService.logMessage(scriptError);
  }
}