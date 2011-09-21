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
var EXPORTED_SYMBOLS = ["Tilt.Sprite"];

/**
 * Sprite constructor.
 *
 * @param {Tilt.Texture} texture: the texture to be used
 * @param {Array} region: the sub-texture coordinates as [x, y, width, height]
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this object shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} width: the width of the object
 *  @param {Number} height: the height of the object
 *  @param {Array} padding: the inner padding offset for mouse events
 *  @param {String} tint: texture tinting expressed in hex or rgb() or rgba()
 *  @param {Boolean} depthTest: true to use depth testing
 *  @param {Function} onmousedown: function called when the event is triggered
 *  @param {Function} onmouseup: function called when the event is triggered
 *  @param {Function} onclick: function called when the event is triggered
 * @return {Tilt.Sprite} the newly created object
 */
Tilt.Sprite = function(texture, region, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Sprite", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * Variable specifying if this object shouldn't be drawn.
   */
  this.hidden = properties.hidden || false;

  /**
   * Variable specifying if this object shouldn't be responsive to events.
   */
  this.disabled = properties.disabled || false;

  /**
   * Functions called when the specific event is triggered.
   */
  this.onmousedown = properties.onmousedown || undefined;
  this.onmouseup = properties.onmouseup || undefined;
  this.onclick = properties.onclick || undefined;

  /**
   * A texture used as the pixel data for this object.
   */
  this.$texture = texture;

  /**
   * The sub-texture coordinates array.
   */
  this.$region = region || [0, 0, texture.width, texture.height];

  /**
   * The draw coordinates of this object.
   */
  this.$x = properties.x || 0;
  this.$y = properties.y || 0;
  this.$width = properties.width || this.$region[2];
  this.$height = properties.height || this.$region[3];

  /**
   * The inner padding offset for mouse events.
   */
  this.$padding = properties.padding || [0, 0, 0, 0];

  /**
   * Tint color for this object.
   */
  this.$tint = properties.tint || null;

  /**
   * Sets if depth testing should be enabled or not for this object.
   */
  this.$depthTest = properties.depthTest || false;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [
    this.$x + this.$padding[0],
    this.$y + this.$padding[1],
    this.$width - this.$padding[0] - this.$padding[2],
    this.$height - this.$padding[0]- this.$padding[3]];

  /**
   * Buffer of 2-component texture coordinates (u, v) for the sprite.
   */
  this.$texCoord = null;
};

Tilt.Sprite.prototype = {

  /**
   * Sets this object's position.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   */
  setPosition: function(x, y) {
    this.$x = x;
    this.$y = y;
    this.$bounds[0] = x + this.$padding[0];
    this.$bounds[1] = y + this.$padding[1];
  },

  /**
   * Sets this object's dimensions.
   *
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   */
  setSize: function(width, height) {
    this.$width = width;
    this.$height = height;
    this.$bounds[2] = width - this.$padding[0] - this.$padding[2];
    this.$bounds[3] = height - this.$padding[1] - this.$padding[3];
  },

  /**
   * Sets the x position of this object.
   * @param {Number} x: the x position
   */
  setX: function(x) {
    this.setPosition(x, this.$y);
  },

  /**
   * Sets the y position of this object.
   * @param {Number} y: the y position
   */
  setY: function(y) {
    this.setPosition(this.$x, y);
  },

  /**
   * Sets the width of this object.
   * @param {Number} width: the width
   */
  setWidth: function(width) {
    this.setSize(width, this.$height);
  },

  /**
   * Sets the height of this object.
   * @param {Number} height: the height
   */
  setHeight: function(height) {
    this.setSize(this.$width, height);
  },

  /**
   * Returns the x position of this object.
   * @return {Number} the x position
   */
  getX: function() {
    return this.$x;
  },

  /**
   * Returns the y position of this object.
   * @return {Number} the y position
   */
  getY: function() {
    return this.$y;
  },

  /**
   * Returns the width of this object.
   * @return {Number} the width
   */
  getWidth: function() {
    return this.$width;
  },

  /**
   * Returns the height of this object.
   * @return {Number} the height
   */
  getHeight: function() {
    return this.$height;
  },

  /**
   * Draws this object using the specified internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(frameDelta, tilt) {
    tilt = tilt || Tilt.$renderer;

    var reg = this.$region,
      tex = this.$texture,
      x = this.$x,
      y = this.$y,
      width = this.$width,
      height = this.$height,
      depthTest = this.$depthTest,
      tint = this.$tint;

    // initialize the texture coordinates buffer if it was null
    if (this.$texCoord === null && tex.loaded) {

      // create the texture coordinates representing the sub-texture
      this.$texCoord = new Tilt.VertexBuffer([
        (reg[0]         ) / tex.width, (reg[1]         ) / tex.height,
        (reg[0] + reg[2]) / tex.width, (reg[1]         ) / tex.height,
        (reg[0]         ) / tex.width, (reg[1] + reg[3]) / tex.height,
        (reg[0] + reg[2]) / tex.width, (reg[1] + reg[3]) / tex.height], 2);
    }

    // if tinting was specified, apply it now (will default back later)
    if (tint !== null) {
      tilt.tint(tint);
    }

    // draw the image using the texCoord & depending on the depthTest param
    if (depthTest) {
      tilt.depthTest(true);
      tilt.image(tex, x, y, width, height, this.$texCoord);
      tilt.depthTest(false);
    }
    else {
      tilt.image(tex, x, y, width, height, this.$texCoord);
    }

    // if tinting was specified, default back to the original values
    if (tint !== null) {
      tilt.tint("#fff");
    }

    if (Tilt.UI.debug) {
      tilt.fill("#fff2");
      tilt.stroke("#f00");
      tilt.rect(this.$x, this.$y, this.$width, this.$height);

      if (!this.disabled) {
        tilt.fill("#0f04");
        tilt.rect(
          this.$bounds[0], this.$bounds[1], this.$bounds[2], this.$bounds[3]);
      }
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
