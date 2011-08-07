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
var EXPORTED_SYMBOLS = ["TiltChrome.UI"];

/**
 * UI implementation.
 */
TiltChrome.UI = function() {

  /**
   * Handler for all the user interface elements.
   */
  var ui = null,

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
  helpPopup = null,

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
  colorAdjustButton = null,
  colorAdjustPopup = null,

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

  /**
   * Retain the position for the mouseDown event.
   */
  downX = 0, downY = 0;

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("click", click, false);
    canvas.addEventListener("dblclick", doubleClick, false);
    canvas.addEventListener("mousemove", mouseMove, false);

    ui = new Tilt.UI();

    texture = new Tilt.Texture("chrome://tilt/skin/tilt-ui.png", {
      minFilter: "nearest",
      magFilter: "nearest"
    });

    texture.onload = function() {
      this.visualization.redraw();
    }.bind(this);

    background = new Tilt.Sprite(texture, [0, 1024 - 256, 256, 256], {
      width: canvas.width,
      height: canvas.height
    });

    var helpPopupSprite = new Tilt.Sprite(texture, [210, 180, 610, 510]);
    helpPopup = new Tilt.Container(helpPopupSprite, {
      background: "#0107",
      hidden: true
    });

    optionsButton = new Tilt.Button(canvas.width - 290, 0,
      new Tilt.Sprite(texture, [942, 0, 77, 38]));

    exportButton = new Tilt.Button(canvas.width - 220, 0,
      new Tilt.Sprite(texture, [942, 40, 70, 38]));

    helpButton = new Tilt.Button(canvas.width - 150, 0,
      new Tilt.Sprite(texture, [942, 80, 55, 38]));

    helpButton.onclick = function(x, y) {
      var helpX = canvas.width / 2 - 305,
        helpY = canvas.height / 2 - 305,
        exitX = canvas.width / 2 + 197,
        exitY = canvas.height / 2 - 218;

      helpPopup.elements[0].x = helpX;
      helpPopup.elements[0].y = helpY;

      var exitButton = new Tilt.Button(exitX, exitY, {
        width: 32,
        height: 32
      }, function() {
        helpPopup.elements[1].destroy();
        helpPopup.elements.pop();
        helpPopup.hidden = true;
      });

      helpPopup.elements[1] = exitButton;
      helpPopup.hidden = false;
    }.bind(this);

    exitButton = new Tilt.Button(canvas.width - 50, 0,
      new Tilt.Sprite(texture, [942, 120, 50, 38]));

    exitButton.onclick = function(x, y) {
      TiltChrome.BrowserOverlay.destroy(true, true);
      TiltChrome.BrowserOverlay.href = null;
    }.bind(this);

    arcballSprite = new Tilt.Sprite(texture, [0, 0, 145, 145], {
      x: 10,
      y: 10
    });

    eyeButton = new Tilt.Button(0, 0,
      new Tilt.Sprite(texture, [0, 147, 42, 42]));

    eyeButton.onclick = function(x, y) {
      if (ui.elements.length === alwaysVisibleElements.length) {
        ui.push(hideableElements);
      }
      else {
        ui.remove(hideableElements);
      }
    }.bind(this);

    resetButton = new Tilt.Button(60, 150,
      new Tilt.Sprite(texture, [0, 190, 42, 42]));

    resetButton.onclick = function(x, y) {
      this.controller.reset(0.95);
    }.bind(this);

    resetButton.ondblclick = function(x, y) {
      this.controller.reset(0);
    }.bind(this);

    zoomInButton = new Tilt.Button(100, 150,
      new Tilt.Sprite(texture, [0, 234, 42, 42]));

    zoomInButton.onclick = function(x, y) {
      this.controller.zoom(200);
    }.bind(this);

    zoomOutButton = new Tilt.Button(20, 150,
      new Tilt.Sprite(texture, [0, 278, 42, 42]));

    zoomOutButton.onclick = function(x, y) {
      this.controller.zoom(-200);
    }.bind(this);

    var viewModeNormalSprite = new Tilt.Sprite(texture, [438, 67, 66, 66]);
    var viewModeWireframeSprite = new Tilt.Sprite(texture, [438, 0, 66, 66]);
    viewModeButton = new Tilt.Button(50, 200, viewModeWireframeSprite);

    viewModeButton.onclick = function() {
      if (viewModeButton.sprite === viewModeWireframeSprite) {
        viewModeButton.sprite = viewModeNormalSprite;
        hueSlider.value = 50;
        saturationSlider.value = 25;
        brightnessSlider.value = 100;
        textureSlider.value = 100;
        alphaSlider.value = 4;

        this.visualization.setMeshWireframeColor([1, 1, 1, 0.7]);
      }
      else {
        viewModeButton.sprite = viewModeWireframeSprite;
        hueSlider.value = 50;
        saturationSlider.value = 0;
        brightnessSlider.value = 100;
        textureSlider.value = 100;
        alphaSlider.value = 100;

        this.visualization.setMeshWireframeColor([0, 0, 0, 0.25]);
      }

      var rgba = Tilt.Math.hsv2rgb(
        hueSlider.value / 100,
        saturationSlider.value / 100,
        brightnessSlider.value / 100);

      rgba[0] /= 255;
      rgba[1] /= 255;
      rgba[2] /= 255;
      rgba[3] = alphaSlider.value / 100;

      this.visualization.setMeshColor(rgba);
      this.visualization.setMeshTextureAlpha(textureSlider.value / 100);
      this.visualization.redraw();
    }.bind(this);

    colorAdjustButton = new Tilt.Button(50, 260,
      new Tilt.Sprite(texture, [505, 0, 66, 66]));

    colorAdjustButton.onclick = function(x, y) {
      colorAdjustPopup.hidden ^= true;
    };

    var colorAdjustPopupSprite = new Tilt.Sprite(texture, [572, 0, 231, 128],{
      x: 88,
      y: 258
    });
    colorAdjustPopup = new Tilt.Container([colorAdjustPopupSprite], {
      hidden: true
    });

    var sliderHandlerSprite = new Tilt.Sprite(texture, [574, 131, 29, 29], {
      padding: [8, 8, 8, 8]
    });
    hueSlider = new Tilt.Slider(152, 271, 120, sliderHandlerSprite, {
      value: 50
    });
    saturationSlider = new Tilt.Slider(152, 290, 120, sliderHandlerSprite, {
      value: 0
    });
    brightnessSlider = new Tilt.Slider(152, 308, 120, sliderHandlerSprite, {
      value: 100
    });
    alphaSlider = new Tilt.Slider(152, 326, 120, sliderHandlerSprite, {
      value: 90
    });
    textureSlider = new Tilt.Slider(152, 344, 120, sliderHandlerSprite, {
      value: 100
    });

    alwaysVisibleElements.push(
      eyeButton, exitButton);

    hideableElements.push(
      helpPopup, colorAdjustPopup,
      arcballSprite, resetButton, zoomInButton, zoomOutButton,
      viewModeButton, colorAdjustButton,
      optionsButton, exportButton, helpButton);

    ui.push([alwaysVisibleElements, hideableElements]);
    colorAdjustPopup.push(
      [hueSlider, saturationSlider, brightnessSlider,
      alphaSlider, textureSlider]);
  };

  /**
   * Called automatically by the visualization at the beginning of draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.background = function(frameDelta) {
    background.draw();
  };

  /**
   * Called automatically by the visualization after each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.draw = function(frameDelta) {
    ui.draw(frameDelta);

    var rgba = Tilt.Math.hsv2rgb(
      hueSlider.value / 100,
      saturationSlider.value / 100,
      brightnessSlider.value / 100);

    rgba[0] /= 255;
    rgba[1] /= 255;
    rgba[2] /= 255;
    rgba[3] = alphaSlider.value / 100;

    this.visualization.setMeshColor(rgba);
    this.visualization.setMeshTextureAlpha(textureSlider.value / 100);
  };

  /**
   * Function called for each node in the dom tree
   * 
   * @param {HTMLNode} node: the dom node
   * @param {Number} depth: the node depth in the dom tree
   * @param {Number} index: the index of the node in the dom tree
   */
  this.domVisualizationNodeCallback = function(node, depth, index) {
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
    var cx = x + node.localName.length * 10 + 3;
    var idx = cx + (node.className.length || 3) * 3 + 3;

    stripButton = new Tilt.Button(x, y, {
      width: node.localName.length * 10,
      height: height,
      stroke: "#fff2"
    });

    if (node.className) {
      stripClassButton = new Tilt.Button(cx, y, {
        width: (node.className.length || 3) * 3,
        height: height,
        stroke: stripButton.sprite.stroke
      });
    }

    if (node.id) {
      stripIdButton = new Tilt.Button(idx, y, {
        width: (node.id.length || 3) * 3,
        height: height,
        stroke: stripButton.sprite.stroke
      });
    }

    if (node.localName === "html") {
      stripButton.sprite.color = "#fff";
    }
    else if (node.localName === "head") {
      stripButton.sprite.color = "#E667AF";
    }
    else if (node.localName === "title") {
      stripButton.sprite.color = "#CD0074";
    }
    else if (node.localName === "meta") {
      stripButton.sprite.color = "#BF7130";
    }
    else if (node.localName === "script") {
      stripButton.sprite.color = "#A64B00";
    }
    else if (node.localName === "style") {
      stripButton.sprite.color = "#FF9640";
    }
    else if (node.localName === "link") {
      stripButton.sprite.color = "#FFB273";
    }
    else if (node.localName === "body") {
      stripButton.sprite.color = "#E667AF";
    }
    else if (node.localName === "h1") {
      stripButton.sprite.color = "#ff0d";
    }
    else if (node.localName === "h2") {
      stripButton.sprite.color = "#ee0d";
    }
    else if (node.localName === "h3") {
      stripButton.sprite.color = "#dd0d";
    }
    else if (node.localName === "h4") {
      stripButton.sprite.color = "#cc0d";
    }
    else if (node.localName === "h5") {
      stripButton.sprite.color = "#bb0d";
    }
    else if (node.localName === "h6") {
      stripButton.sprite.color = "#aa0d";
    }
    else if (node.localName === "table") {
      stripButton.sprite.color = "#FF0700";
    }
    else if (node.localName === "tbody") {
      stripButton.sprite.color = "#FF070088";
    }
    else if (node.localName === "tr") {
      stripButton.sprite.color = "#FF4540";
    }
    else if (node.localName === "td") {
      stripButton.sprite.color = "#FF7673";
    }
    else if (node.localName === "div") {
      stripButton.sprite.color = "#5DC8CD";
    }
    else if (node.localName === "span") {
      stripButton.sprite.color = "#67E46F";
    }
    else if (node.localName === "p") {
      stripButton.sprite.color = "#888";
    }
    else if (node.localName === "a") {
      stripButton.sprite.color = "#123EAB";
    }
    else if (node.localName === "img") {
      stripButton.sprite.color = "#FFB473";
    }
    else {
      stripButton.sprite.color = "#444";
    }

    if (stripClassButton) {
      stripClassButton.sprite.color =
        node.className ? stripButton.sprite.color : "#0002";
    }
    if (stripIdButton) {
      stripIdButton.sprite.color =
        node.id ? stripButton.sprite.color : "#0002";
    }

    stripButton.onclick = function() {
      alert(depth);
    };

    hideableElements.unshift(stripButton, stripIdButton, stripClassButton);
  };

  /**
   * Function called when the dom tree was successfully traversed.
   *
   * @param {Number} maxDepth: the maximum depth of the dom tree
   * @param {Number} totalNodes: the total nodes in the dom tree
   */
  this.domVisualizationReadyCallback = function(maxDepth, totalNodes) {
    ui.remove(hideableElements);
    ui.push(hideableElements);
  };

  /**
   * Called once after every time a mouse button is pressed.
   */
  var mouseDown = function(e) {
    downX = e.clientX - e.target.offsetLeft;
    downY = e.clientY - e.target.offsetTop;

    if (ui.mouseDown(downX, downY, e.which)) {
      this.controller.pause();
    }
  }.bind(this);

  /**
   * Called every time a mouse button is released.
   */
  var mouseUp = function(e) {
    var upX = e.clientX - e.target.offsetLeft;
    var upY = e.clientY - e.target.offsetTop;

    ui.mouseUp(upX, upY, e.which);
    this.controller.unpause();
  }.bind(this);

  /**
   * Called every time a mouse button is clicked.
   */
  var click = function(e) {
    var clickX = e.clientX - e.target.offsetLeft;
    var clickY = e.clientY - e.target.offsetTop;

    if (Math.abs(downX - clickX) < 2 && Math.abs(downY - clickY) < 2) {
      ui.click(clickX, clickY);
    }
  }.bind(this);

  /**
   * Called every time a mouse button is double clicked.
   */
  var doubleClick = function(e) {
    var dblClickX = e.clientX - e.target.offsetLeft;
    var dblClickY = e.clientY - e.target.offsetTop;

    if (Math.abs(downX - dblClickX) < 2 && Math.abs(downY - dblClickY) < 2) {
      ui.doubleClick(dblClickX, dblClickY);
    }
  }.bind(this);

  /**
   * Called every time the mouse moves.
   */
  var mouseMove = function(e) {
    var moveX = e.clientX - e.target.offsetLeft;
    var moveY = e.clientY - e.target.offsetTop;

    ui.mouseMove(moveX, moveY);
    this.visualization.redraw();
  }.bind(this);

  /**
   * Delegate method, called when the user interface needs to be resized.
   *
   * @param width: the new width of the visualization
   * @param height: the new height of the visualization
   */
  this.resize = function(width, height) {
    background.width = width;
    background.height = height;

    optionsButton.x = width - 320;
    exportButton.x = width - 240;
    helpButton.x = width - 160;
    exitButton.x = width - 50;
  };

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function(canvas) {
    canvas.removeEventListener("mousedown", mouseDown, false);
    canvas.removeEventListener("mouseup", mouseUp, false);
    canvas.removeEventListener("click", click, false);
    canvas.removeEventListener("dblclick", doubleClick, false);
    canvas.removeEventListener("mousemove", mouseMove, false);

    try {
      ui.destroy();
      ui = null;
    }
    catch(e) {}

    texture = null;
    background = null;

    helpPopup = null;
    optionsButton = null;
    exportButton = null;
    helpButton = null;
    exitButton = null;

    arcballSprite = null;
    eyeButton = null;
    resetButton = null;
    zoomInButton = null;
    zoomOutButton = null;

    viewModeNormalButton = null;
    viewModeWireframeButton = null;
    colorAdjustButton = null;
    colorAdjustPopup = null;

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("TiltChrome.UI", this);  
};
