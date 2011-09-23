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
var EXPORTED_SYMBOLS = ["Tilt.Preferences"];

/*global Cc, Ci, Cu */

Tilt.Preferences = {

  /**
   * Gets a custom extension preference.
   * If the preference does not exist, undefined is returned. If it does exist,
   * but the type is not correctly specified, null is returned.
   *
   * @param {String} pref: the preference name
   * @param {String} type: either "boolean", "string" or "integer"
   * @return {Boolean | String | Number} the requested extension preference
   */
  get: function(pref, type) {
    var prefs;

    try {
      prefs = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService).getBranch(this.$branch);

      return !prefs.prefHasUserValue(pref) ? undefined :
             (type === "boolean") ? prefs.getBoolPref(pref) :
             (type === "string") ? prefs.getCharPref(pref) :
             (type === "integer") ? prefs.getIntPref(pref) : null;
    }
    catch(e) {
      // running from an unprivileged environment
      Tilt.Console.error(e.message);
      return null;
    }
  },

  /**
   * Sets a custom extension preference.
   *
   * @param {String} pref: the preference name
   * @param {String} type: either "boolean", "string" or "integer"
   * @param {String} value: a new preference value
   * @return {Boolean} true if the preference was set succesfully
   */
  set: function(pref, type, value) {
    var prefs;

    try {
      prefs = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService).getBranch(this.$branch);

      return (type === "boolean") ? prefs.setBoolPref(pref, value) :
             (type === "string") ? prefs.setCharPref(pref, value) :
             (type === "integer") ? prefs.setIntPref(pref, value) : false;
    }
    catch(e) {
      // running from an unprivileged environment
      Tilt.Console.error(e.message);
      return false;
    }
  },

  /**
   * Creates a custom extension preference.
   * If the preference already exists, it is left unchanged.
   *
   * @param {String} pref: the preference name
   * @param {String} type: either "boolean", "string" or "integer"
   * @param {String} value: the initial preference value
   * @return {Boolean} true if the preference was initialized succesfully
   */
  create: function(pref, type, value) {
    var prefs;

    try {
      prefs = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService).getBranch(this.$branch);

      return prefs.prefHasUserValue(pref) ? false :
             (type === "boolean") ? prefs.setBoolPref(pref, value) :
             (type === "string") ? prefs.setCharPref(pref, value) :
             (type === "integer") ? prefs.setIntPref(pref, value) : false;
    }
    catch(e) {
      // running from an unprivileged environment
      Tilt.Console.error(e.message);
      return false;
    }
  },

  /**
   * The preferences branch for this extension.
   */
  $branch: "extensions.tilt."
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Preferences);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Preferences", Tilt.Preferences);
