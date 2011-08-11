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
  domStripsContainer = null,

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
  arcballUpButton = null,
  arcballDownButton = null,
  arcballLeftButton = null,
  arcballRightButton = null,
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

    t = new Tilt.Texture("chrome://tilt/skin/tilt-ui.png", {
      minFilter: "nearest",
      magFilter: "nearest"
    });

    view = new Tilt.View({
    });

    domStripsContainer = new Tilt.ScrollContainer({
      x: 20,
      y: 335,
      width: 130,
      height: canvas.height - 340,
      background: "#0001",
      top: new Tilt.Sprite(t, [506, 68, 33, 30]),
      bottom: new Tilt.Sprite(t, [506, 100, 33, 30])
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

    arcballUpButton = new Tilt.Button(null, {
      x: 60,
      y: 14,
      width: 45,
      height: 30
    });

    arcballDownButton = new Tilt.Button(null, {
      x: 60,
      y: 120,
      width: 45,
      height: 30
    });

    arcballLeftButton = new Tilt.Button(null, {
      x: 14,
      y: 60,
      width: 30,
      height: 45
    });

    arcballRightButton = new Tilt.Button(null, {
      x: 120,
      y: 60,
      width: 30,
      height: 45
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
      elements: [
        colorAdjustPopupSprite,
        hueSlider,
        saturationSlider,
        brightnessSlider,
        alphaSlider,
        textureSlider]
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

      domStripsContainer.view.hidden ^= true;

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

    zoomInButton.onclick = function() {
      this.controller.zoom(200);
    }.bind(this);

    zoomOutButton.onclick = function() {
      this.controller.zoom(-200);
    }.bind(this);

    arcballUpButton.onmousedown = function() {
      this.controller.translate(0, -30);
    }.bind(this);

    arcballDownButton.onmousedown = function() {
      this.controller.translate(0, 30);
    }.bind(this);

    arcballLeftButton.onmousedown = function() {
      this.controller.translate(-30, 0);
    }.bind(this);

    arcballRightButton.onmousedown = function() {
      this.controller.translate(30, 0);
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
      resetButton, zoomInButton, zoomOutButton, arcballSprite, 
      arcballUpButton, arcballDownButton,
      arcballLeftButton, arcballRightButton,
      viewModeButton, colorAdjustButton);

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
   * @param {Number} uid: a unique id for the node
   */
  this.domVisualizationMeshNodeCallback = function(node, depth, index, uid) {
    if ("undefined" === typeof this.stripNo) {
      this.stripNo = 0;
    }
    if ("undefined" === typeof node.localName || node.localName === null) {
      return;
    }

    var stripNo = this.stripNo++,
      x = 3 + depth * 8,
      y = 3 + stripNo * 10,
      height = 6,
      stripButton, stripIdButton, stripClassButton, right,

    // the general strip button, created in all cases
    clsx = x + (node.localName.length) * 10 + 3,
    idx = clsx + (node.className.length || 3) * 3 + 3;

    stripButton = new Tilt.Button(null, {
      x: x,
      y: y,
      width: node.localName.length * 10,
      height: height,
      stroke: "#fff2"
    });

    right = stripButton.getX() + stripButton.getWidth();

    if (node.className) {
      stripClassButton = new Tilt.Button(null, {
        x: clsx,
        y: y,
        width: (node.className.length || 3) * 3,
        height: height,
        stroke: stripButton.getStroke()
      });

      right = Math.max(right,
        stripClassButton.getX() + stripClassButton.getWidth());
    }

    if (node.id) {
      stripIdButton = new Tilt.Button(null, {
        x: idx,
        y: y,
        width: (node.id.length || 3) * 3,
        height: height,
        stroke: stripButton.getStroke()
      });

      right = Math.max(right,
        stripIdButton.getX() + stripIdButton.getWidth());
    }

    if (right > domStripsContainer.view.getWidth()) {
      domStripsContainer.view.setWidth(right);
    }

    if (node.localName === "html") {
      stripButton.setFill("#FFFE");
    }
    else if (node.localName === "head") {
      stripButton.setFill("#E667AFEE");
    }
    else if (node.localName === "title") {
      stripButton.setFill("#CD0074EE");
    }
    else if (node.localName === "meta") {
      stripButton.setFill("#BF7130EE");
    }
    else if (node.localName === "script") {
      stripButton.setFill("#A64B00EE");
    }
    else if (node.localName === "style") {
      stripButton.setFill("#FF9640EE");
    }
    else if (node.localName === "link") {
      stripButton.setFill("#FFB273EE");
    }
    else if (node.localName === "body") {
      stripButton.setFill("#E667AFEE");
    }
    else if (node.localName === "h1") {
      stripButton.setFill("#FF0D");
    }
    else if (node.localName === "h2") {
      stripButton.setFill("#EE0D");
    }
    else if (node.localName === "h3") {
      stripButton.setFill("#DD0D");
    }
    else if (node.localName === "h4") {
      stripButton.setFill("#CC0D");
    }
    else if (node.localName === "h5") {
      stripButton.setFill("#BB0D");
    }
    else if (node.localName === "h6") {
      stripButton.setFill("#AA0D");
    }
    else if (node.localName === "table") {
      stripButton.setFill("#FF0700EE");
    }
    else if (node.localName === "tbody") {
      stripButton.setFill("#FF070088");
    }
    else if (node.localName === "tr") {
      stripButton.setFill("#FF4540EE");
    }
    else if (node.localName === "td") {
      stripButton.setFill("#FF7673EE");
    }
    else if (node.localName === "div") {
      stripButton.setFill("#5DC8CDEE");
    }
    else if (node.localName === "span") {
      stripButton.setFill("#67E46FEE");
    }
    else if (node.localName === "p") {
      stripButton.setFill("#888E");
    }
    else if (node.localName === "a") {
      stripButton.setFill("#123EABEE");
    }
    else if (node.localName === "img") {
      stripButton.setFill("#FFB473EE");
    }
    else {
      stripButton.setFill("#444E");
    }

    if (stripButton) {
      domStripsContainer.view.push(stripButton);

      stripButton.onclick = function() {
        this.visualization.setHtmlEditor();
        this.visualization.openEditor(uid);
      }.bind(this);
    }
    if (stripClassButton) {
      domStripsContainer.view.push(stripClassButton);
      stripClassButton.setFill(stripButton.getFill());

      stripClassButton.onclick = function() {
        this.visualization.setAttributesEditor();
        this.visualization.openEditor(uid);
      }.bind(this);
    }
    if (stripIdButton) {
      domStripsContainer.view.push(stripIdButton);
      stripIdButton.setFill(stripButton.getFill());

      stripIdButton.onclick = function() {
        this.visualization.setAttributesEditor();
        this.visualization.openEditor(uid);
      }.bind(this);
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
    if (helpPopup !== null) {
      helpPopup.destroy();
      helpPopup = null;
    }
    if (colorAdjustPopup !== null) {
      colorAdjustPopup.destroy();
      colorAdjustPopup = null;
    }
    if (domStripsContainer !== null) {
      domStripsContainer.destroy();
      domStripsContainer = null;
    }

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.UI", this);  
};
