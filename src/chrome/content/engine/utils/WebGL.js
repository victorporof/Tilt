/*
 * WebGL.js - Various WebGL shims and extensions
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
   * @param {Window} contentWindow: the window content to draw
   */
  initDocumentImage: function(contentWindow) {
    var canvasgl, canvas2d, gl, ctx, maxSize, pWidth, pHeight, width, height;

    // use a canvas and a WebGL context to get the maximum texture size
    canvasgl = Tilt.Document.initCanvas();

    // use a custom canvas element and a 2d context to draw the window
    canvas2d = Tilt.Document.initCanvas();

    // create the WebGL context
    gl = Tilt.Renderer.prototype.create3DContext(canvasgl);
    maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // calculate the total width and height of the content page
    pWidth = contentWindow.innerWidth + contentWindow.scrollMaxX;
    pHeight = contentWindow.innerHeight + contentWindow.scrollMaxY;

    // calculate the valid width and height of the content page
    width = Tilt.Math.clamp(pWidth, 0, maxSize);
    height = Tilt.Math.clamp(pHeight, 0, maxSize);

    canvas2d.width = width;
    canvas2d.height = height;

    // use the 2d context.drawWindow() magic
    ctx = canvas2d.getContext("2d");
    ctx.drawWindow(contentWindow, 0, 0, width, height, "#fff");

    try {
      return canvas2d;
    }
    finally {
      canvasgl = null;
      canvas2d = null;
      gl = null;
      ctx = null;
    }
  }
};
