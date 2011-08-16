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
 * ScrollContainer constructor.
 *
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {String} background: color to fill the screen
 *  @param {Array} offset: the [x, y] offset of the inner contents
 *  @param {Boolean} bounds: the inner drawable bounds for this view
 *  @param {Array} elements: an array of elements to be initially added
 *  @param {Tilt.Sprite} top: a sprite for the slider top button
 *  @param {Tilt.Sprite} bottom: a sprite for the slider bottom button
 *  @param {Tilt.Sprite} reset: a sprite for the slider reset button
 */
Tilt.ScrollContainer = function(properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.ScrollContainer", this); 

  // add this view to the top level UI handler.
  Tilt.UI.push(this);

  /**
   * The normal view containing all the elements.
   */
  this.view = new Tilt.Container(properties);

  /**
   * The view containing the scrollbars.
   */
  this.scrollbars = new Tilt.Container();

  var topButton = new Tilt.Button(properties.top, {
    x: this.view.$x - 25,
    y: this.view.$y - 5,
    width: 32,
    height: 30,
    fill: properties.top ? null : "#f00a",
    padding: properties.top ? properties.top.$padding : [0, 0, 0, 0]
  });

  var bottomButton = new Tilt.Button(properties.bottom, {
    x: this.view.$x - 25,
    y: this.view.$y + this.view.$height - 25,
    width: 32,
    height: 30,
    fill: properties.bottom ? null : "#0f0a",
    padding: properties.bottom ? properties.bottom.$padding : [0, 0, 0, 0]
  });

  var resetButton = new Tilt.Button(properties.reset, {
    x: this.view.$x - 25,
    y: this.view.$y + this.view.$height - 50,
    width: 32,
    height: 30,
    fill: properties.reset ? null : "#0f0b",
    padding: properties.reset ? properties.reset.$padding : [0, 0, 0, 0]
  });

  topButton.onmousedown = function() {
    window.clearInterval(this.$scrollTopReset);
    window.clearInterval(this.$scrollTop);
    var ui = Tilt.UI;

    this.$scrollTop = window.setInterval(function() {
      this.view.$offset[1] += 5;
      ui.requestRedraw();

      if (!ui.mousePressed) {
        ui = null;
        window.clearInterval(this.$scrollTop);
      }
    }.bind(this), 1000 / 60);
  }.bind(this);

  bottomButton.onmousedown = function() {
    window.clearInterval(this.$scrollTopReset);
    window.clearInterval(this.$scrollBottom);
    var ui = Tilt.UI;

    this.$scrollBottom = window.setInterval(function() {
      this.view.$offset[1] -= 5;
      ui.requestRedraw();

      if (!ui.mousePressed) {
        ui = null;
        window.clearInterval(this.$scrollBottom);
      }
    }.bind(this), 1000 / 60);
  }.bind(this);

  resetButton.onmousedown = function() {
    window.clearInterval(this.$scrollTopReset);
    var ui = Tilt.UI;

    this.$scrollTopReset = window.setInterval(function() {
      this.view.$offset[1] /= 1.15;
      ui.requestRedraw();

      if (Math.abs(this.view.$offset[1]) < 0.1) {
        window.clearInterval(this.$scrollTopReset);
      }
    }.bind(this), 1000 / 60);
  }.bind(this);

  this.scrollbars.push(topButton, bottomButton, resetButton);

  topButton = null;
  bottomButton = null;
};

Tilt.ScrollContainer.prototype = {

  /**
   * Updates this object's internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  update: function(frameDelta, tilt) {
    this.scrollbars.hidden = this.view.hidden;
    this.scrollbars.disabled = this.view.disabled;
  },

  /**
   * Draws this object using the specified internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(frameDelta, tilt) {
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.UI.splice(Tilt.UI.indexOf(this), 1);
    Tilt.destroyObject(this);
  }
};
