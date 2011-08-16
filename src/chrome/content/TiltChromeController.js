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

    // bind some closures to more easily handle the arcball
    this.stop = arcball.stop.bind(arcball);
    this.translate = arcball.translate.bind(arcball);
    this.rotate = arcball.rotate.bind(arcball);
    this.zoom = arcball.zoom.bind(arcball);
    this.reset = arcball.reset.bind(arcball);
    this.resize = arcball.resize.bind(arcball);

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
  this.update = function(frameDelta) {
    var visualization = this.visualization,
      coordinates = arcball.loop(frameDelta);

    // update the visualization
    visualization.setRotation(coordinates.rotation);
    visualization.setTranslation(coordinates.translation);
  };

  /**
   * Called once after every time a mouse button is pressed.
   */
  var mouseDown = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // calculate x and y coordinates using using the client and target offset
    downX = e.clientX - e.target.offsetLeft;
    downY = e.clientY - e.target.offsetTop;

    // let the ui handle the mouse down event
    // this will update the mouseOver property, which specifies if the mouse
    // was pressed over a widget, like a container view, button or slider
    ui.mouseDown(downX, downY, e.which);

    // update the arcball rotation only if the mouse insn't over a ui element
    if (!ui.mouseOver) {
      arcball.mouseDown(downX, downY, e.which);
    }
    else {
      arcball.stop();
    }
  };

  /**
   * Called every time a mouse button is released.
   */
  var mouseUp = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // calculate x and y coordinates using using the client and target offset
    var upX = e.clientX - e.target.offsetLeft;
    var upY = e.clientY - e.target.offsetTop;
    var button = e.which;

    ui.mouseUp(upX, upY, button);
    arcball.mouseUp(upX, upY, button);
  };

  /**
   * Called every time a mouse button is clicked.
   */
  var click = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // calculate x and y coordinates using using the client and target offset
    var clickX = e.clientX - e.target.offsetLeft;
    var clickY = e.clientY - e.target.offsetTop;
    var button = e.which;

    // a click in Tilt is issued only when the mouse pointer stays in 
    // relatively the same position
    if (Math.abs(downX - clickX) < 2 && 
        Math.abs(downY - clickY) < 2) {

      ui.click(clickX, clickY, button);

      // clicking is also the default action for visualization highlighting
      if (!ui.mouseOver) {
        this.visualization.performMeshPickHighlight(clickX, clickY);
      }
    }
  }.bind(this);

  /**
   * Called every time a mouse button is double clicked.
   */
  var doubleClick = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // calculate x and y coordinates using using the client and target offset
    var dblClickX = e.clientX - e.target.offsetLeft;
    var dblClickY = e.clientY - e.target.offsetTop;
    var button = e.which;

    // a double click in Tilt is issued only when the mouse pointer stays in 
    // relatively the same position
    if (Math.abs(downX - dblClickX) < 2 && 
        Math.abs(downY - dblClickY) < 2) {

      ui.doubleClick(dblClickX, dblClickY, button);

      // double clicking is also the default action for source editing
      if (!ui.mouseOver) {
        this.visualization.performMeshPickEdit(dblClickX, dblClickY);
      }
    }
  }.bind(this);

  /**
   * Called every time the mouse moves.
   */
  var mouseMove = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // calculate x and y coordinates using using the client and target offset
    var moveX = e.clientX - e.target.offsetLeft;
    var moveY = e.clientY - e.target.offsetTop;

    ui.mouseMove(moveX, moveY);
    arcball.mouseMove(moveX, moveY);
  };

  /**
   * Called when the the mouse leaves the visualization bounds.
   */
  var mouseOut = function(e) {
    e.preventDefault();
    e.stopPropagation();

    ui.mouseOut();
    arcball.mouseOut();
  };

  /**
   * Called when the the mouse wheel is used.
   */
  var mouseScroll = function(e) {
    e.preventDefault();
    e.stopPropagation();

    ui.mouseScroll(e.detail);
    arcball.mouseScroll(e.detail);
  };

  /**
   * Called when a key is pressed.
   */
  var keyDown = function(e) {
    var code = e.keyCode || e.which;

    // handle key events only if the source editor is not open
    if ("open" === TiltChrome.BrowserOverlay.sourceEditor.panel.state) {
      return;
    }

    ui.keyDown(code);
    arcball.keyDown(code);
  };

  /**
   * Called when a key is released.
   */
  var keyUp = function(e) {
    var code = e.keyCode || e.which;

    if (code === 27) { // escape keyCode
      if ("open" === TiltChrome.BrowserOverlay.sourceEditor.panel.state) {
        TiltChrome.BrowserOverlay.sourceEditor.panel.hidePopup();
      }
      else {
        // escape key also closes the visualization if no other panel is open
        TiltChrome.BrowserOverlay.destroy(true, true);
        TiltChrome.BrowserOverlay.href = null;
      }
    }

    ui.keyUp(code);
    arcball.keyUp(code);
  };

  /**
   * Destroys this object and sets all members to null.
   * @param {HTMLCanvasElement} canvas: the canvas dom element
   */
  this.destroy = function(canvas) {
    this.visualization = null;
    ui = null;

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
