/*
 * Console.js - Various console helper functions for Tilt
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

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.Console", "Tilt.StringBundle"];

/**
 * Various console functions required by the engine.
 */
Tilt.Console = {

  /**
   * Logs a message to the console.
   * If this is not inside an extension environment, an alert() is used.
   *
   * @param {String} message: the message to be logged
   */
  log: function(message) {
    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      // get the console service
      var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);

      // log the message
      consoleService.logStringMessage(message);
    }
    catch(e) {
      // running from an unprivileged environment
      alert(message);
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
  error: function(message, sourceName, sourceLine,
                  lineNumber, columnNumber, flags, category) {

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      // get the console service
      var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);

      // also the script error service
      var scriptError = Components.classes["@mozilla.org/scripterror;1"]
        .createInstance(Components.interfaces.nsIScriptError);

      // initialize a script error
      scriptError.init(message, sourceName, sourceLine,
                       lineNumber, columnNumber, flags, category);

      // log the error
      consoleService.logMessage(scriptError);
    }
    catch(e) {
      // running from an unprivileged environment
      alert(message);
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
