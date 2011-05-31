/* 
 * browserOverlay.js - TiltChrome namespace
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
if ("undefined" == typeof(TiltChrome)) {
  var TiltChrome = {};
};

/**
 * Controls the browser overlay for the Tilt extension.
 */
TiltChrome.BrowserOverlay = {
  
  /**
   * The iframe containing the canvas element, used for rendering.
   */
  iframe: undefined,
  
  /*
   * Visualization logic and drawing loop.
   */
  visualization: undefined,
  
  /**
   * Initializes Tilt.
   */
  initialize: function(aEvent) {
    Components.utils.forceGC();

    TiltIframe.Utils.initCanvas(function loadCallback(iframe, canvas) {
      this.iframe = iframe;
      
      canvas.width = iframe.contentWindow.innerWidth;
      canvas.height = iframe.contentWindow.innerHeight;
      
      this.visualization = new TiltVisualization(canvas);
      this.visualization.setup();
      this.visualization.loop();
    }, true);
  },
  
  /**
   * Destroys Tilt, removing the iframe from the stack.
   */
  destroy: function() {
    Components.utils.forceGC();
    // TODO
  }
};