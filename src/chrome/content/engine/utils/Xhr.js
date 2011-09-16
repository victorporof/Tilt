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
var EXPORTED_SYMBOLS = ["Tilt.Xhr"];

/**
 * XMLHttpRequest utilities.
 */
Tilt.Xhr = {

  /**
   * Handles a generic get request, performed on a specified url. When done,
   * it fires the ready callback function if it exists, & passes the http
   * request object and also an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {String} url: the url to perform the GET to
   * @param {Function} readyCallback: function to be called when request ready
   * @param {Object} aParam: optional parameter passed to readyCallback
   */
  request: function(url, readyCallback, aParam) {
    var xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);
    xhr.send(null);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if ("function" === typeof readyCallback) {
          readyCallback(xhr, aParam);
        }
      }
    };
  },

  /**
   * Handles multiple get requests from specified urls. When all requests are
   * completed, it fires the ready callback function if it exists, & passes
   * the http request object and an optional auxiliary parameter if available.
   * Used internally for getting shader sources from a specific resource.
   *
   * @param {Array} urls: an array of urls to perform the GET to
   * @param {Function} readyCallback: function called when all requests ready
   * @param {Object} aParam: optional parameter passed to readyCallback
   */
  requests: function(urls, readyCallback, aParam) {
    var xhrs = [], finished = 0, i, len;

    function requestReady() {
      finished++;
      if (finished === urls.length) {
        if ("function" === typeof readyCallback) {
          readyCallback(xhrs, aParam);
        }
      }
    }

    function requestCallback(xhr, index) {
      xhrs[index] = xhr;
      requestReady();
    }

    for (i = 0, len = urls.length; i < len; i++) {
      this.request(urls[i], requestCallback, i);
    }
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Xhr);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Xhr", Tilt.Xhr);
