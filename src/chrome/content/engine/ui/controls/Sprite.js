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
var EXPORTED_SYMBOLS = ["Tilt.Sprite"];

/**
 * Sprite constructor.
 *
 * @param {Tilt.Texture} texture: the texture to be used
 * @param {Array} region: the sub-texture coordinates as [x, y, width, height]
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: true if this object should be hidden
 *  @param {Boolean} depthTest: true to use depth testing
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} width: the width of the object
 *  @param {Number} height: the height of the object
 *  @param {Array} padding: bounds padding for the object
 */
Tilt.Sprite = function(texture, region, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Sprite", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * A texture used as the pixel data for this object.
   */
  this.texture = texture;

  /**
   * The sub-texture coordinates array.
   */
  this.region = region || [0, 0, texture.width, texture.height];

  /**
   * The draw coordinates of this object.
   */
  this.x = properties.x || 0;
  this.y = properties.y || 0;
  this.width = properties.width || this.region[2];
  this.height = properties.height || this.region[3];

  /**
   * Variable specifying if this object shouldn't be drawn.
   */
  this.hidden = properties.hidden || false;

  /**
   * Sets if depth testing should be enabled or not for this object.
   */
  this.depthTest = properties.depthTest || false;

  /**
   * Bounds padding for this object.
   */
  this.padding = properties.padding || [0, 0, 0, 0];

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [this.x, this.y, this.width, this.height];

  /**
   * Buffer of 2-component texture coordinates (u, v) for the sprite.
   */
  this.$texCoord = null;
};

Tilt.Sprite.prototype = {

  /**
   * Clears the generated texture coords, which will be regenerated at draw.
   */
  update$texCoord: function() {
    this.$texCoord = null;
  },

  /**
   * Updates this object's internal params.
   */
  update: function() {
    var bounds = this.$bounds,
      padding = this.padding;

    bounds[0] = this.x + padding[0];
    bounds[1] = this.y + padding[1];
    bounds[2] = this.width - padding[2];
    bounds[3] = this.height - padding[3];
  },

  /**
   * Draws this object using the specified internal params.
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(tilt) {
    tilt = tilt || Tilt.$renderer;

    // cache these variables for easy access
    var reg = this.region,
      tex = this.texture,
      x = this.x,
      y = this.y,
      width = this.width,
      height = this.height;

    // initialize the texture coordinates buffer if it was null
    if (this.$texCoord === null && this.texture.loaded) {

      // create the texture coordinates representing the sub-texture
      this.$texCoord = new Tilt.VertexBuffer([
        (reg[0]         ) / tex.width, (reg[1]         ) / tex.height,
        (reg[0] + reg[2]) / tex.width, (reg[1]         ) / tex.height,
        (reg[0]         ) / tex.width, (reg[1] + reg[3]) / tex.height,
        (reg[0] + reg[2]) / tex.width, (reg[1] + reg[3]) / tex.height], 2);
    }

    var bounds = this.$bounds;

    if (this.depthTest) {
      tilt.depthTest(true);
      tilt.image(tex, x, y, width, height, this.$texCoord);
      tilt.depthTest(false);
    }
    else {
      tilt.image(tex, x, y, width, height, this.$texCoord);
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
