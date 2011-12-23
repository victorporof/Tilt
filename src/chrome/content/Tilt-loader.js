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

/*global Cc, Ci, Cu, InspectorUI, Tilt, TiltChrome */

var TiltChromeEntryPoint = TiltChromeEntryPoint || {};
var EXPORTED_SYMBOLS = ["TiltChrome.EntryPoint"];

/**
 * Entry point for this extension, including the necessary Javascript files.
 */
TiltChromeEntryPoint = {

  /**
   * Utility for loading the extensions scripts.
   */
  includeScripts: function() {
    // the script loader responsible with loading a Javascript file
    var scriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"].
      getService(Ci.mozIJSSubScriptLoader);

    // the 'Tilt-extension.js' source file is created at build time, and it's
    // not part of the project; no other js files will be copied/archived in
    // the xpi archive
    var _ = {
      InspectorUI: window.InspectorUI || null,
      Tilt: window.Tilt || null
    };

    scriptLoader.loadSubScript("chrome://tilt/content/Tilt-extension.js", _);
    window.TiltChrome = _.TiltChrome;
    window.Tilt = _.Tilt;
  },

  /**
   * Set the default preferences for this extension.
   */
  setupPreferences: function() {
    var pref = Tilt.Preferences;

    pref.create("options.nativeTiltHello", "boolean", true);
    pref.create("options.refreshVisualization", "integer", -1);
    pref.create("options.hideUserInterfaceAtInit", "boolean", false);
    pref.create("options.disableMinidomAtInit", "boolean", false);
    pref.create("options.enableJoystick", "boolean", false);
    pref.create("options.useAccelerometer", "boolean", false);
    pref.create("options.escapeKeyCloses", "boolean", true);
    pref.create("options.keyShortcutOpenClose", "string", "accel shift M");
  },

  /**
   * Utility for refreshing the default shortcut key(s) used by this extension.
   */
   refreshKeyset: function() {
    try {
      var config = TiltChrome.Config.Visualization,
        openClose = config.keyShortcutOpenClose,
        openCloseSplit = openClose.split(" "),
        openCloseMenuKey = document.getElementById("tilt-menu-key");

      openCloseMenuKey.setAttribute("key", openCloseSplit.pop());
      openCloseMenuKey.setAttribute("modifiers", openCloseSplit.join(" "));
    }
    catch(e) {}
  }
};

/**
 * Function called automatically at browser initialization.
 */
(function() {
  document.addEventListener("load", function load() {
    document.removeEventListener("load", load, true);

    // load everything after a while, don't slow down the browser startup
    window.setTimeout(function() {
      TiltChromeEntryPoint.includeScripts();
      TiltChromeEntryPoint.setupPreferences();
      TiltChromeEntryPoint.refreshKeyset();
    }.bind(window), 500);
  }, true);
})();
