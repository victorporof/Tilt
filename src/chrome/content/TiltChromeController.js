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
var EXPORTED_SYMBOLS = ["TiltChrome.Controller.MouseAndKeyboard"];

/**
 * A mouse and keyboard implementation.
 */
TiltChrome.Controller = {};
TiltChrome.Controller.MouseAndKeyboard = function() {

  /**
   * Cache the top level UI handling events.
   */
  var ui = Tilt.UI,

  /**
   * Arcball used to control the visualization using the mouse.
   */
  arcball = null,

  /**
   * Retain the position for the mouseDown event.
   */
  downX = 0, downY = 0;

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    arcball = new Tilt.Arcball(canvas.width, canvas.height);

    // bind commonly used mouse and keyboard events with the controller
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("click", click, false);
    canvas.addEventListener("dblclick", doubleClick, false);
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mouseout", mouseOut, false);
    canvas.addEventListener("DOMMouseScroll", mouseScroll, false);
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("keyup", keyUp, false);
  };

  /**
   * Function called automatically by the visualization each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.loop = function(frameDelta) {
    var vis = this.visualization,
      coord = arcball.loop(frameDelta);

    // update the visualization
    vis.setRotation(coord.rotation);
    vis.setTranslation(coord.translation);
  };

  /**
   * Called once after every time a mouse button is pressed.
   */
  var mouseDown = function(e) {
    e.preventDefault();
    e.stopPropagation();

    downX = e.clientX - e.target.offsetLeft;
    downY = e.clientY - e.target.offsetTop;

    arcball.mouseDown(downX, downY, e.which);
    ui.mouseDown(downX, downY, e.which);
  };

  /**
   * Called every time a mouse button is released.
   */
  var mouseUp = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var upX = e.clientX - e.target.offsetLeft;
    var upY = e.clientY - e.target.offsetTop;
    var button = e.which;

    arcball.mouseUp(upX, upY, button);
    ui.mouseUp(upX, upY, button);
  };

  /**
   * Called every time a mouse button is clicked.
   */
  var click = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var clickX = e.clientX - e.target.offsetLeft;
    var clickY = e.clientY - e.target.offsetTop;
    var button = e.which;

    if (Math.abs(downX - clickX) < 2 && 
        Math.abs(downY - clickY) < 2) {

      ui.click(clickX, clickY, button);
    }
  };

  /**
   * Called every time a mouse button is double clicked.
   */
  var doubleClick = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var dblClickX = e.clientX - e.target.offsetLeft;
    var dblClickY = e.clientY - e.target.offsetTop;
    var button = e.which;

    if (Math.abs(downX - dblClickX) < 2 && 
        Math.abs(downY - dblClickY) < 2) {

      this.visualization.performMeshPick(dblClickX, dblClickY, button);
      ui.doubleClick(dblClickX, dblClickY, button);
    }
  }.bind(this);

  /**
   * Called every time the mouse moves.
   */
  var mouseMove = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var moveX = e.clientX - e.target.offsetLeft;
    var moveY = e.clientY - e.target.offsetTop;

    arcball.mouseMove(moveX, moveY);
    ui.mouseMove(moveX, moveY);
  };

  /**
   * Called when the the mouse leaves the visualization bounds.
   */
  var mouseOut = function(e) {
    e.preventDefault();
    e.stopPropagation();

    arcball.mouseOut();
  };

  /**
   * Called when the the mouse wheel is used.
   */
  var mouseScroll = function(e) {
    e.preventDefault();
    e.stopPropagation();

    arcball.mouseScroll(e.detail);
    ui.mouseScroll(e.detail);
  };

  /**
   * Called when a key is pressed.
   */
  var keyDown = function(e) {
    var code = e.keyCode || e.which;

    // handle key events only if the html editor is not open
    if ("open" === TiltChrome.BrowserOverlay.panel.state) {
      return;
    }

    arcball.keyDown(code);
    ui.keyDown(code);
  };

  /**
   * Called when a key is released.
   */
  var keyUp = function(e) {
    var code = e.keyCode || e.which;

    if (code === 27) {
      // if the panel with the html editor was open, hide it now
      if ("open" === TiltChrome.BrowserOverlay.panel.state) {
        TiltChrome.BrowserOverlay.panel.hidePopup();
      }
      else {
        TiltChrome.BrowserOverlay.destroy(true, true);
        TiltChrome.BrowserOverlay.href = null;
      }
    }

    arcball.keyUp(code);
    ui.keyUp(code);
  };

  /**
   * Stops the controller from handling the current stacked events.
   */
  this.stop = function() {
    arcball.cancel();
  };

  /**
   * Moves the camera forward or backward depending on the passed amount.
   * @param {Number} amount: the amount of zooming to do
   */
  this.zoom = function(amount) {
    arcball.zoom(amount);
  };

  /**
   * Resets the rotation and translation to origin.
   * @param {Number} factor: the reset interpolation factor between frames
   */
  this.reset = function(factor) {
    arcball.reset(factor);
  };

  /**
   * Delegate method, called when the controller needs to be resized.
   *
   * @param width: the new width of the visualization
   * @param height: the new height of the visualization
   */
  this.resize = function(width, height) {
    arcball.resize(width, height);
  };

  /**
   * Destroys this object and sets all members to null.
   * @param {HTMLCanvasElement} canvas: the canvas dom element
   */
  this.destroy = function(canvas) {
    this.visualization = null;

    if (mouseDown !== null) {
      canvas.removeEventListener("mousedown", mouseDown, false);
      mouseDown = null;
    }
    if (mouseUp !== null) {
      canvas.removeEventListener("mouseup", mouseUp, false);
      mouseUp = null;
    }
    if (click !== null) {
      canvas.removeEventListener("click", click, false);
      click = null;
    }
    if (doubleClick !== null) {
      canvas.removeEventListener("dblclick", doubleClick, false);
      doubleClick = null;
    }
    if (mouseMove !== null) {
      canvas.removeEventListener("mousemove", mouseMove, false);
      mouseMove = null;
    }
    if (mouseOut !== null) {
      canvas.removeEventListener("mouseout", mouseOut, false);
      mouseOut = null;
    }
    if (mouseScroll !== null) {
      canvas.removeEventListener("DOMMouseScroll", mouseScroll, false);
      mouseScroll = null;
    }
    if (keyDown !== null) {
      window.removeEventListener("keydown", keyDown, false);
      keyDown = null;
    }
    if (keyUp !== null) {
      window.removeEventListener("keyup", keyUp, false);
      keyUp = null;
    }
    if (arcball !== null) {
      arcball.destroy();
      arcball = null;
    }

    Tilt.destroyObject(this);
  };

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept(
    "TiltChrome.Controller.MouseAndKeyboard", this);
};
