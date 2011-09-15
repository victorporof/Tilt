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
var EXPORTED_SYMBOLS = ["TiltChrome.Options"];

/**
 * Default options implementation.
 */
TiltChrome.Options = {

  /**
   * Event fired when a key is released and the windows is focused.
   *
   * @param {XULElement} sender: the xul element calling this delegate
   * @param {KeyboardEvent} e: the keyboard event
   */
  windowKeyUp: function(sender, e) {
    var code = e.keyCode || e.which;

    if (code === 27) { // escape key
      sender.close();
    }
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  refreshFastestRadioPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  refreshRecommendedRadioPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  refreshSlowestRadioPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  escapeKeyCheckboxPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  hideUICheckboxPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  disableMinidomCheckboxPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  enableJoystickCheckboxPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  useAccelerometerCheckboxPressed: function(sender) {
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   */
  openCloseTextboxFocus: function(sender) {
    sender.focused = true;
  },

  /**
   *
   * @param {XULElement} sender: the xul element calling this delegate
   * @param {KeyboardEvent} e: the keyboard event
   */
  openCloseTextboxKeyDown: function(sender, e) {
    if (sender.focused) {
      sender.value = "";
      sender.focused = null;
      delete sender.focused;
    }

    var value = sender.value,
      code = e.keyCode || e.which;

    if (code === 8 || code === 45 || code === 46) { // escape, delete or insert
      value = "";
    }
    if (value.substr(-1) !== "+") {
      value = "";
    }
    if (value.match(/shift/i) === null && code === 16) {
      value += "Shift+";
    }
    if (value.match(/ctrl/i) === null && code === 17) {
      value += "Ctrl+";
    }
    if (value.match(/alt|option/i) === null && code === 18) {
      value += "Alt+";
    }
    if (value.match(/accel|win|cmd|super/i) === null && code === 224) {
      value += "Accel+";
    }
    if (value.match(/space/i) === null && code === 32) {
      value += "Space";
    }
    if (value.match(/pgup/i) === null && code === 33) {
      value += "PgUp+";
    }
    if (value.match(/pgdown/i) === null && code === 34) {
      value += "PgDown+";
    }
    if (value.match(/end/i) === null && code === 35) {
      value += "End+";
    }
    if (value.match(/home/i) === null && code === 36) {
      value += "Home+";
    }
    if (value.match(/left/i) === null && code === 37) {
      value += "Left+";
    }
    if (value.match(/up/i) === null && code === 38) {
      value += "Up+";
    }
    if (value.match(/right/i) === null && code === 39) {
      value += "Right+";
    }
    if (value.match(/down/i) === null && code === 40) {
      value += "Down+";
    }

    sender.value = value.replace(/alt/i, (function() {
                     var app = navigator.appVersion;
                     if (app.indexOf("Win") !== -1) { return "Alt"; }
                     else if (app.indexOf("Mac") !== -1) { return "Option"; }
                     else if (app.indexOf("X11") !== -1) { return "Alt"; }
                     else if (app.indexOf("Linux") !== -1) { return "Alt"; }
                     else { return "Alt"; }
                   })()).
                   replace(/accel/i, (function() {
                     var app = navigator.appVersion;
                     if (app.indexOf("Win") !== -1) { return "Win"; }
                     else if (app.indexOf("Mac") !== -1) { return "Cmd"; }
                     else if (app.indexOf("X11") !== -1) { return "Super"; }
                     else if (app.indexOf("Linux") !== -1) { return "Ctrl"; }
                     else { return "Accel"; }
                   })());

    if (code >= 32 && code <= 40) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
};
