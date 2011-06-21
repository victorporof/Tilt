/*
 * jTiltExtensions.js - various JavaScript shims and extensions
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
if ("undefined" == typeof(TiltExtensions)) {
  var TiltExtensions = {};
};

var EXPORTED_SYMBOLS = ["TiltExtensions.WebGL"];

/**
 * WebGL extensions
 */
TiltExtensions.WebGL = {

  /**
   * JavaScript implementation of WebGL MOZ_dom_element_texture (#653656)
   * extension. It requres a callback function, a window, width & height.
   * If unspecified, contentWindow will default to the gBrowser.contentWindow.
   * Also, if unspecified, the width and height default to the contentWindow 
   * innerWidth and innerHeight. The newly created image will be passed as a  
   * parameter to the readyCallback function.
   * 
   * @param {function} readyCallback: function called when drawing is finished
   * @param {number} width: the width of the MOZ_dom_element_texture
   * @param {number} height: the height of the MOZ_dom_element_texture
   * @param {object} window: optional, the window to draw
   */
  initDocumentImage: function(readyCallback, contentWindow, width, height) {
    // Using a custom iframe with a canvas context element to draw the window
    TiltUtils.Document.initCanvas(function initCallback(canvas) {
      if (!contentWindow) {
        contentWindow = gBrowser.contentWindow;
      }
      if (!width) {
        width = contentWindow.innerWidth;
      }
      if (!height) {
        height = contentWindow.innerHeight;
      }
    
      canvas.width = width;
      canvas.height = height;
    
      var context = canvas.getContext('2d');
      context.drawWindow(contentWindow, 0, 0, width, height, "#fff");
    
      if (readyCallback) {
        readyCallback(canvas);
      } 
    }, false);
  }
}