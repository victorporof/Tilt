/*
 * browserEntryPoint.js - Entry point for this extension
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
var EXPORTED_SYMBOLS = ["TiltChrome.EntryPoint"];

/**
 * Entry point for this extension, including all necessary Javascript files.
 * This also automatically updates the extension if necessary.
 */
TiltChrome.EntryPoint = {

  /**
   * Function called automatically at browser initialization.
   */
  includeScripts: function() {
    // the script loader responsible with loading each Javascript file
    var scriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);

    // load everything after a while, don't slow down the browser startup
    window.setTimeout(function() {
      scriptLoader.loadSubScript("chrome://tilt/content/Tilt-extension.js");
    }, 500);
  }()
};