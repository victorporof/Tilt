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
if ("undefined" == typeof(Tilt)) {
  var Tilt = {};
};
if ("undefined" == typeof(Tilt.Extensions)) {
  Tilt.Extensions = {};
};

var EXPORTED_SYMBOLS = ["Tilt.Extensions.WebGL"];

/**
 * WebGL extensions
 */
Tilt.Extensions.WebGL = {

  /**
   * JavaScript implementation of WebGL MOZ_dom_element_texture (#653656)
   * extension. It requires a callback function & optionally a contentWindow.
   * If unspecified, the contentWindow will default to the window.content.
   * The newly created image will be passed as a parameter to readyCallback.
   * 
   * @param {function} readyCallback: function called when drawing is finished
   * @param {object} contentWindow: optional, the window to draw
   */
  initDocumentImage: function(readyCallback, contentWindow) {
    // Using a custom canvas element and a 2d context to draw the window
    Tilt.Document.initCanvas(function initCallback(canvas) {
      if (!contentWindow) {
        contentWindow = window.content;
      }
      
      // FIXME: set the maximum texture size dynamically
      var width = Tilt.Math.clamp(contentWindow.innerWidth + 
                                  contentWindow.scrollMaxX, 0, 4096);
                                        
      var height = Tilt.Math.clamp(contentWindow.innerHeight + 
                                   contentWindow.scrollMaxY, 0, 4096);
                                         
      canvas.width = width;
      canvas.height = height;
      
      var context = canvas.getContext("2d");
      context.drawWindow(contentWindow, 0, 0, width, height, "#fff");
      
      if ("function" === typeof(readyCallback)) {
        readyCallback(canvas);
      } 
    }, false);
  }
};