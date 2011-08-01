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
 * The Initial Developer of the Original Code is Victor Porof.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
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
var EXPORTED_SYMBOLS = ["Tilt.Container"];

/**
 * Container constructor.
 *
 * @param {Array} elements: array of GUI elements added to this container
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: true if this object should be hidden
 *  @param {String} background: color to fill the screen
 */
Tilt.Container = function(elements, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Container", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};
  elements = elements || [];

  /**
   * The UI elements in this container.
   */
  this.elements = elements instanceof Array ? elements : [elements];

  /**
   * The color of the full screen background rectangle.
   */
  this.background = properties.background || null;

  /**
   * Variable specifying if this object shouldn't be drawn.
   */
  this.hidden = properties.hidden || false;
};

Tilt.Container.prototype = {

  /**
   * Adds a UI element to the handler stack.
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Tilt.UI} ui: the ui to handle the child elements
   */
  push: function(elements, ui) {
    if ("undefined" === typeof ui) {
      ui = this.$ui;
    }
    ui.push(elements, this.elements);
  },

  /**
   * Removes a UI element from the handler stack.
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Tilt.UI} ui: the ui to handle the child elements
   */
  remove: function(elements, ui) {
    if ("undefined" === typeof ui) {
      ui = this.$ui;
    }
    ui.remove(elements, this.elements);
  },

  /**
   * Updates this object's internal params.
   */
  update: function() {
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    tilt = tilt || Tilt.$renderer;

    if (this.background !== null) {
      tilt.fill(this.background);
      tilt.noStroke();
      tilt.rect(0, 0, tilt.width, tilt.height);
    }

    var elements = this.elements,
      element, i, len;

    for (i = 0, len = elements.length; i < len; i++) {
      element = elements[i];

      if (!element.hidden) {
        element.update();
        element.draw(tilt);
      }
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    for (var i in this.elements) {
      Tilt.destroyObject(elements[i]);
    }

    Tilt.destroyObject(this);
  }
};
