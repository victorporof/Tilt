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

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.UI.Default"];

/*global Tilt */
/*jshint sub: true, undef: false, onevar: false */

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
  alwaysVisibleElements = null,
  hideableElements = null,
  helpContainer = null,
  colorAdjustContainer = null,
  minidomContainer = null,

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
  headOrBodyStripButton = null,
  titleStripButton = null,
  styleStripButton = null,
  scriptStripButton = null,
  divStripButton = null,
  spanStripButton = null,
  tableStripButton = null,
  trStripButton = null,
  tdStripButton = null,
  ulStripButton = null,
  liStripButton = null,
  pStripButton = null,
  aStripButton = null,
  imgStripButton = null,
  iframeStripButton = null,
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
  helpCloseButon = null;

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    if (!canvas) {
      return;
    }

    t = new Tilt.Texture("chrome://tilt/skin/tilt-ui.png", {
      minFilter: "nearest",
      magFilter: "nearest",
      onload: function() {
        this.visualization.requestRedraw();
      }.bind(this)
    });

    alwaysVisibleElements = new Tilt.Container();
    hideableElements = new Tilt.Container();

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
        var helpX = canvas.width * 0.5 - 305,
          helpY = canvas.height * 0.5 - 305,
          exitX = canvas.width * 0.5 + 197,
          exitY = canvas.height * 0.5 - 218;

        helpBoxSprite.setPosition(helpX, helpY);
        helpCloseButon.setPosition(exitX, exitY);
        ui.presentModal(helpContainer);
      }.bind(this)
    });

    exportButton = new Tilt.Button(new Tilt.Sprite(t, [935, 40, 61, 38]), {
      x: canvas.width - 215,
      y: -5,
      padding: [0, 0, 0, 5],
      onclick: function() {
        var folderPicker = Tilt.StringBundle.get("folderPicker.string"),
          webpageFilename = Tilt.StringBundle.get("webpageFilename.string"),
          folder = Tilt.File.showPicker(folderPicker, "folder");

        if (folder) {
          folder.reveal();
          this.visualization.performMeshSave(folder.path, webpageFilename);
        }
      }.bind(this)
    });

    optionsButton = new Tilt.Button(new Tilt.Sprite(t, [935, 0, 66, 38]), {
      x: canvas.width - 285,
      y: -5,
      padding: [0, 0, 0, 5],
      onclick: function() {
        window.open("chrome://tilt/content/TiltChromeOptions.xul", "Options",
          "chrome, modal, centerscreen, width=410, height=320");

        TiltChrome.Config.Visualization.reload();
        TiltChromeEntryPoint.refreshKeyset();
      }.bind(this)
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
      padding: [6, 6, 6, 6],
      onclick: function() {
        window.clearInterval(this.$arcballMove);
        this.$arcballTranslation = 0;
        this.$arcballMove = window.setInterval(function() {
          this.$arcballTranslation++;
          this.controller.translate(minidomContainer.view.hidden ? -5: 5, 0);

          if (this.$arcballTranslation >= 20) {
            window.clearInterval(this.$arcballMove);
          }
        }.bind(this), 1000 / 60);

        hideableElements.hidden ^= true;
        minidomContainer.view.hidden ^= true;

        if (!helpContainer.hidden) {
          helpContainer.hidden = true;
        }
        if (!colorAdjustContainer.hidden) {
          colorAdjustContainer.hidden = true;
        }
      }.bind(this)
    });

    arcballSprite = new Tilt.Sprite(t, [0, 0, 145, 145], {
      x: 0,
      y: 0,
      disabled: true
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
      y: 135,
      padding: [6, 6, 6, 6],
      onclick: function() {
        this.controller.reset(0.95);
      }.bind(this)
    });

    zoomInButton = new Tilt.Button(new Tilt.Sprite(t, [0, 234, 42, 42]), {
      x: 90,
      y: resetButton.getY(),
      padding: [6, 6, 6, 6],
      onclick: function() {
        this.controller.zoom(200);
      }.bind(this)
    });

    zoomOutButton = new Tilt.Button(new Tilt.Sprite(t, [0, 278, 42, 42]), {
      x: 10,
      y: resetButton.getY(),
      padding: [6, 6, 6, 6],
      onclick: function() {
        this.controller.zoom(-200);
      }.bind(this)
    });

    domStripsLegend = new Tilt.Sprite(t, [1, 324, 89, 354], {
      x: 0,
      y: 293,
      disabled: true
    });

    minidomContainer = new Tilt.ScrollContainer({
      x: 85,
      y: 300,
      width: 130,
      height: canvas.height - 310,
      background: "#0001",
      scrollable: [0, Math.MAX_VALUE],
      top: new Tilt.Sprite(t, [45, 222, 33, 30], {
        padding: [2, 2, 2, 4]
      }),
      bottom: new Tilt.Sprite(t, [45, 255, 33, 30], {
        padding: [2, 2, 2, 4]
      }),
      reset: new Tilt.Sprite(t, [45, 289, 33, 30], {
        padding: [2, 4, 2, 2]
      })
    });

    htmlStripButton = new Tilt.Button(null, {
      x: 5,
      y: 301,
      width: 14,
      height: 14,
      fill: config.domStrips["html"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["html"], htmlStripButton);
      }
    });

    headOrBodyStripButton = new Tilt.Button(null, {
      x: 5,
      y: htmlStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["head/body"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["head/body"], headOrBodyStripButton);
      }
    });

    titleStripButton = new Tilt.Button(null, {
      x: 5,
      y: headOrBodyStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["title"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["title"], titleStripButton);
      }
    });

    styleStripButton = new Tilt.Button(null, {
      x: 5,
      y: titleStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["style"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["style"], styleStripButton);
      }
    });

    scriptStripButton = new Tilt.Button(null, {
      x: 5,
      y: styleStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["script"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["script"], scriptStripButton);
      }
    });

    divStripButton = new Tilt.Button(null, {
      x: 5,
      y: scriptStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["div"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["div"], divStripButton);
      }
    });

    spanStripButton = new Tilt.Button(null, {
      x: 5,
      y: divStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["span"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["span"], spanStripButton);
      }
    });

    tableStripButton = new Tilt.Button(null, {
      x: 5,
      y: spanStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["table"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["table"], tableStripButton);
      }
    });

    trStripButton = new Tilt.Button(null, {
      x: 5,
      y: tableStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["tr"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["tr"], trStripButton);
      }
    });

    tdStripButton = new Tilt.Button(null, {
      x: 5,
      y: trStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["td"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["td"], tdStripButton);
      }
    });

    ulStripButton = new Tilt.Button(null, {
      x: 5,
      y: tdStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["ul"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["ul"], ulStripButton);
      }
    });

    liStripButton = new Tilt.Button(null, {
      x: 5,
      y: ulStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["li"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["li"], liStripButton);
      }
    });

    pStripButton = new Tilt.Button(null, {
      x: 5,
      y: liStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["p"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["p"], pStripButton);
      }
    });

    aStripButton = new Tilt.Button(null, {
      x: 5,
      y: pStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["a"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["a"], aStripButton);
      }
    });

    imgStripButton = new Tilt.Button(null, {
      x: 5,
      y: aStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["img"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["img"], imgStripButton);
      }
    });

    iframeStripButton = new Tilt.Button(null, {
      x: 5,
      y: imgStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["iframe"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["iframe"], iframeStripButton);
      }
    });

    otherStripButton = new Tilt.Button(null, {
      x: 5,
      y: iframeStripButton.getY() + 20,
      width: 14,
      height: 14,
      fill: config.domStrips["other"].fill,
      onclick: function() {
        showColorPicker(config.domStrips["other"], otherStripButton);
      }
    });

    var showColorPicker = function(config, sender) {
      this.$colorPickerConfig = config;
      this.$colorPickerButton = sender;

      var cp = TiltChrome.BrowserOverlay.colorPicker,
        rgb = Tilt.Math.hex2rgba(config.fill),
        hsl = Tilt.Math.rgb2hsv(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255);

      cp.refresh(hsl[0] * 360, hsl[1] * 100, hsl[2] * 100);
      cp.panel.openPopup(null, null, 200 + sender.getX(), 80 + sender.getY());
    }.bind(this);

    var viewModeNormalSprite = new Tilt.Sprite(t, [438, 67, 66, 66]);
    var viewModeWireframeSprite = new Tilt.Sprite(t, [438, 0, 66, 66]);
    viewModeButton = new Tilt.Button(viewModeWireframeSprite, {
      x: 39,
      y: 170,
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

          this.visualization.setMeshWireframeColor(wireframe.mesh.outline);
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

          this.visualization.setMeshWireframeColor(normal.mesh.outline);
        }
      }.bind(this)
    });

    colorAdjustButton = new Tilt.Button(new Tilt.Sprite(t, [505, 0, 66, 66]),{
      x: 39,
      y: 230,
      padding: [12, 10, 14, 16],
      onclick: function() {
        colorAdjustContainer.hidden ^= true;
        this.visualization.requestRedraw();
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
          hueSlider.getValue() * 0.01,
          saturationSlider.getValue() * 0.01,
          brightnessSlider.getValue() * 0.01),
          textureAlpha = textureSlider.getValue() * 0.01;

        rgba[0] /= 255;
        rgba[1] /= 255;
        rgba[2] /= 255;
        rgba[3] = alphaSlider.getValue() * 0.01;

        this.visualization.setMeshColor(rgba);
        this.visualization.setMeshTextureAlpha(textureAlpha);

        if (!ui.mousePressed) {
          window.clearInterval(this.$sliderMove);
        }
      }.bind(this), 1000 / 60);
    }.bind(this);

    var colorAdjustContainerSprite = new Tilt.Sprite(t, [572, 1, 231, 126], {
      disabled: true
    });
    colorAdjustContainer = new Tilt.Container({
      x: 77,
      y: 239,
      hidden: true,
      elements: [
        colorAdjustContainerSprite,
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
        ui.dismissModal(helpContainer);
      }.bind(this)
    });

    helpContainer = new Tilt.Container({
      hidden: true,
      background: "#0107",
      elements: [helpBoxSprite, helpCloseButon]
    });

    alwaysVisibleElements.push(
      background, exitButton, eyeButton);

    hideableElements.push(
      helpButton, exportButton, optionsButton,
      htmlButton, cssButton, attrButton,
      resetButton, zoomInButton, zoomOutButton, arcballSprite,
      arcballUpButton, arcballDownButton,
      arcballLeftButton, arcballRightButton,
      viewModeButton, colorAdjustButton, domStripsLegend,
      htmlStripButton,
      headOrBodyStripButton,
      titleStripButton,
      styleStripButton,
      scriptStripButton,
      divStripButton,
      spanStripButton,
      tableStripButton,
      trStripButton,
      tdStripButton,
      ulStripButton,
      liStripButton,
      pStripButton,
      aStripButton,
      imgStripButton,
      iframeStripButton,
      otherStripButton);

    if (TiltChrome.Config.Visualization.hideUserInterfaceAtInit) {
      eyeButton.onclick();
    }
    if (TiltChrome.Config.Visualization.disableMinidomAtInit) {
      minidomContainer.view.hidden = true;
    }
  };

  /**
   * Called automatically by the visualization after each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.draw = function(frameDelta) {
    ui.draw();
  };

  /**
   * Function called automatically when the source editor panel popup showing.
   */
  this.panelEditorShown = function() {
    htmlButton.hidden = false;
    cssButton.hidden = false;
    attrButton.hidden = false;
  };

  /**
   * Function called automatically when the source editor panel popup hiding.
   */
  this.panelEditorHidden = function() {
    htmlButton.hidden = true;
    cssButton.hidden = true;
    attrButton.hidden = true;
  };

  /**
   * Function called automatically when the color picker panel popup showing.
   */
  this.panelPickerShown = function() {
  };

  /**
   * Function called automatically when the color picker panel popup hiding.
   */
  this.panelPickerHidden = function() {
    var hex = TiltChrome.BrowserOverlay.colorPicker.
      iframe.contentDocument.colorPicked;

    this.$colorPickerConfig.fill = hex;
    this.$colorPickerButton.setFill(hex);

    this.meshReadyCallback();
    this.visualization.performMeshColorbufferRefresh();
  };

  /**
   * Function called for each node in the dom tree.
   *
   * @param {HTMLNode} node: the dom node
   * @param {Number} depth: the node depth in the dom tree
   * @param {Number} index: the index of the node in the dom tree
   * @param {Number} uid: a unique id for the node
   */
  this.meshNodeCallback = function(node, depth, index, uid) {
    if (TiltChrome.Config.Visualization.disableMinidomAtInit) {
      return;
    }

    if (minidomContainer.$loaded) {
      minidomContainer.$loaded = false;
      minidomContainer.view.clear();
      this.stripNo = 0;
    }
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
      stripButton, stripIdButton, stripClassButton, right, bottom,

    namelength = Tilt.Math.clamp(node.localName.length, 4, 10),
    idlength = Tilt.Math.clamp(node.id.length, 4, 10),
    clslength = Tilt.Math.clamp(node.className.length, 4, 10),

    idx = x + namelength * 10 + 3,
    clsx = idx + idlength * 2 + 3;

    stripButton = new Tilt.Button(null, {
      x: x,
      y: y,
      width: namelength * 10,
      height: height,
      padding: [-1, -1, -1, -1],
      stroke: config.domStrips.stripButton.stroke
    });

    right = stripButton.getX() + stripButton.getWidth();
    bottom = stripButton.getY() + stripButton.getHeight() * 2;

    if (node.id) {
      stripIdButton = new Tilt.Button(null, {
        x: idx,
        y: y,
        width: idlength * 2,
        height: height,
        padding: [-1, -1, -1, -1],
        stroke: stripButton.getStroke()
      });

      right = Math.max(right,
        stripIdButton.getX() + stripIdButton.getWidth());
    }

    if (node.className) {
      stripClassButton = new Tilt.Button(null, {
        x: clsx,
        y: y,
        width: clslength * 2,
        height: height,
        padding: [-1, -1, -1, -1],
        stroke: stripButton.getStroke()
      });

      right = Math.max(right,
        stripClassButton.getX() + stripClassButton.getWidth());
    }

    if (right > minidomContainer.view.getWidth()) {
      minidomContainer.view.setWidth(right);
    }
    minidomContainer.bottom = bottom;

    if (stripButton) {
      minidomContainer.view.push(stripButton);
      stripButton.localName = node.localName;

      stripButton.onclick = function() {
        if (node.localName === "img" ||
            node.localName === "input" ||
            node.localName === "button" ||
            node.localName === "meta" ||
            node.localName === "link" ||
            node.localName === "style" ||
            node.localName === "script" ||
            node.localName === "noscript") {

          this.visualization.setAttributesEditor();
          this.visualization.openEditor(uid);
        }
        else {
          this.visualization.setHtmlEditor();
          this.visualization.openEditor(uid);
        }
      }.bind(this);
    }

    if (stripIdButton) {
      minidomContainer.view.push(stripIdButton);
      stripIdButton.setFill(stripButton.getFill());
      stripIdButton.localName = node.localName;

      stripIdButton.onclick = function() {
        this.visualization.setAttributesEditor();
        this.visualization.openEditor(uid);
      }.bind(this);
    }

    if (stripClassButton) {
      minidomContainer.view.push(stripClassButton);
      stripClassButton.setFill(stripButton.getFill());
      stripClassButton.localName = node.localName;

      stripClassButton.onclick = function() {
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
  this.meshReadyCallback = function(maxDepth, totalNodes) {
    if (TiltChrome.Config.Visualization.disableMinidomAtInit) {
      return;
    }

    // for each element in the dom strips container, update it's fill to match
    // the strip color code for the correspoding dom element
    minidomContainer.view.forEach(function(element) {

      // the head and body use an identical color code by default
      var name = (element.localName !== "head" &&
                  element.localName !== "body") ?
                  element.localName : "head/body",

      // the color settings may or not be specified for the current node name
      settings = config.domStrips[name] ||
                 config.domStrips["other"];

      element.setFill(settings.fill);
    });

    // set a flag for the minidom container
    minidomContainer.$loaded = true;
  };

  /**
   * Delegate method, called when the user interface needs to be resized.
   *
   * @param width: the new width of the visualization
   * @param height: the new height of the visualization
   */
  this.resize = function(width, height) {
    background.setSize(width, height);
    minidomContainer.view.setHeight(height - 310);

    exitButton.setX(width - 50);
    helpButton.setX(width - 150);
    exportButton.setX(width - 215);
    optionsButton.setX(width - 285);
    htmlButton.setX(width - 337);
    cssButton.setX(width - 377);
    attrButton.setX(width - 465);
  };

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function(canvas) {
    this.visualization = null;
    this.controller = null;
    ui = null;
    config = null;

    if (!canvas) {
      return;
    }

    if (alwaysVisibleElements !== null) {
      alwaysVisibleElements.destroy();
      alwaysVisibleElements = null;
    }
    if (hideableElements !== null) {
      hideableElements.destroy();
      hideableElements = null;
    }
    if (helpContainer !== null) {
      helpContainer.destroy();
      helpContainer = null;
    }
    if (colorAdjustContainer !== null) {
      colorAdjustContainer.destroy();
      colorAdjustContainer = null;
    }
    if (minidomContainer !== null) {
      minidomContainer.destroy();
      minidomContainer = null;
    }

    if (t !== null) {
      t.destroy();
      t = null;
    }
    if (background !== null) {
      background.destroy();
      background = null;
    }

    domStripsLegend = null;
    htmlStripButton = null;
    headOrBodyStripButton = null;
    titleStripButton = null;
    styleStripButton = null;
    scriptStripButton = null;
    divStripButton = null;
    spanStripButton = null;
    tableStripButton = null;
    trStripButton = null;
    tdStripButton = null;
    pStripButton = null;
    aStripButton = null;
    imgStripButton = null;
    iframeStripButton = null;
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

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.UI", this);
};
