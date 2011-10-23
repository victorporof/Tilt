/***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Tilt: A WebGL-based 3D visualization of a webpage.
 *
 * The Initial Developer of the Original Code is The Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Victor Porof <victor.porof@gmail.com> (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 ***** END LICENSE BLOCK *****/
"use strict";

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.WebGL"];

/**
 * WebGL extensions
 */
Tilt.WebGL = {

  /**
   * This shim renders a content window to a canvas element, but clamps the
   * maximum width and height of the canvas to MAX_TEXTURE_SIZE.
   *
   * @param {Window} contentWindow: the window content to draw
   * @return {HTMLCanvasElement} the document image canvas
   */
  initDocumentImage: function(contentWindow) {
    var canvasgl, canvas, gl, ctx, maxSize, size, width, height;

    // use a canvas and a WebGL context to get the maximum texture size
    canvasgl = Tilt.Document.initCanvas();

    // use a custom canvas element and a 2d context to draw the window
    canvas = Tilt.Document.initCanvas();

    // create the WebGL context
    gl = Tilt.Renderer.prototype.create3DContext(canvasgl);
    maxSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0;
    maxSize /= 2;

    if (maxSize > 0) {
      // calculate the total width and height of the content page
      size = Tilt.Document.getContentWindowDimensions(contentWindow);

      // calculate the valid width and height of the content page
      width = Tilt.Math.clamp(size.width, 0, maxSize);
      height = Tilt.Math.clamp(size.height, 0, maxSize);

      canvas.width = width;
      canvas.height = height;

      // use the 2d context.drawWindow() magic
      ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawWindow(contentWindow, 0, 0, width, height, "#fff");
    }

    try {
      return canvas;
    }
    finally {
      canvasgl = null;
      canvas = null;
      gl = null;
      ctx = null;
    }
  },


  /**
   * Refreshes a sub area of a canvas with new pixel information from a
   * content window.
   *
   * @param {Window} contentWindow: the window content to draw
   * @param {HTMLCanvasElement} canvas: the canvas to refresh
   * @param {BoundingClientRect} rect: the bounding client rect
   * @param {Boolean} overwrite: true to overwrite on the same canvas
   * return {HTMLCanvasElement} the new canvas
   */
  refreshDocumentImage: function(contentWindow, canvas, rect, overwrite) {
    var ctx,
      left = rect.left,
      top = rect.top,
      width = rect.width,
      height = rect.height;

    // we can just overwrite the existing canvas with the new image data for a
    // specific rectangular region
    if (overwrite) {
      ctx = canvas.getContext("2d");
      ctx.translate(left, top);
      ctx.drawWindow(contentWindow, left, top, width, height, "#fff");
      ctx.translate(-left, -top);

      return canvas;
    }
    // or, use a new canvas with the necessary width and height and image data
    // drawn from the top left corner
    else {
      // we'll cache a canvas to avoid creating it every single time
      if (this.$canvas) {
        this.$canvas.width = width;
        this.$canvas.height = height;

        // use a 2d context to draw the window
        ctx = this.$canvas.getContext("2d");
        ctx.drawWindow(contentWindow, left, top, width, height, "#fff");

        return this.$canvas;
      }
      // if the canvas wasn't already created, create it & continue refreshing
      else if ("undefined" === typeof this.$canvas) {
        this.$canvas = Tilt.Document.initCanvas();
        return this.refreshDocumentImage(contentWindow, canvas, rect);
      }
      // something went horribly wrong, clean up the mess if there was any
      else {
        this.$canvas = null;
        delete this.$canvas;
      }
    }

    return null;
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.WebGL);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.WebGL", Tilt.WebGL);
