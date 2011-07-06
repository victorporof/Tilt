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
"use strict";

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.Extensions.WebGL"];

/**
 * WebGL extensions
 */
Tilt.Extensions = {};
Tilt.Extensions.WebGL = {
  
  /**
   * JavaScript implementation of WebGL MOZ_dom_element_texture (#653656).
   * This shim renders a content window to a canvas element, but clamps the
   * maximum width and height of the canvas to MAX_TEXTURE_SIZE.
   * 
   * @param {object} contentWindow: the window content to draw
   */
  initDocumentImage: function(contentWindow) {
    // use a canvas and a WebGL context to get the maximum texture size
    let canvasgl = Tilt.Document.initCanvas();

    // use a custom canvas element and a 2d context to draw the window
    let canvas2d = Tilt.Document.initCanvas();
    
    // create the WebGL context
    let gl = Tilt.Renderer.prototype.create3DContext(canvasgl);
    let maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE); // important!
    
    // calculate the total width of the content window
    let width = Tilt.Math.clamp(
      contentWindow.innerWidth + contentWindow.scrollMaxX, 0, maxSize);
      
    // calculate the total height of the content window
    let height = Tilt.Math.clamp(
      contentWindow.innerHeight + contentWindow.scrollMaxY, 0, maxSize);
      
    canvas2d.width = width;
    canvas2d.height = height;
    
    // use the 2d context.drawWindow() magic
    let context = canvas2d.getContext("2d");
    context.drawWindow(contentWindow, 0, 0, width, height, "#fff");
    
    return canvas2d;
  }
};