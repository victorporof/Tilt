/*
 * Container.js - A container holding various GUI elements
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

  // make sure the properties parameter is a valid object
  properties = properties || {};
  elements = elements || [];

  /**
   * A texture used as the pixel data for this object.
   */
  this.elements = elements instanceof Array ? elements : [elements];

  /**
   * The color of the full screen rectangle.
   */
  this.background = properties.background || null;

  /**
   * Variable specifying if this object shouldn't be drawn.
   */
  this.hidden = properties.hidden || false;
};

Tilt.Container.prototype = {

  /**
   * Updates this object's internal params.
   */
  update: function() {
    var elements = this.elements,
      i, len;

    for (i = 0, len = elements.length; i < len; i++) {
      elements[i].update();
    }
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
