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
  helpPopup = null,
  colorAdjustPopup = null,
  domStripsScrollview = null,

  /**
   * The texture containing all the interface elements.
   */
  t = null,

  /**
   * The background gradient.
   */
  background = null,

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
   * The controls information.
   */
  helpBoxSprite = null,
  helpCloseButon = null,

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
    domStripsScrollview = new Tilt.View({
      bounds: [0, 0, canvas.width, canvas.height]
    });

    t = new Tilt.Texture("chrome://tilt/skin/tilt-ui.png", {
      minFilter: "nearest",
      magFilter: "nearest"
    });

    background = new Tilt.Sprite(t, [0, 1024 - 256, 256, 256], {
      width: canvas.width,
      height: canvas.height,
      depthTest: true,
      disabled: true
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

    var handlerSprite = new Tilt.Sprite(t, [574, 131, 29, 29], {
      padding: [10, 10, 10, 10]
    });
    hueSlider = new Tilt.Slider(handlerSprite, {
      x: 152,
      y: 271,
      size: 120,
      value: 50
    });
    saturationSlider = new Tilt.Slider(handlerSprite, {
      x: 152,
      y: 290,
      size: 120,
      value: 0
    });
    brightnessSlider = new Tilt.Slider(handlerSprite, {
      x: 152,
      y: 308,
      size: 120,
      value: 100
    });
    alphaSlider = new Tilt.Slider(handlerSprite, {
      x: 152,
      y: 326,
      size: 120,
      value: 90
    });
    textureSlider = new Tilt.Slider(handlerSprite, {
      x: 152,
      y: 344,
      size: 120,
      value: 100
    });

    var colorAdjustPopupSprite = new Tilt.Sprite(t, [572, 1, 231, 126], {
      x: 88,
      y: 258
    });
    colorAdjustPopup = new Tilt.View({
      hidden: true,
      elements: [colorAdjustPopupSprite,
                 hueSlider, saturationSlider, brightnessSlider, 
                 alphaSlider, textureSlider]
    });

    helpBoxSprite = new Tilt.Sprite(t, [210, 180, 610, 510], {
      disabled: true
    });

    helpCloseButon = new Tilt.Button(null, {
      width: 30,
      height: 30
    });

    helpPopup = new Tilt.View({
      hidden: true,
      background: "#0007",
      elements: [helpBoxSprite, helpCloseButon]
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

      helpBoxSprite.setPosition(helpX, helpY);
      helpCloseButon.setPosition(exitX, exitY);
      ui.presentModal(helpPopup);
    };

    helpCloseButon.onclick = function() {
      ui.dismissModal(helpPopup);
    };

    exportButton.onclick = function() {
    };

    optionsButton.onclick = function() {
    };

    htmlButton.onclick = function() {
      this.visualization.setHtmlEditor();
    }.bind(this);

    cssButton.onclick = function() {
      this.visualization.setCssEditor();
    }.bind(this);

    attrButton.onclick = function() {
      this.visualization.setAttributesEditor();
    }.bind(this);

    eyeButton.onclick = function() {
      hideableElements.forEach(function(element) {
        element.hidden ^= true;
      });

      domStripsScrollview.hidden ^= true;

      if (!helpPopup.hidden) {
        helpPopup.hidden = true;
      }
      if (!colorAdjustPopup.hidden) {
        colorAdjustPopup.hidden = true;
      }
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

    viewModeButton.type = 0;
    viewModeButton.onclick = function() {
      if (viewModeButton.type === 0) {
        viewModeButton.type = 1;
        viewModeButton.setSprite(viewModeNormalSprite);

        hueSlider.setValue(55);
        saturationSlider.setValue(35);
        brightnessSlider.setValue(100);
        alphaSlider.setValue(7.5);
        textureSlider.setValue(100);

        this.visualization.setMeshWireframeColor([1, 1, 1, 0.7]);
      }
      else {
        viewModeButton.type = 0;
        viewModeButton.setSprite(viewModeWireframeSprite);

        hueSlider.setValue(50);
        saturationSlider.setValue(0);
        brightnessSlider.setValue(100);
        alphaSlider.setValue(100);
        textureSlider.setValue(100);

        this.visualization.setMeshWireframeColor([0, 0, 0, 0.25]);
      }
    }.bind(this);

    colorAdjustButton.onclick = function() {
      colorAdjustPopup.hidden ^= true;
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

    var rgba = Tilt.Math.hsv2rgb(
      hueSlider.getValue() / 100,
      saturationSlider.getValue() / 100,
      brightnessSlider.getValue() / 100);

    rgba[0] /= 255;
    rgba[1] /= 255;
    rgba[2] /= 255;
    rgba[3] = alphaSlider.getValue() / 100;

    this.visualization.setMeshColor(rgba);
    this.visualization.setMeshTextureAlpha(textureSlider.getValue() / 100);
  };

  /**
   * Function called for each node in the dom tree
   * 
   * @param {HTMLNode} node: the dom node
   * @param {Number} depth: the node depth in the dom tree
   * @param {Number} index: the index of the node in the dom tree
   */
  this.domVisualizationMeshNodeCallback = function(node, depth, index) {
    if ("undefined" === typeof this.stripNo) {
      this.stripNo = 0;
    }
    if ("undefined" === typeof node.localName || node.localName === null) {
      return;
    }

    var stripNo = this.stripNo++,
      x = 25 + depth * 8,
      y = 340 + stripNo * 10,
      height = 6,
      stripButton, stripIdButton, stripClassButton;

    // the general strip button, created in all cases
    var clsx = x + (node.localName.length) * 10 + 3;
    var idx = clsx + (node.className.length || 3) * 3 + 3;

    stripButton = new Tilt.Button(null, {
      x: x,
      y: y,
      width: node.localName.length * 10,
      height: height,
      stroke: "#fff2"
    });

    if (node.className) {
      stripClassButton = new Tilt.Button(null, {
        x: clsx,
        y: y,
        width: (node.className.length || 3) * 3,
        height: height,
        stroke: stripButton.getStroke()
      });
    }

    if (node.id) {
      stripIdButton = new Tilt.Button(null, {
        x: idx,
        y: y,
        width: (node.id.length || 3) * 3,
        height: height,
        stroke: stripButton.getStroke()
      });
    }

    if (node.localName === "html") {
      stripButton.setFill("#fff");
    }
    else if (node.localName === "head") {
      stripButton.setFill("#E667AF");
    }
    else if (node.localName === "title") {
      stripButton.setFill("#CD0074");
    }
    else if (node.localName === "meta") {
      stripButton.setFill("#BF7130");
    }
    else if (node.localName === "script") {
      stripButton.setFill("#A64B00");
    }
    else if (node.localName === "style") {
      stripButton.setFill("#FF9640");
    }
    else if (node.localName === "link") {
      stripButton.setFill("#FFB273");
    }
    else if (node.localName === "body") {
      stripButton.setFill("#E667AF");
    }
    else if (node.localName === "h1") {
      stripButton.setFill("#ff0d");
    }
    else if (node.localName === "h2") {
      stripButton.setFill("#ee0d");
    }
    else if (node.localName === "h3") {
      stripButton.setFill("#dd0d");
    }
    else if (node.localName === "h4") {
      stripButton.setFill("#cc0d");
    }
    else if (node.localName === "h5") {
      stripButton.setFill("#bb0d");
    }
    else if (node.localName === "h6") {
      stripButton.setFill("#aa0d");
    }
    else if (node.localName === "table") {
      stripButton.setFill("#FF0700");
    }
    else if (node.localName === "tbody") {
      stripButton.setFill("#FF070088");
    }
    else if (node.localName === "tr") {
      stripButton.setFill("#FF4540");
    }
    else if (node.localName === "td") {
      stripButton.setFill("#FF7673");
    }
    else if (node.localName === "div") {
      stripButton.setFill("#5DC8CD");
    }
    else if (node.localName === "span") {
      stripButton.setFill("#67E46F");
    }
    else if (node.localName === "p") {
      stripButton.setFill("#888");
    }
    else if (node.localName === "a") {
      stripButton.setFill("#123EAB");
    }
    else if (node.localName === "img") {
      stripButton.setFill("#FFB473");
    }
    else {
      stripButton.setFill("#444");
    }

    stripButton.onclick = function() {
      alert(depth);
    };

    if (stripButton) {
      domStripsScrollview.push(stripButton);
    }
    if (stripClassButton) {
      domStripsScrollview.push(stripClassButton);
      stripClassButton.setFill(node.className ? 
        stripButton.getFill() : "#0002");
    }
    if (stripIdButton) {
      domStripsScrollview.push(stripIdButton);
      stripIdButton.setFill(node.id ?
        stripButton.getFill() : "#0002");
    }
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

    domStripsScrollview.bounds = [0, 0, width, height];
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
