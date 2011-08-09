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
 * The Initial Developer of the Original Code is Victor Porof.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
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

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.UI.Default"];

/**
 * Default UI implementation.
 */
TiltChrome.UI = {};
TiltChrome.UI.Default = function() {

  /**
   * Cache the top level UI handling events.
   */
  var ui = Tilt.UI,

  /**
   * The views containing all the UI elements.
   */
  view = null,
  help = null,

  /**
   * The texture containing all the interface elements.
   */
  texture = null,

  /**
   * The background gradient.
   */
  background = null,

  /**
   * The controls information.
   */
  helpSprite = null,
  helpCloseButon = null,

  /**
   * The top-right menu buttons.
   */
  exitButton = null,
  helpButton = null,
  exportButton = null,
  optionsButton = null,
  attrButton = null,
  htmlButton = null,
  cssButton = null,

  /**
   * Top-left control items.
   */
  eyeButton = null,
  resetButton = null,
  zoomInButton = null,
  zoomOutButton = null,
  arcballSprite = null,

  /**
   * Middle-left control items.
   */
  viewModeButton = null,
  colorAdjustButton = null,

  /**
   * Sliders.
   */
  hueSlider = null,
  saturationSlider = null,
  brightnessSlider = null,
  alphaSlider = null,
  textureSlider = null,

  /**
   * Arrays holding groups of objects.
   */
  alwaysVisibleElements = [],
  hideableElements = [],
  panelElements = [],

  /**
   * Retain the position for the mouseDown event.
   */
  downX = 0, downY = 0;

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    var panel = TiltChrome.BrowserOverlay.panel;
    panel.addEventListener("popupshown", ePopupShown, false);
    panel.addEventListener("popuphidden", ePopupHidden, false);

    view = new Tilt.View();
    help = new Tilt.View({
      hidden: true,
      background: "#0007"
    });

    texture = new Tilt.Texture("chrome://tilt/skin/tilt-ui.png", {
      minFilter: "nearest",
      magFilter: "nearest"
    });

    var t = texture;
    background = new Tilt.Sprite(t, [0, 1024 - 256, 256, 256], {
      width: canvas.width,
      height: canvas.height,
      depthTest: true,
      disabled: true
    });

    helpSprite = new Tilt.Sprite(t, [210, 180, 610, 510]);

    helpCloseButon = new Tilt.Button(null, {
      width: 30,
      height: 30
    });

    exitButton = new Tilt.Button(new Tilt.Sprite(t, [935, 120, 42, 38]), {
      x: canvas.width - 50
    });

    helpButton = new Tilt.Button(new Tilt.Sprite(t, [935, 80, 46, 38]), {
      x: canvas.width - 150
    });

    exportButton = new Tilt.Button(new Tilt.Sprite(t, [935, 40, 61, 38]), {
      x: canvas.width - 215
    });

    optionsButton = new Tilt.Button(new Tilt.Sprite(t, [935, 0, 66, 38]), {
      x: canvas.width - 285
    });

    htmlButton = new Tilt.Button(new Tilt.Sprite(t, [935, 200, 48, 38]), {
      x: canvas.width - 337,
      hidden: true
    });

    cssButton = new Tilt.Button(new Tilt.Sprite(t, [935, 160, 36, 38]), {
      x: canvas.width - 377,
      hidden: true
    });

    attrButton = new Tilt.Button(new Tilt.Sprite(t, [935, 240, 84, 38]), {
      x: canvas.width - 465,
      hidden: true
    });

    eyeButton = new Tilt.Button(new Tilt.Sprite(t, [0, 147, 42, 42]), {
      x: 0,
      y: 0
    });

    resetButton = new Tilt.Button(new Tilt.Sprite(t, [0, 190, 42, 42]), {
      x: 60,
      y: 150
    });

    zoomInButton = new Tilt.Button(new Tilt.Sprite(t, [0, 234, 42, 42]), {
      x: 100,
      y: 150
    });

    zoomOutButton = new Tilt.Button(new Tilt.Sprite(t, [0, 278, 42, 42]), {
      x: 20,
      y: 150
    });

    arcballSprite = new Tilt.Sprite(t, [0, 0, 145, 145], {
      x: 10,
      y: 10
    });

    var viewModeNormalSprite = new Tilt.Sprite(t, [438, 67, 66, 66]);
    var viewModeWireframeSprite = new Tilt.Sprite(t, [438, 0, 66, 66]);
    viewModeButton = new Tilt.Button(viewModeWireframeSprite, {
      x: 50,
      y: 200
    });

    colorAdjustButton = new Tilt.Button(new Tilt.Sprite(t, [505, 0, 66, 66]),{
      x: 50,
      y: 260
    });

    var handlerSprite = new Tilt.Sprite(texture, [574, 131, 29, 29], {
      padding: [8, 8, 8, 8]
    });
    hueSlider = new Tilt.Slider(handlerSprite, {
      x: 152,
      y: 271,
      size: 120,
      value: 50
    });

    exitButton.onclick = function() {
      TiltChrome.BrowserOverlay.destroy(true, true);
      TiltChrome.BrowserOverlay.href = null;
    };

    helpButton.onclick = function() {
      var helpX = canvas.width / 2 - 305,
        helpY = canvas.height / 2 - 305,
        exitX = canvas.width / 2 + 197,
        exitY = canvas.height / 2 - 218;

      helpSprite.setPosition(helpX, helpY);
      helpCloseButon.setPosition(exitX, exitY);
      ui.setModal(help);
    };

    helpCloseButon.onclick = function() {
      ui.unsetModal(help);
    };

    exportButton.onclick = function() {
    };

    optionsButton.onclick = function() {
    };

    htmlButton.onclick = function() {
    };

    cssButton.onclick = function() {
    };

    attrButton.onclick = function() {
    };

    eyeButton.onclick = function() {
      hideableElements.forEach(function(element) {
        element.hidden ^= true;
      });
    };

    resetButton.onclick = function() {
      this.controller.reset(0.95);
    }.bind(this);

    zoomInButton.onclick = function(x, y) {
      this.controller.zoom(200);
    }.bind(this);

    zoomOutButton.onclick = function(x, y) {
      this.controller.zoom(-200);
    }.bind(this);

    viewModeButton.onclick = function() {
    }.bind(this);

    alwaysVisibleElements.push(
      background, exitButton, eyeButton);

    hideableElements.push(
      helpButton, exportButton, optionsButton,
      resetButton, zoomInButton, zoomOutButton,
      arcballSprite, viewModeButton, colorAdjustButton);

    panelElements.push(
      htmlButton, cssButton, attrButton);

    alwaysVisibleElements.forEach(function(element) {
      view.push(element);
    });

    hideableElements.forEach(function(element) {
      view.push(element);
    });

    panelElements.forEach(function(element) {
      view.push(element);
    });

    help.push(helpSprite, helpCloseButon);
  };

  /**
   * Event handling the editor panel popup showing.
   */
  function ePopupShown() {
    htmlButton.hidden = false;
    cssButton.hidden = false;
    attrButton.hidden = false;
  };

  /**
   * Event handling the editor panel popup hiding.
   */
  function ePopupHidden() {
    htmlButton.hidden = true;
    cssButton.hidden = true;
    attrButton.hidden = true;
  };

  /**
   * Called automatically by the visualization after each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.draw = function(frameDelta) {
    ui.refresh();
  };

  /**
   * Function called for each node in the dom tree
   * 
   * @param {HTMLNode} node: the dom node
   * @param {Number} depth: the node depth in the dom tree
   * @param {Number} index: the index of the node in the dom tree
   */
  this.domVisualizationMeshNodeCallback = function(node, depth, index) {
  };

  /**
   * Function called when the dom tree was successfully traversed.
   *
   * @param {Number} maxDepth: the maximum depth of the dom tree
   * @param {Number} totalNodes: the total nodes in the dom tree
   */
  this.domVisualizationMeshReadyCallback = function(maxDepth, totalNodes) {
  };

  /**
   * Delegate method, called when the user interface needs to be resized.
   *
   * @param width: the new width of the visualization
   * @param height: the new height of the visualization
   */
  this.resize = function(width, height) {
    background.setSize(width, height);

    exitButton.setPosition(width - 50, 0);
    helpButton.setPosition(width - 150, 0);
    exportButton.setPosition(width - 215, 0);
    optionsButton.setPosition(width - 285, 0);

    htmlButton.setPosition(width - 337, 0);
    cssButton.setPosition(width - 377, 0);
    attrButton.setPosition(width - 465, 0);
  };

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function(canvas) {
    this.visualization = null;

    var panel = TiltChrome.BrowserOverlay.panel;
    if (ePopupShown !== null) {
      panel.removeEventListener("popupshown", ePopupShown, false);
      ePopupShown = null;
    }
    if (ePopupHidden !== null) {
      panel.removeEventListener("popuphidden", ePopupHidden, false);
      ePopupHidden = null;
    }

    if (view !== null) {
      view.destroy();
      view = null;
    }

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.UI", this);  
};
