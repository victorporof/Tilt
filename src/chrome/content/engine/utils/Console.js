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

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.Console", "Tilt.StringBundle"];

/*global Cc, Ci, Cu */

/**
 * Various console functions required by the engine.
 */
Tilt.Console = {

  /**
   * Shows a modal alert message popup.
   *
   * @param {String} title: the title of the popup
   * @param {String} message: the message to be logged
   */
  alert: function(title, message) {
    var prompt;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      prompt = Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

      prompt.alert(null, title, message);
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
    }
  },

  /**
   * Shows a modal confirm message popup.
   *
   * @param {String} title: the title of the popup
   * @param {String} message: the message to be logged
   * @param {String} checkMessage: text to appear with the checkbox
   * @param {Boolean} checkState: the checked state of the checkbox
   */
  confirmCheck: function(title, message, checkMessage, checkState) {
    var prompt;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      prompt = Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

      return (
        prompt.confirmCheck(null, title, message, checkMessage, checkState));
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
    }
  },

  /**
   * Logs a message to the console.
   * If this is not inside an extension environment, an alert() is used.
   *
   * @param {String} message: the message to be logged
   */
  log: function(message) {
    var consoleService;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      // get the console service
      consoleService = Cc["@mozilla.org/consoleservice;1"].
        getService(Ci.nsIConsoleService);

      // log the message
      consoleService.logStringMessage(message);
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
    }
  },

  /**
   * Logs an error to the console.
   * If this is not inside an extension environment, an alert() is used.
   *
   * @param {String} message: the message to be logged
   * @param {String} sourceName: the URL of file with error. This will be a
   * hyperlink in the JavaScript Console, so you'd better use real URL. You
   * may pass null if it's not applicable.
   * @param {String} sourceLine: the line #aLineNumber from aSourceName file.
   * You are responsible for providing that line. You may pass null if you are
   * lazy; that will prevent showing the source line in JavaScript Console.
   * @param {String} lineNumber: specify the exact location of error
   * @param {String} columnNumber: is used to draw the arrow pointing to the
   * problem character.
   * @param {Number} flags: one of flags declared in nsIScriptError. At the
   * time of writing, possible values are:
   *  nsIScriptError.errorFlag = 0
   *  nsIScriptError.warningFlag = 1
   *  nsIScriptError.exceptionFlag = 2
   *  nsIScriptError.strictFlag = 4
   * @param {String} category: a string indicating what kind of code caused
   * the message. There are quite a few category strings and they do not seem
   * to be listed in a single place. Hopefully, they will all be listed in
   * nsIScriptError.idl eventually.
   */
  error: function(message, sourceName, sourceLine, lineNumber, columnNumber) {
    var flags = arguments[5],
      category = arguments[6],
      consoleService, scriptError;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      // get the console service
      consoleService = Cc["@mozilla.org/consoleservice;1"].
        getService(Ci.nsIConsoleService);

      // also the script error service
      scriptError = Cc["@mozilla.org/scripterror;1"].
        createInstance(Ci.nsIScriptError);

      // initialize a script error
      scriptError.init(message, sourceName, sourceLine,
                       lineNumber, columnNumber, flags, category);

      // log the error
      consoleService.logMessage(scriptError);
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
    }
  }
};

/**
 * Easy way to access the string bundle.
 * Usually useful only when this is used inside an extension environment.
 */
Tilt.StringBundle = {

  /**
   * The bundle name used.
   */
  bundle: "tilt-string-bundle",

  /**
   * Returns a string in the string bundle.
   * If the string bundle is not found, the parameter string is returned.
   *
   * @param {String} string: the string name in the bundle
   * @return {String} the equivalent string from the bundle
   */
  get: function(string) {
    // undesired, you should always pass a defined string for the bundle
    if ("undefined" === typeof string) {
      return "undefined";
    }

    var elem = document.getElementById(this.bundle);

    try {
      if (elem) {
        // return the equivalent string from the bundle
        return elem.getString(string);
      }
      else {
        // this should never happen when inside a chrome environment
        return string;
      }
    }
    finally {
      elem = null;
    }
  },

  /**
   * Returns a formatted string using the string bundle.
   * If the string bundle is not found, the parameter arguments are returned.
   *
   * @param {String} string: the string name in the bundle
   * @param {Array} args: an array of args for the formatted string
   * @return {String} the equivalent formatted string from the bundle
   */
  format: function(string, args) {
    // undesired, you should always pass a defined string for the bundle
    if ("undefined" === typeof string) {
      return "undefined";
    }

    // undesired, you should always pass arguments when formatting strings
    if ("undefined" === typeof args) {
      return string;
    }

    var elem = document.getElementById(this.bundle);

    try {
      if (elem) {
        // return the equivalent formatted string from the bundle
        return elem.getFormattedString(string, args);
      }
      else {
        // this should never happen when inside a chrome environment
        return [string, args].join(" ");
      }
    }
    finally {
      elem = null;
    }
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Console);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Console", Tilt.Console);
