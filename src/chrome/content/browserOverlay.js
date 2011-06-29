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
if ("undefined" === typeof(TiltChrome)) {
  var TiltChrome = {};
}

/**
 * Controls the browser overlay for the Tilt extension.
 */
TiltChrome.BrowserOverlay = {
  
  /**
   * The iframe containing the canvas element, used for rendering.
   */
  iframe: null,
  
  /*
   * Visualization logic and drawing loop.
   */
  visualization: null,
    
  /**
   * Initializes Tilt.
   * @param {object XULCommandEvent} aEvent: the event firing this function
   */
  initialize: function(aEvent) {
    let that = this;
    
    // if the visualization is not currently running
    if (!that.iframe) {
      // use an extension to get the image representation of the document
      Tilt.Extensions.WebGL.initDocumentImage(function(image) {
        // set the width and height to mach the content window dimensions
        let width = window.content.innerWidth;
        let height = window.content.innerHeight;
        
        // initialize a Tilt environment: a canvas element inside an iframe
        Tilt.Create(width, height, function(tilt, canvas, iframe) {
          // remember the iframe so that it can be destroyed later
          that.iframe = iframe;
          
          // construct the visualization using the canvas and the dom image
          that.visualization = 
            new TiltChrome.Visualization(tilt, canvas, image,
            new TiltChrome.Controller.MouseAndKeyboard()); // default controls
        });
      });
    }
    else {
      // if the visualization is running destroy it
      that.destroy();
    }
  },
  
  /**
   * Destroys this object, removes the iframe and sets all members to null.
   */
  destroy: function() {
    let that = this;
    
    // issue a destroy call through all the visualization children
    that.visualization.destroy(function() {
      that.visualization = null; // when done, do some cleanup
      
      // remove the iframe from the browser stack
      Tilt.Document.remove(that.iframe);
      that.iframe = null;
    });
  }
};