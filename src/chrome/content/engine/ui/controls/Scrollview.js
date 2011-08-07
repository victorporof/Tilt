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
var EXPORTED_SYMBOLS = ["Tilt.Scrollview"];

/**
 * Scrollview constructor.
 *
 * @param {Tilt.Sprite} handle: the sprite texturing the scroll handle
 * @param {Array} elements: array of GUI elements added to this container
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: true if this object should be hidden
 *  @param {String} background: color to fill the container
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} width: the width of the object
 *  @param {Number} height: the height of the object
 */
Tilt.Scrollview = function(handle, elements, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Scrollview", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};
  elements = elements || [];

  /**
   * The container holding the UI elements.
   */
  this.$container = new Tilt.Container(elements, properties);

  /**
   * Sliders controlling the elements scroll.
   */
  var x = this.$container.x,
    y = this.$container.y,
    s = this.$container.height - handle.height;

  this.$sliderY = new Tilt.Slider(x, y, s, handle, {
    direction: 1
  });
  this.$pslideX = 0;
  this.$pslideY = 0;

  // push the scroll view elements to the ui handler
  Tilt.$ui.push(this.$container);
  Tilt.$ui.push(this.$sliderY);
};

Tilt.Scrollview.prototype = {

  /**
   * Adds a UI element to the handler stack.
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Tilt.UI} ui: the ui to handle the child elements
   */
  push: function(elements, ui) {
    this.$container.push(elements, ui);
  },

  /**
   * Removes a UI element from the handler stack.
   * @param {Array} elements: array of valid Tilt UI objects (ex: Tilt.Button)
   * @param {Tilt.UI} ui: the ui to handle the child elements
   */
  remove: function(elements, ui) {
    this.$container.remove(elements, ui);
  },

  /**
   * Updates this object's internal params.
   */
  update: function() {
    var container = this.$container,
      elements = container.elements,
      element, i, len,
      sliderY = this.$sliderY,
      pslideY = this.$pslideY,
      slideY = Tilt.Math.map(sliderY.value, 0, 100, 0, container.height);

    for (i = 0, len = elements.length; i < len; i++) {
      element = elements[i];
      element.y -= (slideY - pslideY) * 5;
    }

    this.$pslideX = slideY;
    this.$pslideY = slideY;
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    this.$container.update();
    this.$container.draw(tilt);
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    for (var i in this.elements) {
      Tilt.destroyObject(this.elements[i]);
    }

    Tilt.destroyObject(this);
  }
};
