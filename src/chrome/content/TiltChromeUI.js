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
   * The configuration properties for the UI.
   */
  config = TiltChrome.Config.UI,

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
   * The "minidom" strips legend.
   */
  domStripsLegend = null,
  htmlStripButton = null,
  headStripButton = null,
  titleStripButton = null,
  scriptStripButton = null,
  styleStripButton = null,
  divStripButton = null,
  spanStripButton = null,
  tableStripButton = null,
  trStripButton = null,
  tdStripButton = null,
  pStripButton = null,
  aStripButton = null,
  imgStripButton = null,
  otherStripButton = null,

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
  arcballSprite = null,
  arcballUpButton = null,
  arcballDownButton = null,
  arcballLeftButton = null,
  arcballRightButton = null,
  resetButton = null,
  zoomInButton = null,
  zoomOutButton = null,

  /**
   * Middle-left control items.
   */
  viewModeButton = null,
  colorAdjustButton = null,

  /**
   * Color adjustment sliders.
   */
  hueSlider = null,
  saturationSlider = null,
  brightnessSlider = null,
  alphaSlider = null,
  textureSlider = null,

  /**
   * The controls help information.
   */
  helpBoxSprite = null,
  helpCloseButon = null,

  /**
   * Arrays holding groups of objects.
   */
  alwaysVisibleElements = [],
  hideableElements = [],
  sourceEditorElements = [],

  /**
   * Retain the position for the mouseDown event.
   */
  downX = 0, downY = 0;

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    var sourceEditor = TiltChrome.BrowserOverlay.sourceEditor;
    sourceEditor.addEventListener("popupshown", eEditorShown, false);
    sourceEditor.addEventListener("popuphidden", eEditorHidden, false);

    var colorPicker = TiltChrome.BrowserOverlay.colorPicker;
    colorPicker.addEventListener("popupshown", ePickerShown, false);
    colorPicker.addEventListener("popuphidden", ePickerHidden, false);

    t = new Tilt.Texture("chrome://tilt/skin/tilt-ui.png", {
      minFilter: "nearest",
      magFilter: "nearest"
    });

    view = new Tilt.Container({
    });

    background = new Tilt.Sprite(t, [0, 1024 - 256, 256, 256], {
      width: canvas.width,
      height: canvas.height,
      depthTest: true,
      disabled: true
    });

    exitButton = new Tilt.Button(new Tilt.Sprite(t, [935, 120, 42, 38]), {
      x: canvas.width - 50,
      y: -5,
      padding: [0, 0, 0, 5],
      onclick: function() {
        TiltChrome.BrowserOverlay.destroy(true, true);
        TiltChrome.BrowserOverlay.href = null;
      }
    });

    helpButton = new Tilt.Button(new Tilt.Sprite(t, [935, 80, 46, 38]), {
      x: canvas.width - 150,
      y: -5,
      padding: [0, 0, 0, 5],
      onclick: function() {
        var helpX = canvas.width / 2 - 305,
          helpY = canvas.height / 2 - 305,
          exitX = canvas.width / 2 + 197,
          exitY = canvas.height / 2 - 218;

        helpBoxSprite.setPosition(helpX, helpY);
        helpCloseButon.setPosition(exitX, exitY);
        ui.presentModal(helpPopup);
      }
    });

    exportButton = new Tilt.Button(new Tilt.Sprite(t, [935, 40, 61, 38]), {
      x: canvas.width - 215,
      y: -5,
      padding: [0, 0, 0, 5],
      onclick: function() {
        Tilt.Console.alert("Tilt", Tilt.StringBundle.get("implement.info"));
      }
    });

    optionsButton = new Tilt.Button(new Tilt.Sprite(t, [935, 0, 66, 38]), {
      x: canvas.width - 285,
      y: -5,
      padding: [0, 0, 0, 5],
      onclick: function() {
        Tilt.Console.alert("Tilt", Tilt.StringBundle.get("implement.info"));
      }
    });

    htmlButton = new Tilt.Button(new Tilt.Sprite(t, [935, 200, 48, 38]), {
      x: canvas.width - 337,
      y: -5,
      padding: [0, 0, 0, 5],
      hidden: true,
      onclick: function() {
        this.visualization.setHtmlEditor();
      }.bind(this)
    });

    cssButton = new Tilt.Button(new Tilt.Sprite(t, [935, 160, 36, 38]), {
      x: canvas.width - 377,
      y: -5,
      padding: [0, 0, 0, 5],
      hidden: true,
      onclick: function() {
        this.visualization.setCssEditor();
      }.bind(this)
    });

    attrButton = new Tilt.Button(new Tilt.Sprite(t, [935, 240, 84, 38]), {
      x: canvas.width - 465,
      y: -5,
      padding: [0, 0, 0, 5],
      hidden: true,
      onclick: function() {
        this.visualization.setAttributesEditor();
      }.bind(this)
    });

    eyeButton = new Tilt.Button(new Tilt.Sprite(t, [0, 147, 42, 42]), {
      x: 0,
      y: -5,
      onclick: function() {
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
      }
    });

    arcballSprite = new Tilt.Sprite(t, [0, 0, 145, 145], {
      x: 0,
      y: 0
    });

    arcballUpButton = new Tilt.Button(null, {
      x: 50,
      y: 4,
      width: 45,
      height: 30,
      onmousedown: function() {
        window.clearInterval(this.$arcballMove);
        this.$arcballMove = window.setInterval(function() {
          this.controller.translate(0, -5);

          if (!ui.mousePressed) {
            window.clearInterval(this.$arcballMove);
          }
        }.bind(this), 1000 / 60);
      }.bind(this)
    });

    arcballDownButton = new Tilt.Button(null, {
      x: 50,
      y: 110,
      width: 45,
      height: 30,
      onmousedown: function() {
        window.clearInterval(this.$arcballMove);
        this.$arcballMove = window.setInterval(function() {
          this.controller.translate(0, 5);

          if (!ui.mousePressed) {
            window.clearInterval(this.$arcballMove);
          }
        }.bind(this), 1000 / 60);
      }.bind(this)
    });

    arcballLeftButton = new Tilt.Button(null, {
      x: 4,
      y: 50,
      width: 30,
      height: 45,
      onmousedown: function() {
        window.clearInterval(this.$arcballMove);
        this.$arcballMove = window.setInterval(function() {
          this.controller.translate(-5, 0);

          if (!ui.mousePressed) {
            window.clearInterval(this.$arcballMove);
          }
        }.bind(this), 1000 / 60);
      }.bind(this)
    });

    arcballRightButton = new Tilt.Button(null, {
      x: 110,
      y: 50,
      width: 30,
      height: 45,
      onmousedown: function() {
        window.clearInterval(this.$arcballMove);
        this.$arcballMove = window.setInterval(function() {
          this.controller.translate(5, 0);

          if (!ui.mousePressed) {
            window.clearInterval(this.$arcballMove);
          }
        }.bind(this), 1000 / 60);
      }.bind(this)
    });

    resetButton = new Tilt.Button(new Tilt.Sprite(t, [0, 190, 42, 42]), {
      x: 50,
      y: 140,
      onclick: function() {
        this.controller.reset(0.95);
      }.bind(this)
    });

    zoomInButton = new Tilt.Button(new Tilt.Sprite(t, [0, 234, 42, 42]), {
      x: 90,
      y: 140,
      onclick: function() {
        this.controller.zoom(200);
      }.bind(this)
    });

    zoomOutButton = new Tilt.Button(new Tilt.Sprite(t, [0, 278, 42, 42]), {
      x: 10,
      y: 140,
      onclick: function() {
        this.controller.zoom(-200);
      }.bind(this)
    });

    domStripsContainer = new Tilt.ScrollContainer({
      x: 78,
      y: 310,
      width: 130,
      height: canvas.height - 310,
      background: "#0001",
      top: new Tilt.Sprite(t, [506, 69, 33, 30], {
        padding: [4, 4, 4, 8]
      }),
      bottom: new Tilt.Sprite(t, [506, 102, 33, 30], {
        padding: [4, 4, 4, 8]
      }),
      topReset: new Tilt.Sprite(t, [506, 134, 33, 30], {
        padding: [4, 8, 4, 4]
      })
    });

    domStripsLegend = new Tilt.Sprite(t, [1, 365, 69, 290], {
      x: 0,
      y: 302,
      disabled: true
    });

    htmlStripButton = new Tilt.Button(null, {
      x: 5,
      y: 311,
      width: 14,
      height: 14,
      fill: config.domStrips.htmlStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.htmlStripButton, htmlStripButton);
      }
    });

    headStripButton = new Tilt.Button(null, {
      x: 5,
      y: htmlStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.headStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.headStripButton, headStripButton);
      }
    });

    titleStripButton = new Tilt.Button(null, {
      x: 5,
      y: headStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.titleStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.titleStripButton, titleStripButton);
      }
    });

    scriptStripButton = new Tilt.Button(null, {
      x: 5,
      y: titleStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.scriptStripButton.fill,
      onclick: function() {
        showColorPicker(
          config.domStrips.scriptStripButton, scriptStripButton);
      }
    });

    styleStripButton = new Tilt.Button(null, {
      x: 5,
      y: scriptStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.styleStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.styleStripButton, styleStripButton);
      }
    });

    divStripButton = new Tilt.Button(null, {
      x: 5,
      y: styleStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.divStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.divStripButton, divStripButton);
      }
    });

    spanStripButton = new Tilt.Button(null, {
      x: 5,
      y: divStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.spanStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.spanStripButton, spanStripButton);
      }
    });

    tableStripButton = new Tilt.Button(null, {
      x: 5,
      y: spanStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.tableStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.tableStripButton, tableStripButton);
      }
    });

    trStripButton = new Tilt.Button(null, {
      x: 5,
      y: tableStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.trStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.trStripButton, trStripButton);
      }
    });

    tdStripButton = new Tilt.Button(null, {
      x: 5,
      y: trStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.tdStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.tdStripButton, tdStripButton);
      }
    });

    pStripButton = new Tilt.Button(null, {
      x: 5,
      y: tdStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.pStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.pStripButton, pStripButton);
      }
    });

    aStripButton = new Tilt.Button(null, {
      x: 5,
      y: pStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.aStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.aStripButton, aStripButton);
      }
    });

    imgStripButton = new Tilt.Button(null, {
      x: 5,
      y: aStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.imgStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.imgStripButton, imgStripButton);
      }
    });

    otherStripButton = new Tilt.Button(null, {
      x: 5,
      y: imgStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips.otherStripButton.fill,
      onclick: function() {
        showColorPicker(config.domStrips.otherStripButton, otherStripButton);
      }
    });

    var showColorPicker = function(config, sender) {
      this.$colorPickerConfig = config;
      this.$colorPickerSender = sender;

      var rgb = Tilt.Math.hex2rgba(config.fill),
        hsl = Tilt.Math.rgb2hsv(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255);

      document.getElementById("tilt-colorpicker-iframe").contentWindow
        .refreshColorPicker(hsl[0] * 360, hsl[1] * 100, hsl[2] * 100);

      TiltChrome.BrowserOverlay.colorPicker.openPopup(null, null,
        220 + sender.getX(),
        80 + sender.getY());
    }.bind(this);

    var viewModeNormalSprite = new Tilt.Sprite(t, [438, 67, 66, 66]);
    var viewModeWireframeSprite = new Tilt.Sprite(t, [438, 0, 66, 66]);
    viewModeButton = new Tilt.Button(viewModeWireframeSprite, {
      x: 39,
      y: 180,
      padding: [12, 10, 12, 12],
      onclick: function() {
        if (viewModeButton.type !== 1) {
          viewModeButton.type = 1;
          viewModeButton.setSprite(viewModeNormalSprite);

          var wireframe = config.viewMode.wireframe;
          hueSlider.setValue(wireframe.hueSlider.value);
          saturationSlider.setValue(wireframe.saturationSlider.value);
          brightnessSlider.setValue(wireframe.brightnessSlider.value);
          alphaSlider.setValue(wireframe.alphaSlider.value);
          textureSlider.setValue(wireframe.textureSlider.value);
          updateMeshColor();

          this.visualization.setMeshWireframeColor(
            wireframe.mesh.wireframeColor);
        }
        else {
          viewModeButton.type = 0;
          viewModeButton.setSprite(viewModeWireframeSprite);

          var normal = config.viewMode.normal;
          hueSlider.setValue(normal.hueSlider.value);
          saturationSlider.setValue(normal.saturationSlider.value);
          brightnessSlider.setValue(normal.brightnessSlider.value);
          alphaSlider.setValue(normal.alphaSlider.value);
          textureSlider.setValue(normal.textureSlider.value);
          updateMeshColor();

          this.visualization.setMeshWireframeColor(
            normal.mesh.wireframeColor);
        }
      }.bind(this)
    });

    colorAdjustButton = new Tilt.Button(new Tilt.Sprite(t, [505, 0, 66, 66]),{
      x: 39,
      y: 240,
      padding: [12, 10, 14, 16],
      onclick: function() {
        colorAdjustPopup.hidden ^= true;
      }.bind(this)
    });

    var handlerSprite = new Tilt.Sprite(t, [574, 131, 29, 29], {
      padding: [8, 8, 8, 8]
    });

    hueSlider = new Tilt.Slider(handlerSprite, {
      x: 64,
      y: 12,
      size: 120,
      value: config.viewMode.initial.hueSlider.value,
      onmousedown: function() {
        updateMeshColor();
      }
    });

    saturationSlider = new Tilt.Slider(handlerSprite, {
      x: hueSlider.getX(),
      y: hueSlider.getY() + 19,
      size: 120,
      value: config.viewMode.initial.saturationSlider.value,
      onmousedown: function() {
        updateMeshColor();
      }
    });

    brightnessSlider = new Tilt.Slider(handlerSprite, {
      x: hueSlider.getX(),
      y: saturationSlider.getY() + 18,
      size: 120,
      value: config.viewMode.initial.brightnessSlider.value,
      onmousedown: function() {
        updateMeshColor();
      }
    });

    alphaSlider = new Tilt.Slider(handlerSprite, {
      x: hueSlider.getX(),
      y: brightnessSlider.getY() + 18,
      size: 120,
      value: config.viewMode.initial.alphaSlider.value,
      onmousedown: function() {
        updateMeshColor();
      }
    });

    textureSlider = new Tilt.Slider(handlerSprite, {
      x: hueSlider.getX(),
      y: alphaSlider.getY() + 18,
      size: 120,
      value: config.viewMode.initial.textureSlider.value,
      onmousedown: function() {
        updateMeshColor();
      }
    });

    var updateMeshColor = function() {
      window.clearInterval(this.$sliderMove);
      this.$sliderMove = window.setInterval(function() {

        var rgba = Tilt.Math.hsv2rgb(
          hueSlider.getValue() / 100,
          saturationSlider.getValue() / 100,
          brightnessSlider.getValue() / 100),
          textureAlpha = textureSlider.getValue() / 100;

        rgba[0] /= 255;
        rgba[1] /= 255;
        rgba[2] /= 255;
        rgba[3] = alphaSlider.getValue() / 100;

        this.visualization.setMeshColor(rgba);
        this.visualization.setMeshTextureAlpha(textureAlpha);

        if (!ui.mousePressed) {
          window.clearInterval(this.$sliderMove);
        }
      }.bind(this), 1000 / 60);
    }.bind(this);

    var colorAdjustPopupSprite = new Tilt.Sprite(t, [572, 1, 231, 126], {
      disabled: true
    });
    colorAdjustPopup = new Tilt.Container({
      x: 77,
      y: 239,
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
      height: 30,
      onclick: function() {
        ui.dismissModal(helpPopup);
      }
    });

    helpPopup = new Tilt.Container({
      hidden: true,
      background: "#0007",
      elements: [helpBoxSprite, helpCloseButon]
    });

    alwaysVisibleElements.push(
      background, exitButton, eyeButton);

    hideableElements.push(
      helpButton, exportButton, optionsButton,
      resetButton, zoomInButton, zoomOutButton, arcballSprite, 
      arcballUpButton, arcballDownButton,
      arcballLeftButton, arcballRightButton,
      viewModeButton, colorAdjustButton, domStripsLegend,
      htmlStripButton,
      headStripButton,
      titleStripButton,
      scriptStripButton,
      styleStripButton,
      divStripButton,
      spanStripButton,
      tableStripButton,
      trStripButton,
      tdStripButton,
      pStripButton,
      aStripButton,
      imgStripButton,
      otherStripButton);

    sourceEditorElements.push(
      htmlButton, cssButton, attrButton);

    alwaysVisibleElements.forEach(function(element) {
      view.push(element);
    });

    hideableElements.forEach(function(element) {
      view.push(element);
    });

    sourceEditorElements.forEach(function(element) {
      view.push(element);
    });
  };

  /**
   * Event handling the source editor panel popup showing.
   */
  var eEditorShown = function() {
    htmlButton.hidden = false;
    cssButton.hidden = false;
    attrButton.hidden = false;
  };

  /**
   * Event handling the source editor panel popup hiding.
   */
  var eEditorHidden = function() {
    htmlButton.hidden = true;
    cssButton.hidden = true;
    attrButton.hidden = true;

    window.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils)
      .garbageCollect();
  };

  /**
   * Event handling the color picker panel popup showing.
   */
  var ePickerShown = function() {
  };

  /**
   * Event handling the color picker panel popup hiding.
   */
  var ePickerHidden = function() {
    var iframe = document.getElementById("tilt-colorpicker-iframe"),
      hex = iframe.contentDocument.colorPicked;

    if ("undeifined" !== typeof hex) {
      this.$colorPickerConfig.fill = hex;
      this.$colorPickerSender.setFill(hex);
      this.domVisualizationMeshReadyCallback();
    }

    window.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils)
      .garbageCollect();
  }.bind(this);

  /**
   * Called automatically by the visualization after each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.draw = function(frameDelta) {
    ui.draw();
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
      x = 3 + depth * 6,
      y = 3 + stripNo * 10,
      height = 7,
      stripButton, stripIdButton, stripClassButton, right,

    namelength = Tilt.Math.clamp(node.localName.length, 3, 10),
    clslength = Tilt.Math.clamp(node.localName.length, 3, 10),
    idlength = Tilt.Math.clamp(node.id.length, 3, 10),

    clsx = x + namelength * 10 + 3,
    idx = clsx + clslength * 3 + 3;

    stripButton = new Tilt.Button(null, {
      x: x,
      y: y,
      width: namelength * 10,
      height: height,
      padding: [-1, -1, -1, -1],
      stroke: config.domStrips.prototypeStripButton.stroke
    });

    right = stripButton.getX() + stripButton.getWidth();

    if (node.className) {
      stripClassButton = new Tilt.Button(null, {
        x: clsx,
        y: y,
        width: clslength * 3,
        height: height,
        padding: [-1, -1, -1, -1],
        stroke: stripButton.getStroke()
      });

      right = Math.max(right,
        stripClassButton.getX() + stripClassButton.getWidth());
    }

    if (node.id) {
      stripIdButton = new Tilt.Button(null, {
        x: idx,
        y: y,
        width: idlength * 3,
        height: height,
        padding: [-1, -1, -1, -1],
        stroke: stripButton.getStroke()
      });

      right = Math.max(right,
        stripIdButton.getX() + stripIdButton.getWidth());
    }

    if (right > domStripsContainer.view.getWidth()) {
      domStripsContainer.view.setWidth(right);
    }

    if (stripButton) {
      domStripsContainer.view.push(stripButton);
      stripButton.type = node.localName;

      stripButton.onclick = function() {
        if (node.localName === "meta" ||
            node.localName === "link" ||
            node.localName === "script" || node.localName === "noscript" ||
            node.localName === "style") {

          this.visualization.setAttributesEditor();
          this.visualization.openEditor(uid);
        }
        else {
          this.visualization.setHtmlEditor();
          this.visualization.openEditor(uid);
        }
      }.bind(this);
    }

    if (stripClassButton) {
      domStripsContainer.view.push(stripClassButton);
      stripClassButton.setFill(stripButton.getFill());
      stripClassButton.type = node.localName;

      stripClassButton.onclick = function() {
        this.visualization.setAttributesEditor();
        this.visualization.openEditor(uid);
      }.bind(this);
    }

    if (stripIdButton) {
      domStripsContainer.view.push(stripIdButton);
      stripIdButton.setFill(stripButton.getFill());
      stripIdButton.type = node.localName;

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
    domStripsContainer.view.forEach(function(element) {
      if (element.type === "html") {
        element.setFill(config.domStrips.htmlStripButton.fill);
      }
      else if (element.type === "head") {
        element.setFill(config.domStrips.headStripButton.fill);
      }
      else if (element.type === "title") {
        element.setFill(config.domStrips.titleStripButton.fill);
      }
      else if (element.type === "meta") {
        element.setFill(config.domStrips.scriptStripButton.fill + "22");
      }
      else if (element.type === "link") {
        element.setFill(config.domStrips.scriptStripButton.fill + "11");
      }
      else if (element.type === "script" || element.type === "noscript") {
        element.setFill(config.domStrips.scriptStripButton.fill);
      }
      else if (element.type === "style") {
        element.setFill(config.domStrips.styleStripButton.fill);
      }
      else if (element.type === "body") {
        element.setFill(config.domStrips.headStripButton.fill);
      }
      else if (element.type === "div") {
        element.setFill(config.domStrips.divStripButton.fill);
      }
      else if (element.type === "span") {
        element.setFill(config.domStrips.spanStripButton.fill);
      }
      else if (element.type === "table") {
        element.setFill(config.domStrips.tableStripButton.fill);
      }
      else if (element.type === "tbody") {
        element.setFill(config.domStrips.tableStripButton.fill + "99");
      }
      else if (element.type === "tr") {
        element.setFill(config.domStrips.trStripButton.fill);
      }
      else if (element.type === "td") {
        element.setFill(config.domStrips.tdStripButton.fill);
      }
      else if (element.type === "p") {
        element.setFill(config.domStrips.pStripButton.fill);
      }
      else if (element.type === "a") {
        element.setFill(config.domStrips.aStripButton.fill);
      }
      else if (element.type === "img") {
        element.setFill(config.domStrips.imgStripButton.fill);
      }
      else if (element.type === "h1") {
        element.setFill("#FF0D");
      }
      else if (element.type === "h2") {
        element.setFill("#EE0D");
      }
      else if (element.type === "h3") {
        element.setFill("#DD0D");
      }
      else if (element.type === "h4") {
        element.setFill("#CC0D");
      }
      else if (element.type === "h5") {
        element.setFill("#BB0D");
      }
      else if (element.type === "h6") {
        element.setFill("#AA0D");
      }
      else {
        element.setFill(config.domStrips.otherStripButton.fill);
      }
    });
  };

  /**
   * Delegate method, called when the user interface needs to be resized.
   *
   * @param width: the new width of the visualization
   * @param height: the new height of the visualization
   */
  this.resize = function(width, height) {
    background.setSize(width, height);

    exitButton.setX(width - 50);
    helpButton.setX(width - 150);
    exportButton.setX(width - 215);
    optionsButton.setX(width - 285);

    htmlButton.setX(width - 337);
    cssButton.setX(width - 377);
    attrButton.setX(width - 465);

    domStripsContainer.view.setHeight(height - 310);
  };

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function(canvas) {
    this.visualization = null;
    ui = null;
    config = null;

    var sourceEditor = TiltChrome.BrowserOverlay.sourceEditor;
    if (eEditorShown !== null) {
      sourceEditor.removeEventListener("popupshown", eEditorShown, false);
      eEditorShown = null;
    }
    if (eEditorHidden !== null) {
      sourceEditor.removeEventListener("popuphidden", eEditorHidden, false);
      eEditorHidden = null;
    }

    var colorPicker = TiltChrome.BrowserOverlay.colorPicker;
    if (ePickerShown !== null) {
      colorPicker.removeEventListener("popupshown", ePickerShown, false);
      ePickerShown = null;
    }
    if (ePickerHidden !== null) {
      colorPicker.removeEventListener("popuphidden", ePickerHidden, false);
      ePickerHidden = null;
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

    if (t !== null) {
      t.destroy();
      t = null;
    }
    if (background !== null) {
      background.destroy();
      background = null;
    }
    if (alwaysVisibleElements !== null) {
      alwaysVisibleElements.forEach(function(element) {
        element.destroy();
      });
      alwaysVisibleElements = null;
    }
    if (hideableElements !== null) {
      hideableElements.forEach(function(element) {
        element.destroy();
      });
      hideableElements = null;
    }
    if (sourceEditorElements !== null) {
      sourceEditorElements.forEach(function(element) {
        element.destroy();
      });
      sourceEditorElements = null;
    }

    domStripsLegend = null;
    htmlStripButton = null;
    headStripButton = null;
    titleStripButton = null;
    scriptStripButton = null;
    styleStripButton = null;
    divStripButton = null;
    spanStripButton = null;
    tableStripButton = null;
    trStripButton = null;
    tdStripButton = null;
    pStripButton = null;
    aStripButton = null;
    imgStripButton = null;
    otherStripButton = null;

    exitButton = null;
    helpButton = null;
    exportButton = null;
    optionsButton = null;
    attrButton = null;
    htmlButton = null;
    cssButton = null;

    eyeButton = null;
    arcballSprite = null;
    arcballUpButton = null;
    arcballDownButton = null;
    arcballLeftButton = null;
    arcballRightButton = null;
    resetButton = null;
    zoomInButton = null;
    zoomOutButton = null;

    viewModeButton = null;
    colorAdjustButton = null;

    hueSlider = null;
    saturationSlider = null;
    brightnessSlider = null;
    alphaSlider = null;
    textureSlider = null;

    helpBoxSprite = null;
    helpCloseButon = null;

    sourceEditor = null;
    colorPicker = null;

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.UI", this);  
};
