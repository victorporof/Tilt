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
   * extension. It requres three parameters: width, height and a callback.
   * If unspecified, the width and height default to the contentWindow 
   * innerWidth and innerHeight. The newly created image will be passed as a  
   * parameter to the readyCallback function.
   * 
   * @param {function} readyCallback: function called when drawing is finished
   * @param {number} width: the width of the MOZ_dom_element_texture
   * @param {number} height: the height of the MOZ_dom_element_texture
   */
  initDocumentImage: function(readyCallback, width, height) {

    // Using a custom iframe with a canvas context element to draw the window
    TiltUtils.Iframe.initCanvas(function initCallback(iframe, canvas) {
      if (!width) {
        width = iframe.contentWindow.innerWidth;
      }
      if (!height) {
        height = iframe.contentWindow.innerHeight;
      }
    
      canvas.width = width;
      canvas.height = height;
    
      var context = canvas.getContext('2d');
      
      // FIXME: custom browser
      context.drawWindow(window.gBrowser.selectedBrowser.contentWindow, 
                         0, 0, width, height, "rgb(255, 255, 255)");
    
      if (readyCallback) {
        readyCallback(canvas);
      } 
    }, false);
  }
}