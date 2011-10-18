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

/*global Tilt */

/**
 * Default options implementation.
 */
TiltChrome.Options = {

  /**
   * Event fired when the options window is loaded.
   *
   * @param {Event} e: the event firing this function
   * @param {XULElement} sender: the xul element calling this delegate
   */
  windowLoad: function(e, sender) {
    var conf = TiltChrome.Config.Visualization,
      d = sender.document,
      ns = "tilt-options-",

    refreshVisualization = {
      checkbox: d.getElementById(ns + "refreshVisualizationCheckbox"),
      radiogroup: d.getElementById(ns + "refreshVisualizationRadiogroup")
    },
    hideUserInterfaceAtInit = d.getElementById(ns + "hideUserInterfaceAtInit"),
    disableMinidomAtInit = d.getElementById(ns + "disableMinidomAtInit"),
    enableJoystick = d.getElementById(ns + "enableJoystick"),
    useAccelerometer = d.getElementById(ns + "useAccelerometer"),
    escapeKeyCloses = d.getElementById(ns + "escapeKeyCloses"),
    keyShortcutOpenClose = d.getElementById(ns + "keyShortcutOpenClose");

    if (conf.refreshVisualization <= -1) {
      refreshVisualization.checkbox.checked = false;
      refreshVisualization.radiogroup.selectedIndex = -1;
    }
    else {
      refreshVisualization.checkbox.checked = true;
      refreshVisualization.radiogroup.selectedIndex = conf.refreshVisualization;
    }

    escapeKeyCloses.checked = conf.escapeKeyCloses;
    hideUserInterfaceAtInit.checked = conf.hideUserInterfaceAtInit;
    disableMinidomAtInit.checked = conf.disableMinidomAtInit;
    enableJoystick.checked = conf.enableJoystick;
    useAccelerometer.checked = conf.useAccelerometer;
    keyShortcutOpenClose.value = conf.keyShortcutOpenClose;

    this.$openCloseTextboxValidate(keyShortcutOpenClose);
  },

  /**
   * Event fired when the options window is unloaded.
   *
   * @param {Event} e: the event firing this function
   * @param {XULElement} sender: the xul element calling this delegate
   */
  windowUnload: function(e, sender) {
    var conf = TiltChrome.Config.Visualization.Set,
      d = sender.document,
      ns = "tilt-options-",

    refreshVisualization = {
      checkbox: d.getElementById(ns + "refreshVisualizationCheckbox"),
      radiogroup: d.getElementById(ns + "refreshVisualizationRadiogroup")
    },
    hideUserInterfaceAtInit = d.getElementById(ns + "hideUserInterfaceAtInit"),
    disableMinidomAtInit = d.getElementById(ns + "disableMinidomAtInit"),
    enableJoystick = d.getElementById(ns + "enableJoystick"),
    useAccelerometer = d.getElementById(ns + "useAccelerometer"),
    escapeKeyCloses = d.getElementById(ns + "escapeKeyCloses"),
    keyShortcutOpenClose = d.getElementById(ns + "keyShortcutOpenClose");

    conf.refreshVisualization(refreshVisualization.radiogroup.selectedIndex);
    conf.escapeKeyCloses(escapeKeyCloses.checked);
    conf.hideUserInterfaceAtInit(hideUserInterfaceAtInit.checked);
    conf.disableMinidomAtInit(disableMinidomAtInit.checked);
    conf.enableJoystick(enableJoystick.checked);
    conf.useAccelerometer(useAccelerometer.checked);
    conf.keyShortcutOpenClose(
      (function() {
        return keyShortcutOpenClose.value.toUpperCase().
          replace(/\+/g, " ").
          replace(/shift/i, "shift").
          replace(/control/i, "control").
          replace(/alt/i, "alt").
          replace(/command/i, "accel").
          replace(/space/i, "space").
          replace(/pgup/i, "pgup").
          replace(/pgdown/i, "pgdown").
          replace(/end/i, "end").
          replace(/home/i, "home").
          replace(/left/i, "left").
          replace(/up/i, "up").
          replace(/right/i, "right").
          replace(/down/i, "down");
      })());
  },

  /**
   * Event fired when a key is released and the windows is focused.
   *
   * @param {Event} e: the event firing this function
   * @param {XULElement} sender: the xul element calling this delegate
   */
  windowKeyUp: function(e, sender) {
    var code = e.keyCode || e.which;

    if (code === 27) { // escape key
      sender.close();
    }
  },

  /**
   * Event fired when the sender checkbox is pressed.
   * @param {Event} e: the event firing this function
   */
  refreshVisualizationCheckboxPressed: function(e) {
    var d = e.view.document,
      ns = "tilt-options-",

    refreshVisualization = {
      checkbox: d.getElementById(ns + "refreshVisualizationCheckbox"),
      radiogroup: d.getElementById(ns + "refreshVisualizationRadiogroup")
    };

    if (e.target.checked) {
      refreshVisualization.radiogroup.selectedIndex = 1;
      refreshVisualization.radiogroup.disabled = false;
    }
    else {
      refreshVisualization.radiogroup.selectedIndex = -1;
      refreshVisualization.radiogroup.disabled = true;
    }
  },

  /**
   * Event fired when the sender radio button is pressed.
   * @param {Event} e: the event firing this function
   */
  refreshFastestRadioPressed: function(e) {
  },

  /**
   * Event fired when the sender radio button is pressed.
   * @param {Event} e: the event firing this function
   */
  refreshRecommendedRadioPressed: function(e) {
  },

  /**
   * Event fired when the sender radio button is pressed.
   * @param {Event} e: the event firing this function
   */
  refreshSlowestRadioPressed: function(e) {
  },

  /**
   * Event fired when the sender checkbox is pressed.
   * @param {Event} e: the event firing this function
   */
  hideUICheckboxPressed: function(e) {
  },

  /**
   * Event fired when the sender checkbox is pressed.
   * @param {Event} e: the event firing this function
   */
  disableMinidomCheckboxPressed: function(e) {
  },

  /**
   * Event fired when the sender checkbox is pressed.
   * @param {Event} e: the event firing this function
   */
  enableJoystickCheckboxPressed: function(e) {
  },

  /**
   * Event fired when the sender checkbox is pressed.
   * @param {Event} e: the event firing this function
   */
  useAccelerometerCheckboxPressed: function(e) {
  },

  /**
   * Event fired when the sender checkbox is pressed.
   * @param {Event} e: the event firing this function
   */
  escapeKeyCheckboxPressed: function(e) {
  },

  /**
   * Event fired when the sender textbox is focused.
   * @param {Event} e: the event firing this function
   */
  openCloseTextboxFocus: function(e) {
    e.target.focused = true;
  },

  /**
   * Event fired when the sender textbox is pressed.
   * @param {Event} e: the event firing this function
   */
  openCloseTextboxKeyDown: function(e) {
    var code = e.keyCode || e.which;

    if (code === 27) { // escape key
      return;
    }
    if (e.target.focused) {
      e.target.value = "";
      e.target.focused = null;
      delete e.target.focused;
    }
    if ((code >= 32 && code <= 40) ||
        (code >= 65 && code <= 90)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.target.value.substr(-1) !== "+") {
      e.target.value = "";
    }
    if (code === 8 || code === 45 || code === 46) { // backspace delete insert
      e.target.value = "";
    }
    if (code >= 65 && code <= 90) { // a..z
      e.target.value += String.fromCharCode(code);
    }
    if (e.target.value.match(/shift/i) === null && code === 16) {
      e.target.value += "shift+";
    }
    if (e.target.value.match(/control/i) === null && code === 17) {
      e.target.value += "control+";
    }
    if (e.target.value.match(/alt/i) === null && code === 18) {
      e.target.value += "alt+";
    }
    if (e.target.value.match(/command/i) === null && code === 224) {
      e.target.value += "command+";
    }
    if (e.target.value.match(/space/i) === null && code === 32) {
      e.target.value += "space";
    }
    if (e.target.value.match(/pgup/i) === null && code === 33) {
      e.target.value += "pgup+";
    }
    if (e.target.value.match(/pgdown/i) === null && code === 34) {
      e.target.value += "pgdown+";
    }
    if (e.target.value.match(/end/i) === null && code === 35) {
      e.target.value += "end+";
    }
    if (e.target.value.match(/home/i) === null && code === 36) {
      e.target.value += "home+";
    }
    if (e.target.value.match(/left/i) === null && code === 37) {
      e.target.value += "left+";
    }
    if (e.target.value.match(/up/i) === null && code === 38) {
      e.target.value += "up+";
    }
    if (e.target.value.match(/right/i) === null && code === 39) {
      e.target.value += "right+";
    }
    if (e.target.value.match(/down/i) === null && code === 40) {
      e.target.value += "down+";
    }

    this.$openCloseTextboxValidate(e.target);
  },

  /**
   * Event fired when the sender button is pressed.
   * @param {Event} e: the event firing this function
   */
  openCloseResetButtonPressed: function(e) {
    var d = e.view.document,
      ns = "tilt-options-",

    keyShortcutOpenClose = d.getElementById(ns + "keyShortcutOpenClose");
    keyShortcutOpenClose.value = "accel+shift+M";
    this.$openCloseTextboxValidate(keyShortcutOpenClose);
  },

  /**
   * Validates the value for a specific element.
   * @param {XULElement} element: the required element
   */
  $openCloseTextboxValidate: function(element) {
    element.value = element.value.toUpperCase().
      replace(/\ /g, "+").
      replace(/shift/i, "Shift").
      replace(/control/i, "Control").
      replace(/alt/i, "Alt").
      replace(/command/i, "Command").
      replace(/space/i, "Space").
      replace(/pgup/i, "PgUp").
      replace(/pgdown/i, "PgDown").
      replace(/end/i, "End").
      replace(/home/i, "Home").
      replace(/left/i, "Left").
      replace(/up/i, "Up").
      replace(/right/i, "Right").
      replace(/down/i, "Down").
      replace(/accel/i, (function() {
        var app = navigator.appVersion;
        if (app.indexOf("Win") !== -1) { return "Control"; }
        else if (app.indexOf("Mac") !== -1) { return "Command"; }
        else if (app.indexOf("X11") !== -1) { return "Control"; }
        else if (app.indexOf("Linux") !== -1) { return "Control"; }
        else { return "Control"; }
      })());
  }
};
