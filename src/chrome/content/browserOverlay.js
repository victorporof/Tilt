/*
 * browserOverlay.js - TiltChrome namespace
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
var EXPORTED_SYMBOLS = ["TiltChrome.BrowserOverlay"];

/**
 * Controls the browser overlay for the Tilt extension.
 */
TiltChrome.BrowserOverlay = {

  /**
   * Content location href of the current tab generating the visualization.
   */
  href: null,

  /**
   * The popup panel containing the Ace Cloud9 html editor in an iframe.
   */
  panel: null,

  /**
   * The canvas element used for rendering the visualization.
   */
  canvas: null,

  /*
   * Visualization logic and drawing loop.
   */
  visualization: null,

  /**
   * Initializes Tilt.
   * @param {object} event: the event firing this function
   */
  initialize: function(event) {
    // if the menubar is visible, it can mess up the true innerWidth/Height
    // of the window.content, so wait for the menubar to hide first
    if (window.menubar.visible) {
      window.setTimeout(this.create.bind(this), 100);
    }
    else {
      // create the visualization normally
      this.create();
    }
  },

  /**
   * Creates the canvas and starts the visualization.
   */
  create: function() {
    // the current tab has new page, so recreate the entire visualization
    // remember the current tab location
    this.href = window.content.location.href;

    // set the width and height to mach the content window dimensions
    var width = window.content.innerWidth;
    var height = window.content.innerHeight;

    // get the iframe which will be used to create the canvas element
    var iframe = document.getElementById("tilt-panel-iframe");

    // inside a chrome environment the default document and parent nodes
    // are different from an unprivileged html page, so change these
    Tilt.Document.currentContentDocument = iframe.contentDocument;
    Tilt.Document.currentParentNode = gBrowser.selectedBrowser.parentNode;

    // retain the popup panel for future reference
    this.panel = document.getElementById("tilt-panel");

    // initialize the canvas element
    this.canvas = Tilt.Document.initCanvas(width, height, true);

    // construct the visualization using the canvas
    this.visualization =
      new TiltChrome.Visualization(this.canvas,
      new TiltChrome.Controller.MouseAndKeyboard(),
      new TiltChrome.UI());
  },

  /**
   * Destroys this object, removes the iframe and sets all members to null.
   */
  destroy: function() {
    Tilt.Document.currentContentDocument = null;
    Tilt.Document.currentParentNode = null;

    // quickly remove the canvas from the selected browser parent node
    if (this.canvas !== null) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }

    // the following code may take some time, so set a small timeout
    window.setTimeout(function() {
      if (this.panel !== null) {
        this.panel.hidePopup();
        this.panel = null;
      }
      if (this.visualization !== null) {
        this.visualization.destroy();
        this.visualization = null;
      }

      window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils)
        .garbageCollect();

    }.bind(this), 100);
  }
};
