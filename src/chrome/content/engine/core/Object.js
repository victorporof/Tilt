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
var EXPORTED_SYMBOLS = [
  "Tilt.destroyObject",
  "Tilt.bindObjectFunc"
];

/*jshint forin: false */

/**
 * Destroys an object and deletes all members.
 * @param {Object} scope: the object
 */
Tilt.destroyObject = function(scope) {
  for (var i in scope) {
    try {
      if ("function" === typeof scope[i].destroy) {
        scope[i].destroy();
      }
    }
    catch(e) {}
    finally {
      try {
        scope[i] = null;
        delete scope[i];
      }
      catch(_e) {}
    }
  }
};

/**
 * Binds a new owner object to the child functions.
 *
 * @param {Object} scope: the object
 * @param {Object} parent: the new parent for the object's functions
 */
Tilt.bindObjectFunc = function(scope, parent) {
  for (var i in scope) {
    try {
      if ("function" === typeof scope[i]) {
        scope[i] = scope[i].bind(parent || scope);
      }
    }
    catch(e) {}
  }
};
