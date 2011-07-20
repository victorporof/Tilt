/*
 * TiltChromeGUI.js - UI implementation for the visualization
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
"use strict";

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.UI"];

/**
 * UI implementation.
 */
TiltChrome.UI = function() {

  /**
   * Handler for all the GUI elements.
   */
  var gui = null,

  /**
   * The texture containing all the GUI elements.
   */
  texture = null,

  /**
   * The controls information help box.
   */
  helpLightbox = null,

  /**
   * The top-right menu buttons.
   */
  optionsButton = null,
  exportButton = null,
  helpButton = null,
  exitButton = null,

  /**
   * Top-left control items.
   */
  arcballSprite = null,
  eyeButton = null,
  resetButton = null,
  zoomInButton = null,
  zoomOutButton = null,

  /**
   * Middle-left control items.
   */
  viewModeButton = null,
  colorButton = null;

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    gui = new Tilt.GUI();

    texture = new Tilt.Texture("chrome://tilt/skin/tilt-gui.png", {
      minFilter: "nearest",
      magFilter: "nearest"
    });

    helpLightbox = new Tilt.Lightbox("#0107",
      new Tilt.Sprite(texture, [210, 210, 610, 610]));

    helpLightbox.hidden = true;
    helpLightbox.sprite.x = canvas.width / 2 - 305;
    helpLightbox.sprite.y = canvas.height / 2 - 305;

    optionsButton = new Tilt.Button(canvas.width - 320, 0,
      new Tilt.Sprite(texture, [945, 0, 70, 40]));

    exportButton = new Tilt.Button(canvas.width - 240, 0,
      new Tilt.Sprite(texture, [945, 40, 65, 40]));

    helpButton = new Tilt.Button(canvas.width - 160, 0,
      new Tilt.Sprite(texture, [945, 80, 50, 40]));

    exitButton = new Tilt.Button(canvas.width - 50, 0,
      new Tilt.Sprite(texture, [945, 120, 45, 40]));

    arcballSprite =
      new Tilt.Sprite(texture, [0, 0, 145, 150], 10, 10);

    eyeButton = new Tilt.Button(0, 0,
      new Tilt.Sprite(texture, [0, 148, 42, 42]));

    resetButton = new Tilt.Button(60, 150,
      new Tilt.Sprite(texture, [0, 190, 42, 42]));

    zoomInButton = new Tilt.Button(100, 150,
      new Tilt.Sprite(texture, [0, 232, 42, 42]));

    zoomOutButton = new Tilt.Button(20, 150,
      new Tilt.Sprite(texture, [0, 274, 42, 42]));

    viewModeButton = new Tilt.Button(50, 200,
      new Tilt.Sprite(texture, [440, 10, 60, 60]));

    colorButton = new Tilt.Button(50, 260,
      new Tilt.Sprite(texture, [440, 80, 60, 60]));

    texture.onload = function() {
      this.visualization.redraw();
    }.bind(this);

    helpLightbox.onclick = function(x, y) {
      helpLightbox.hidden = true;
    };

    helpButton.onclick = function(x, y) {
      helpLightbox.hidden = false;
    };

    exitButton.onclick = function(x, y) {
      TiltChrome.BrowserOverlay.destroy();
      TiltChrome.BrowserOverlay.href = null;
    };

    gui.push(
      helpLightbox,
      // arcballSprite, resetButton, zoomInButton, zoomOutButton,
      // viewModeButton, colorButton,
      eyeButton, optionsButton, exportButton, helpButton, exitButton);
  };

  /**
   * Function called automatically by the visualization each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.draw = function(frameDelta) {
    gui.draw();
  };

  /**
   * Delegate click method, used by the controller.
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   */
  this.click = function(x, y) {
    gui.click(x, y);
  };

  /**
   * Delegate double click method, used by the controller.
   *
   * @param {Number} x: the current horizontal coordinate
   * @param {Number} y: the current vertical coordinate
   */
  this.doubleClick = function(x, y) {
    gui.doubleClick(x, y);
  };

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function(canvas) {
    gui.destroy();
    gui = null;

    for (var i in this) {
      try {
        if ("function" === typeof this[i].destroy) {
          this[i].destroy();
        }
      }
      catch(e) {}
      finally {
        delete this[i];
      }
    }
  };
};
