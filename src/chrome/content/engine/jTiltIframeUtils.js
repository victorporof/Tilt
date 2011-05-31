/* 
 * jTiltIframeUtils.js - Helper functions for manipulating iframes
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
if ("undefined" == typeof(TiltIframe)) {
  var TiltIframe = {};
};

/**
 * Utilities for creating, using and removing iframes.
 */
TiltIframe.Utils = {
  
  /**
   * Helper method, allowing to easily create an iframe with a canvas element,
   * anytime, anywhere.
   */
  initCanvas: function(loadCallback, keepInStack, iframe_id, canvas_id) {
    if (!iframe_id) {
      var iframe_id = "tilt-iframe";
    }
    if (!canvas_id) {
      var canvas_id = "tilt-canvas";
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