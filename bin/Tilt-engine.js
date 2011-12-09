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
var EXPORTED_SYMBOLS = ["Tilt.Arcball"];

/*global vec3, mat3, mat4, quat4 */

/**
 * Arcball constructor.
 * This is a general purpose 3D rotation controller described by Ken Shoemake
 * in the Graphics Interface ’92 Proceedings. It features good behavior
 * easy implementation, cheap execution.
 *
 * @param {Number} width: the width of canvas
 * @param {Number} height: the height of canvas
 * @param {Number} radius: optional, the radius of the arcball
 * @param {Array} initialTrans: initial [x, y] translation
 * @param {Array} initialRot: initial [x, y] rotation
 * @return {Tilt.Arcball} the newly created object
 */
Tilt.Arcball = function(width, height, radius, initialTrans, initialRot) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Arcball", this);

  /**
   * Values retaining the current horizontal and vertical mouse coordinates.
   */
  this.$mousePress = [0, 0];
  this.$mouseRelease = [0, 0];
  this.$mouseMove = [0, 0];
  this.$mouseLerp = [0, 0];

  /**
   * Other mouse flags: current pressed mouse button and the scroll amount.
   */
  this.$mouseButton = -1;
  this.$scrollValue = 0;
  this.$scrollSpeed = 1;
  this.$scrollMin = -3000;
  this.$scrollMax = 500;

  /**
   * Array retaining the current pressed key codes.
   */
  this.$keyCode = [];

  /**
   * The vectors representing the mouse coordinates mapped on the arcball
   * and their perpendicular converted from (x, y) to (x, y, z) at specific
   * events like mousePressed and mouseDragged.
   */
  this.$startVec = vec3.create();
  this.$endVec = vec3.create();
  this.$pVec = vec3.create();

  /**
   * The corresponding rotation quaternions.
   */
  this.$lastRot = quat4.create([0, 0, 0, 1]);
  this.$deltaRot = quat4.create([0, 0, 0, 1]);
  this.$currentRot = quat4.create([0, 0, 0, 1]);

  /**
   * The current camera translation coordinates.
   */
  this.$lastTrans = vec3.create();
  this.$deltaTrans = vec3.create();
  this.$currentTrans = vec3.create();

  /**
   * Additional rotation and translation vectors.
   */
  this.$addKeyRot = initialRot || [0, 0];
  this.$addKeyTrans = initialTrans || [0, 0];
  this.$deltaKeyRot = quat4.create([0, 0, 0, 1]);
  this.$deltaKeyTrans = vec3.create();

  // set the current dimensions of the arcball
  this.resize(width, height, radius);
};

Tilt.Arcball.prototype = {

  /**
   * Call this function whenever you need the updated rotation quaternion
   * and the zoom amount. These values will be returned as "rotation" & "zoom"
   * properties inside an object.
   *
   * @param {Number} frameDelta: optional, pass deltas for smoother animations
   * @return {Object} the rotation quaternion and the zoom amount
   */
  loop: function(frameDelta) {
    // this should be in the (0..1) interval
    frameDelta = Tilt.Math.clamp((frameDelta || 25) * 0.01, 0.01, 0.99);

    // cache some variables for easier access
    var x, y,
      radius = this.$radius,
      width = this.$width,
      height = this.$height,

      mousePress = this.$mousePress,
      mouseRelease = this.$mouseRelease,
      mouseMove = this.$mouseMove,
      mouseLerp = this.$mouseLerp,
      mouseButton = this.$mouseButton,
      scrollValue = this.$scrollValue,
      keyCode = this.$keyCode,

      startVec = this.$startVec,
      endVec = this.$endVec,
      pVec = this.$pVec,

      lastRot = this.$lastRot,
      deltaRot = this.$deltaRot,
      currentRot = this.$currentRot,

      lastTrans = this.$lastTrans,
      deltaTrans = this.$deltaTrans,
      currentTrans = this.$currentTrans,

      addKeyRot = this.$addKeyRot,
      addKeyTrans = this.$addKeyTrans,
      deltaKeyRot = this.$deltaKeyRot,
      deltaKeyTrans = this.$deltaKeyTrans;

    // smoothly update the mouse coordinates
    mouseLerp[0] += (mouseMove[0] - mouseLerp[0]) * frameDelta;
    mouseLerp[1] += (mouseMove[1] - mouseLerp[1]) * frameDelta;

    // cache the interpolated mouse coordinates
    x = mouseLerp[0];
    y = mouseLerp[1];

    // the smoothed arcball rotation may not be finished when the mouse is
    // pressed again, so cancel the rotation if other events occur or the
    // animation finishes
    if (mouseButton === 3 || x === mouseRelease[0] && y === mouseRelease[1]) {
      this.$rotating = false;
    }

    // left mouse button handles rotation
    if (mouseButton === 1 || this.$rotating) {
      // the rotation doesn't stop immediately after the left mouse button is
      // released, so add a flag to smoothly continue it until it ends
      this.$rotating = true;

      // find the sphere coordinates of the mouse positions
      this.pointToSphere(x, y, width, height, radius, endVec);

      // compute the vector perpendicular to the start & end vectors
      vec3.cross(startVec, endVec, pVec);

      // if the begin and end vectors don't coincide
      if (vec3.length(pVec) > 0) {
        deltaRot[0] = pVec[0];
        deltaRot[1] = pVec[1];
        deltaRot[2] = pVec[2];

        // in the quaternion values, w is cosine (theta / 2),
        // where theta is the rotation angle
        deltaRot[3] = -vec3.dot(startVec, endVec);
      }
      else {
        // return an identity rotation quaternion
        deltaRot[0] = 0;
        deltaRot[1] = 0;
        deltaRot[2] = 0;
        deltaRot[3] = 1;
      }

      // calculate the current rotation based on the mouse click events
      quat4.multiply(lastRot, deltaRot, currentRot);
    }
    else {
      // save the current quaternion to stack rotations
      quat4.set(currentRot, lastRot);
    }

    // right mouse button handles panning
    if (mouseButton === 3) {
      // calculate a delta translation between the new and old mouse position
      // and save it to the current translation
      deltaTrans[0] = mouseMove[0] - mousePress[0];
      deltaTrans[1] = mouseMove[1] - mousePress[1];

      currentTrans[0] = lastTrans[0] + deltaTrans[0];
      currentTrans[1] = lastTrans[1] + deltaTrans[1];
    }
    else {
      // save the current panning to stack translations
      lastTrans[0] = currentTrans[0];
      lastTrans[1] = currentTrans[1];
    }

    // mouse wheel handles zooming
    deltaTrans[2] = (scrollValue - currentTrans[2]) * 0.1;
    currentTrans[2] += deltaTrans[2];

    // handle additional rotation and translation by the keyboard
    if (keyCode[65]) { // w
      addKeyRot[0] -= frameDelta * 0.2;
    }
    if (keyCode[68]) { // s
      addKeyRot[0] += frameDelta * 0.2;
    }
    if (keyCode[87]) { // a
      addKeyRot[1] += frameDelta * 0.2;
    }
    if (keyCode[83]) { // d
      addKeyRot[1] -= frameDelta * 0.2;
    }
    if (keyCode[37]) { // left
      addKeyTrans[0] += frameDelta * 50;
    }
    if (keyCode[39]) { // right
      addKeyTrans[0] -= frameDelta * 50;
    }
    if (keyCode[38]) { // up
      addKeyTrans[1] += frameDelta * 50;
    }
    if (keyCode[40]) { // down
      addKeyTrans[1] -= frameDelta * 50;
    }

    // update the delta key rotations and translations
    deltaKeyRot[0] += (addKeyRot[0] - deltaKeyRot[0]) * frameDelta;
    deltaKeyRot[1] += (addKeyRot[1] - deltaKeyRot[1]) * frameDelta;

    deltaKeyTrans[0] += (addKeyTrans[0] - deltaKeyTrans[0]) * frameDelta;
    deltaKeyTrans[1] += (addKeyTrans[1] - deltaKeyTrans[1]) * frameDelta;

    // create an additional rotation based on the key events
    Tilt.Math.quat4fromEuler(deltaKeyRot[0], deltaKeyRot[1], 0, deltaRot);

    // create an additional translation based on the key events
    deltaTrans[0] = deltaKeyTrans[0];
    deltaTrans[1] = deltaKeyTrans[1];
    deltaTrans[2] = 0;

    // return the current rotation and translation
    return {
      rotation: quat4.multiply(deltaRot, currentRot),
      translation: vec3.add(deltaTrans, currentTrans)
    };
  },

  /**
   * Function handling the mouseDown event.
   * Call this when the mouse was pressed.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Number} button: which mouse button was pressed
   */
  mouseDown: function(x, y, button) {
    // clear any interval resetting or manipulating the arcball if set
    this.$clearInterval();

    // save the mouse down state and prepare for rotations or translations
    this.$mousePress[0] = x;
    this.$mousePress[1] = y;
    this.$mouseButton = button;
    this.$save();

    var radius = this.$radius,
      width = this.$width,
      height = this.$height;

    // find the sphere coordinates of the mouse positions
    this.pointToSphere(x, y, width, height, radius, this.$startVec);
    quat4.set(this.$currentRot, this.$lastRot);
  },

  /**
   * Function handling the mouseUp event.
   * Call this when a mouse button was released.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Number} button: which mouse button was released
   */
  mouseUp: function(x, y, button) {
    // save the mouse up state and prepare for rotations or translations
    this.$mouseRelease[0] = x;
    this.$mouseRelease[1] = y;
    this.$mouseButton = -1;
  },

  /**
   * Function handling the mouseMove event.
   * Call this when the mouse was moved.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   */
  mouseMove: function(x, y) {
    // save the mouse move state and prepare for rotations or translations
    // only if the mouse is pressed
    if (this.$mouseButton !== -1) {
      this.$mouseMove[0] = x;
      this.$mouseMove[1] = y;
    }
  },

  /**
   * Function handling the mouseOver event.
   * Call this when the mouse enteres the context bounds.
   */
  mouseOver: function() {
    // if the mouse just entered the parent bounds, stop the animation
    this.$mouseButton = -1;
  },

  /**
   * Function handling the mouseOut event.
   * Call this when the mouse leaves the context bounds.
   */
  mouseOut: function() {
    // if the mouse leaves the parent bounds, stop the animation
    this.$mouseButton = -1;
  },

  /**
   * Function handling the mouseScroll event.
   * Call this when the mouse wheel was scrolled.
   *
   * @param {Number} scroll: the mouse wheel direction and speed
   */
  mouseScroll: function(scroll) {
    var speed = this.$scrollSpeed,
      min = this.$scrollMin,
      max = this.$scrollMax;

    // clear any interval resetting or manipulating the arcball if set
    this.$clearInterval();

    // save the mouse scroll state and prepare for translations
    this.$scrollValue = Tilt.Math.clamp(
      this.$scrollValue - scroll * speed, min, max);
  },

  /**
   * Function handling the keyDown event.
   * Call this when the a key was pressed.
   *
   * @param {Number} code: the code corresponding to the key pressed
   */
  keyDown: function(code) {
    // clear any interval resetting or manipulating the arcball if set
    this.$clearInterval();

    // save the key code in a vector to handle the event later
    this.$keyCode[code] = true;
  },

  /**
   * Function handling the keyUp event.
   * Call this when the a key was released.
   *
   * @param {Number} code: the code corresponding to the key released
   */
  keyUp: function(code) {
    // reset the key code in the vector
    this.$keyCode[code] = false;
  },

  /**
   * Maps the 2d coordinates of the mouse location to a 3d point on a sphere.
   *
   * @param {Number} x: the current horizontal coordinate of the mouse
   * @param {Number} y: the current vertical coordinate of the mouse
   * @param {Number} width: the width of canvas
   * @param {Number} height: the height of canvas
   * @param {Number} radius: optional, the radius of the arcball
   * @param {Array} sphereVec: a 3d vector to store the sphere coordinates
   */
  pointToSphere: function(x, y, width, height, radius, sphereVec) {
    // adjust point coords and scale down to range of [-1..1]
    x = (x - width * 0.5) / radius;
    y = (y - height * 0.5) / radius;

    // compute the square length of the vector to the point from the center
    var normal = 0,
      sqlength = x * x + y * y;

    // if the point is mapped outside of the sphere
    if (sqlength > 1) {
      // calculate the normalization factor
      normal = 1 / Math.sqrt(sqlength);

      // set the normalized vector (a point on the sphere)
      sphereVec[0] = x * normal;
      sphereVec[1] = y * normal;
      sphereVec[2] = 0;
    }
    else {
      // set the vector to a point mapped inside the sphere
      sphereVec[0] = x;
      sphereVec[1] = y;
      sphereVec[2] = Math.sqrt(1 - sqlength);
    }
  },

  /**
   * Sets the minimum and maximum scrolling bounds.
   *
   * @param {Number} min: the minimum scrolling bounds
   * @param {Number} max: the maximum scrolling bounds
   */
  setScrollBounds: function(min, max) {
    this.$scrollMin = min;
    this.$scrollMax = max;
  },

  /**
   * Sets the scrolling (zooming) speed.
   * @param {Number} speed: the speed
   */
  setScrollSpeed: function(speed) {
    this.$scrollSpeed = speed;
  },

  /**
   * Moves the camera on the x and y axis depending on the passed ammounts.
   *
   * @param {Number} x: the translation along the x axis
   * @param {Number} y: the translation along the y axis
   */
  translate: function(x, y) {
    this.$addKeyTrans[0] += x;
    this.$addKeyTrans[1] += y;
  },

  /**
   * Rotates the camera on the x and y axis depending on the passed ammounts.
   *
   * @param {Number} x: the rotation along the x axis
   * @param {Number} y: the rotation along the y axis
   */
  rotate: function(x, y) {
    this.$addKeyRot[0] += x;
    this.$addKeyRot[1] += y;
  },

  /**
   * Moves the camera forward or backward depending on the passed amount.
   * @param {Number} amount: the amount of zooming to do
   */
  zoom: function(amount) {
    this.$scrollValue += amount;
  },

  /**
   * Cancels any current actions.
   */
  stop: function() {
    this.$clearInterval();
    this.$save();
    this.$mouseButton = -1;
  },

  /**
   * Resize this implementation to use different bounds.
   * This function is automatically called when the arcball is created.
   *
   * @param {Number} width: the width of canvas
   * @param {Number} height: the height of canvas
   * @param {Number} radius: optional, the radius of the arcball
   */
  resize: function(newWidth, newHeight, newRadius) {
    // set the new width, height and radius dimensions
    this.$width = newWidth;
    this.$height = newHeight;
    this.$radius = newRadius ? newRadius : newHeight;
    this.$save();
  },

  /**
   * Resets the rotation and translation to origin.
   * @param {Number} factor: the reset interpolation factor between frames
   */
  reset: function(factor) {
    // cache the variables which will be reset
    var scrollValue = this.$scrollValue,
      lastRot = this.$lastRot,
      deltaRot = this.$deltaRot,
      currentRot = this.$currentRot,
      lastTrans = this.$lastTrans,
      deltaTrans = this.$deltaTrans,
      currentTrans = this.$currentTrans,
      addKeyRot = this.$addKeyRot,
      addKeyTrans = this.$addKeyTrans,

    // cache the vector and quaternion algebra functions
    quat4inverse = quat4.inverse,
    quat4slerp = quat4.slerp,
    vec3scale = vec3.scale,
    vec3length = vec3.length;

    // create an interval and smoothly reset all the values to identity
    this.$setInterval(function() {
      var inverse = quat4inverse(lastRot);

      // reset the rotation quaternion and translation vector
      quat4slerp(lastRot, inverse, 1 - factor);
      quat4slerp(deltaRot, inverse, 1 - factor);
      quat4slerp(currentRot, inverse, 1 - factor);
      vec3scale(lastTrans, factor);
      vec3scale(deltaTrans, factor);
      vec3scale(currentTrans, factor);

      // reset any additional transforms by the keyboard or mouse
      addKeyRot[0] *= factor;
      addKeyRot[1] *= factor;
      addKeyTrans[0] *= factor;
      addKeyTrans[1] *= factor;
      this.$scrollValue *= factor;

      // clear the loop if the all values are very close to zero
      if (vec3length(lastRot) < 0.0001 &&
          vec3length(deltaRot) < 0.0001 &&
          vec3length(currentRot) < 0.0001 &&
          vec3length(lastTrans) < 0.01 &&
          vec3length(deltaTrans) < 0.01 &&
          vec3length(currentTrans) < 0.01 &&
          vec3length([addKeyRot[0], addKeyRot[1], scrollValue]) < 0.01 &&
          vec3length([addKeyTrans[0], addKeyTrans[1], scrollValue]) < 0.01) {
        this.$clearInterval();
      }
    }.bind(this), 1000 / 60);
  },

  /**
   * Creates a looping interval function.
   */
  $setInterval: function(func, time) {
    if ("undefined" === typeof this.$currentInterval) {
      this.$currentInterval = window.setInterval(func, time);
    }
  },

  /**
   * Stops the current interval function from looping.
   */
  $clearInterval: function() {
    if ("undefined" !== typeof this.$currentInterval) {
      window.clearInterval(this.$currentInterval);
      delete this.$currentInterval;
    }
  },

  /**
   * Saves the current arcball state, typically after mouse or resize events.
   */
  $save: function() {
    var mousePress = this.$mousePress,
      mouseMove = this.$mouseMove,
      mouseRelease = this.$mouseRelease,
      mouseLerp = this.$mouseLerp,
      x = this.$mousePress[0],
      y = this.$mousePress[1];

    mouseMove[0] = x;
    mouseMove[1] = y;
    mouseRelease[0] = x;
    mouseRelease[1] = y;
    mouseLerp[0] = x;
    mouseLerp[1] = y;
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    this.stop();
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.VertexBuffer", "Tilt.IndexBuffer"];

/**
 * Vertex buffer constructor.
 * Creates a vertex buffer containing an array of elements.
 *
 * @param {Tilt.Renderer} renderer: an instance of Tilt.Renderer
 * @param {Array} elementsArray: an array of floats
 * @param {Number} itemSize: how many items create a block
 * @param {Number} numItems: optional, how many items to use from the array
 * @return {Tilt.VertexBuffer} the newly created object
 */
Tilt.VertexBuffer = function(elementsArray, itemSize, numItems) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.VertexBuffer", this);

  /**
   * The array buffer.
   */
  this.$ref = null;

  /**
   * Array of number components contained in the buffer.
   */
  this.components = null;

  /**
   * Variables defining the internal structure of the buffer.
   */
  this.itemSize = 0;
  this.numItems = 0;

  // if the array is specified in the constructor, initialize directly
  if ("undefined" !== typeof elementsArray) {
    this.initBuffer(elementsArray, itemSize, numItems);
  }

  // cleanup
  elementsArray = null;
};

Tilt.VertexBuffer.prototype = {

  /**
   * Initializes buffer data to be used for drawing, using an array of floats.
   * The "numItems" param can be specified to use only a portion of the array.
   *
   * @param {Array} elementsArray: an array of floats
   * @param {Number} itemSize: how many items create a block
   * @param {Number} numItems: optional, how many items to use from the array
   */
  initBuffer: function(elementsArray, itemSize, numItems) {
    var gl = Tilt.$gl;

    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length / itemSize;
    }

    // create the Float32Array using the elements array
    this.components = new Float32Array(elementsArray);

    // create an array buffer and bind the elements as a Float32Array
    this.$ref = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.$ref);
    gl.bufferData(gl.ARRAY_BUFFER, this.components, gl.STATIC_DRAW);

    // remember some properties, useful when binding the buffer to a shader
    this.itemSize = itemSize;
    this.numItems = numItems;

    // cleanup
    elementsArray = null;
    gl = null;
  },

  /**
   * Destroys this object and sets all members to null.
   */
  destroy: function() {
    try { Tilt.$gl.deleteBuffer(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};

/**
 * IndexBuffer constructor.
 * Creates an index buffer containing an array of indices.
 *
 * @param {Array} elementsArray: an array of unsigned integers
 * @param {Number} numItems: how many items to use from the array
 * @return {Tilt.IndexBuffer} the newly created object
 */
Tilt.IndexBuffer = function(elementsArray, numItems) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.IndexBuffer", this);

  /**
   * The element array buffer.
   */
  this.$ref = null;

  /**
   * Array of number components contained in the buffer.
   */
  this.components = null;

  /**
   * Variables defining the internal structure of the buffer.
   */
  this.itemSize = 0;
  this.numItems = 0;

  // if the array is specified in the constructor, initialize directly
  if ("undefined" !== typeof elementsArray) {
    this.initBuffer(elementsArray, numItems);
  }

  // cleanup
  elementsArray = null;
};

Tilt.IndexBuffer.prototype = {

  /**
   * Initializes a buffer of vertex indices, using an array of unsigned ints.
   * The item size will automatically default to 1, and the "numItems" will be
   * equal to the number of items in the array if not specified.
   *
   * @param {Array} elementsArray: an array of unsigned integers
   * @param {Number} numItems: how many items to use from the array
   */
  initBuffer: function(elementsArray, numItems) {
    var gl = Tilt.$gl;

    // the numItems parameter is optional, we can compute it if not specified
    if ("undefined" === typeof numItems) {
      numItems = elementsArray.length;
    }

    // create the Uint16Array using the elements array
    this.components = new Uint16Array(elementsArray);

    // create an array buffer and bind the elements as a Uint16Array
    this.$ref = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.$ref);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.components, gl.STATIC_DRAW);

    // remember some properties, useful when binding the buffer to a shader
    this.itemSize = 1;
    this.numItems = numItems;

    // cleanup
    elementsArray = null;
    gl = null;
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    try { Tilt.$gl.deleteBuffer(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};
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
  "Tilt.$gl",
  "Tilt.$renderer",
  "Tilt.$activeShader",
  "Tilt.$enabledAttributes",
  "Tilt.$loadedTextures",
  "Tilt.clearCache"];

/* All cached variables begin with the $ sign, for easy spotting.
 * ------------------------------------------------------------------------ */

/**
 * The current active WebGL context.
 */
Tilt.$gl = null;

/**
 * The current active Tilt renderer.
 */
Tilt.$renderer = null;

/**
 * Represents the current active shader, identified by an id.
 */
Tilt.$activeShader = -1;

/**
 * Represents the current enabled attributes.
 */
Tilt.$enabledAttributes = -1;

/**
 * All the loaded textures, stored in a hash table.
 */
Tilt.$loadedTextures = {};

/**
 * Clears the cache and sets all the variables to default.
 */
Tilt.clearCache = function() {
  Tilt.destroyObject(Tilt.$gl);
  Tilt.destroyObject(Tilt.$renderer);
  Tilt.destroyObject(Tilt.$activeShader);
  Tilt.destroyObject(Tilt.$enabledAttributes);
  Tilt.destroyObject(Tilt.$loadedTextures);

  Tilt.$gl = null;
  Tilt.$renderer = null;
  Tilt.$activeShader = -1;
  Tilt.$enabledAttributes = -1;
  Tilt.$loadedTextures = {};

  Tilt.GLSL.$count = 0;
  Tilt.TextureUtils.$count = 0;
};
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
var EXPORTED_SYMBOLS = ["Tilt.Profiler"];

/**
 * Handy way of profiling functions in Tilt.
 */
Tilt.Profiler = {

  /**
   * Set this to true to enable profiling.
   */
  enabled: false,

  /**
   * Array containing information about all the intercepted functions.
   */
  functions: [],

  /**
   * Intercepts a function, issuing calls for appropriate methods before and
   * after the execution of that function. The interception method can be
   * overridden by specifying a custom duringCall function.
   *
   * Pass null instead of the function name to intercept all the functions
   * from an object.
   *
   * @param {String} ns: optional, the namespace for the function
   * @param {Object} object: the object containing the function
   * @param {String} name: the name of the function
   * @param {Function} beforeCall: optional, custom logic before the function
   * @param {Function} afterCall: optional, custom logic after the function
   * @param {Function} duringCall: optional, custom logic for interception
   */
  intercept: function(ns, object, name, beforeCall, afterCall, duringCall) {
    // the profiler must be enabled to intercept functions
    if (!this.enabled) {
      return;
    }

    var method, index, i;

    // if the function name is falsy, intercept all the object functions
    if (!name) {
      for (i in object) {
        // if an object member is a function, automatically intercept it
        if ("function" === typeof object[i]) {
          this.intercept(ns, object, i, beforeCall, afterCall, duringCall);
        }
      }
      return;
    }

    // set the appropriate before, after and during call functions
    if ("undefined" === typeof beforeCall) {
      beforeCall = this.beforeCall.bind(this);
    }
    if ("undefined" === typeof afterCall) {
      afterCall = this.afterCall.bind(this);
    }
    if ("undefined" === typeof duringCall) {
      duringCall = this.duringCall.bind(this);
    }

    // get the function from the object
    method = object[name];

    if ("function" === typeof method) {
      index = this.functions.length;

      // save some information about this function in an array for profiling
      this.functions[index] = {
        name: ((ns + ".") || "") + name,
        calls: 0,
        averageTime: 0,
        longestTime: 0,
        totalTime: 0
      };

      // overwrite the function to handle before, after and during calls
      object[name] = function() {
        // a tricky issue can appear when an overwritten function needs to
        // return a value; in this case, the afterCall still needs to be
        // executed after the function returns
        try {
          beforeCall(index);
          return duringCall(object, method, arguments);
        }
        finally {
          afterCall(index);
        }
      };
    }
  },

  /**
   * Default beforeCall function.
   * @param {Number} index: the index of the function in the profile array
   */
  beforeCall: function(index) {
    var f = this.functions[index];

    if ("undefined" !== typeof f) {
      this.functions[index].currentTime = new Date().getTime();
    }
  },

  /**
   * Default afterCall function.
   * @param {Number} index: the index of the function in the profile array
   */
  afterCall: function(index) {
    var f = this.functions[index];

    if ("undefined" !== typeof f) {
      var beforeTime = f.currentTime,
        afterTime = new Date().getTime(),
        currentDuration = afterTime - beforeTime;

      f.calls++;
      f.longestTime = Math.max(f.longestTime, currentDuration);
      f.averageTime = (f.longestTime + currentDuration) * 0.5;
      f.totalTime += currentDuration;
    }
  },

  /**
   * Default duringCall function.
   *
   * @param {Object} object: the object to be used as "this" for the function
   * @param {Function} method: the function called
   * @param {Number} args: arguments for the called function
   */
  duringCall: function(object, method, args) {
    if (args.length === 0) {
      return method.call(object);
    }
    else {
      return method.apply(object, args);
    }
  },

  /**
   * Logs information about the currently profiled functions.
   */
  log: function() {
    var functions = this.functions.slice(0), // duplicate the functions array
      i, j, f, f2;

    // once everything is finished, logging can be done by sorting all the
    // recorded function calls, timing and other information by a key

    // with Tilt, the most useful data was received when sorting by the total
    // time necessary for a function to be executed
    functions.sort(function(a, b) {
      return a.totalTime < b.totalTime ? 1 : -1;
    });

    // browse through each intercepted function information
    for (i = 0; i < functions.length; i++) {
      f = functions[i];

      // because some functions inside objects can be duplicated when creating
      // object via var foo = new MyObject(), that is, when they are declared
      // inside the constructor function and not the object prototype, we need
      // to check for duplicates and recalculate the number of calls, longest
      // time, total time, average time for these situations.
      for (j = i + 1; j < functions.length; j++) {
        f2 = functions[j];

        if (f.name === f2.name) {
          f.calls += f2.calls;
          f.longestTime = Math.max(f.longestTime, f2.longestTime);
          f.averageTime = (f.averageTime + f2.averageTime) * 0.5;
          f.totalTime += f2.totalTime;

          functions.splice(j, 1);
          j--;
        }
      }

      // only log information about a function if it was called at least once
      if (f.calls === 0) {
        continue;
      }

      // log the necessary information about a function
      Tilt.Console.log(
        "function " + f.name + "\n" +
        "calls    " + f.calls + "\n" +
        "average  " + f.averageTime + "ms\n" +
        "longest  " + f.longestTime + "ms\n" +
        "total    " + f.totalTime + "ms");
    }
  },

  /**
   * Resets the profiled functions array.
   */
  reset: function() {
    this.functions = [];
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.Program"];

/**
 * Program constructor, composed of a vertex and a fragment shader.
 * To create a program using remote sources, use initProgramAt.
 *
 * @param {String} vertShaderSrc: optional, the vertex shader source code
 * @param {String} fragShaderSrc: optional, the fragment shader source code
 * @return {Tilt.Program} the newly created object
 */
Tilt.Program = function(vertShaderSrc, fragShaderSrc) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Program", this);

  /**
   * A reference to the actual GLSL program.
   */
  this.$ref = null;

  /**
   * Each program has an unique id assigned.
   */
  this.$id = -1;

  /**
   * Two arrays: an attributes array property, containing all the attributes
   * and a uniforms array, containing all the uniforms. These variables are
   * automatically cached as string-value hashes.
   */
  this.$attributes = null;
  this.$uniforms = null;

  /**
   * Each program has an assigned object for caching all the current
   * attributes and uniforms at runtime, when using the shader.
   */
  this.$cache = {};
  this.$texcache = {};

  // if the sources are specified in the constructor, initialize directly
  if (arguments.length === 2) {
    this.initProgram(vertShaderSrc, fragShaderSrc);
  }
};

Tilt.Program.prototype = {

  /**
   * Initializes a shader program, using specified source code as strings.
   *
   * @param {String} vertShaderSrc: the vertex shader source code
   * @param {String} fragShaderSrc: the fragment shader source code
   */
  initProgram: function(vertShaderSrc, fragShaderSrc) {
    this.$ref = Tilt.GLSL.create(vertShaderSrc, fragShaderSrc);

    // cache for faster access
    this.$id = this.$ref.id;
    this.$attributes = this.$ref.attributes;
    this.$uniforms = this.$ref.uniforms;

    // cleanup
    this.$ref.id = null;
    this.$ref.attributes = null;
    this.$ref.uniforms = null;

    delete this.$ref.id;
    delete this.$ref.attributes;
    delete this.$ref.uniforms;
  },

  /**
   * Initializes a shader program, using sources located at a specific url.
   * If only two params are specified (the shader name and the readyCallback
   * function), then ".fs" and ".vs" extensions will be automatically used).
   *
   * @param {String} vertShaderURL: the vertex shader resource
   * @param {String} fragShaderURL: the fragment shader resource
   * @param {Function} readyCallback: the function called when loading is done
   */
  initProgramAt: function(vertShaderURL, fragShaderURL, readyCallback) {
    // if only two parameters are passed we assume that the first is a general
    // path to the shader name, adding the default .fs and .vs extensions
    // thus, the second parameter becomes the ready callback function
    if (arguments.length === 2) {
      readyCallback = fragShaderURL;
      fragShaderURL = vertShaderURL + ".fs";
      vertShaderURL = vertShaderURL + ".vs";
    }

    // request the shader sources asynchronously
    Tilt.Xhr.requests([vertShaderURL, fragShaderURL], function(xhr) {
      // we obtain the sources for both the fragment and vertex shader, so
      // continue initialization as usual
      this.initProgram(xhr[0].responseText, xhr[1].responseText);

      // run a ready callback function when the program has initialized
      if ("function" === typeof readyCallback) {
        readyCallback();
      }
    }.bind(this));
  },

  /**
   * Uses the shader program as current one for the WebGL context; it also
   * enables vertex attributes necessary to enable when using this program.
   * This method also does some useful caching, as the function useProgram
   * could take quite a lot of time.
   */
  use: function() {
    var id = this.$id,
      gl, i;

    this.clearCache();
    this.clearTextureCache();

    // check if the program wasn't already active
    if (Tilt.$activeShader !== id) {
      Tilt.$activeShader = id;

      // cache the WebGL context variable
      // use the the program if it wasn't already set
      gl = Tilt.$gl;
      gl.useProgram(this.$ref);

      // check if the required vertex attributes aren't already set
      if (Tilt.$enabledAttributes < this.$attributes.length) {
        Tilt.$enabledAttributes = this.$attributes.length;

        // enable any necessary vertex attributes using the cache
        for (i in this.$attributes) {
          if (this.$attributes.hasOwnProperty(i) && i !== "length") {
            gl.enableVertexAttribArray(this.$attributes[i]);
          }
        }
      }
    }
  },

  /**
   * Binds a vertex buffer as an array buffer for a specific shader attribute.
   *
   * @param {String} attribute: the attribute name obtained from the shader
   * @param {Float32Array} buffer: the buffer to be bound
   */
  bindVertexBuffer: function(attribute, buffer) {
    // get the cached attribute value from the shader
    var gl = Tilt.$gl,
      attr = this.$attributes[attribute],
      size = buffer.itemSize;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.$ref);
    gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);
  },

  /**
   * Binds a uniform matrix to the current shader.
   *
   * @param {String} uniform: the uniform name to bind the variable to
   * @param {Float32Array} m: the matrix to be bound
   */
  bindUniformMatrix: function(uniform, m) {
    Tilt.$gl.uniformMatrix4fv(this.$uniforms[uniform], false, m);
  },

  /**
   * Binds a uniform vector of 4 elements to the current shader.
   *
   * @param {String} uniform: the uniform name to bind the variable to
   * @param {Float32Array} v: the vector to be bound
   */
  bindUniformVec4: function(uniform, v) {
    Tilt.$gl.uniform4fv(this.$uniforms[uniform], v);
  },

  /**
   * Binds a simple float element to the current shader.
   *
   * @param {String} uniform: the uniform name to bind the variable to
   * @param {Number} variable: the variable to be bound
   */
  bindUniformFloat: function(uniform, variable) {
    Tilt.$gl.uniform1f(this.$uniforms[uniform], variable);
  },

  /**
   * Binds a uniform texture for a sampler to the current shader.
   *
   * @param {String} sampler: the sampler name to bind the texture to
   * @param {Tilt.Texture} texture: the texture to be bound
   */
  bindTexture: function(sampler, texture, unit) {
    var gl = Tilt.$gl;

    gl.bindTexture(gl.TEXTURE_2D, texture.$ref);
    gl.uniform1i(this.$uniforms[sampler], 0);
  },

  /**
   * Clears any bound uniforms from the cache.
   */
  clearTextureCache: function() {
    this.$texcache = {};
  },

  /**
   * Clears any bound uniforms from the cache.
   */
  clearCache: function() {
    this.$cache = {};
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    try { Tilt.$gl.deleteShader(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.GLSL"];

/**
 * Utility functions for handling GLSL shaders and programs.
 */
Tilt.GLSL = {

  /**
   * Initializes a shader program, using specified source code as strings,
   * Returning the newly created shader program, by compiling and linking the
   * vertex and fragment shader.
   *
   * @param {String} vertShaderSrc: the vertex shader source code
   * @param {String} fragShaderSrc: the fragment shader source code
   */
  create: function(vertShaderSrc, fragShaderSrc) {
    // compile the two shaders
    var vertShader = this.compile(vertShaderSrc, "x-shader/x-vertex"),
      fragShader = this.compile(fragShaderSrc, "x-shader/x-fragment");

    // link the two shaders to form a program
    return this.link(vertShader, fragShader);
  },

  /**
   * Compiles a shader source of a specific type, either vertex or fragment.
   *
   * @param {String} shaderSource: the source code for the shader
   * @param {String} shaderType: the shader type ("x-vertex" or "x-fragment")
   * @return {WebGLShader} the compiled shader
   */
  compile: function(shaderSource, shaderType) {
    var gl = Tilt.$gl,
      shader, status;

    // make sure the shader source is valid
    if ("string" !== typeof shaderSource || shaderSource.length < 1) {
      Tilt.Console.error(Tilt.StringBundle.get("compileShader.source.error"));
      return null;
    }

    // also make sure the necessary shader mime type is valid
    if (shaderType === "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else if (shaderType === "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else {
      Tilt.Console.error(
        Tilt.StringBundle.format("compileShader.type.error"), [shaderSource]);

      return null;
    }

    // set the shader source and compile it
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    // remember the shader source (useful for debugging and caching)
    shader.src = shaderSource;

    // verify the compile status; if something went wrong, log the error
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      status = gl.getShaderInfoLog(shader);

      Tilt.Console.error(
        Tilt.StringBundle.format("compileShader.compile.error"), [status]);

      return null;
    }

    // return the newly compiled shader from the specified source
    return shader;
  },

  /**
   * Links two compiled vertex or fragment shaders together to form a program.
   *
   * @param {WebGLShader} vertShader: the compiled vertex shader
   * @param {WebGLShader} fragShader: the compiled fragment shader
   * @return {WebGLProgram} the newly created and linked shader program
   */
  link: function(vertShader, fragShader) {
    var gl = Tilt.$gl,
      program, status, source, data, cached;

    // create a program and attach the compiled vertex and fragment shaders
    program = gl.createProgram();

    // attach the vertex and fragment shaders to the program
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    // verify the link status; if something went wrong, log the error
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      status = gl.getProgramInfoLog(program);

      Tilt.Console.error(
        Tilt.StringBundle.format("linkProgram.error", [status]));

      return null;
    }

    // generate an id for the program
    program.id = this.$count++;

    // create an array of all the attributes, uniforms & words from the shader
    // which will be searched for to automatically cache the shader variables
    source = [vertShader.src, fragShader.src].join(" ");
    data = source.replace(/#.*|[(){};,]/g, " ").split(" ");

    // cache the io attributes and uniforms automatically
    cached = this.shaderIOCache(program, data);
    return cached;
  },

  /**
   * Gets a shader attribute location from a program.
   *
   * @param {WebGLProgram} program: the shader program
   * @param {String} attribute: the attribute name
   * @return {Number} the attribute location from the program
   */
  shaderAttribute: function(program, attribute) {
    return Tilt.$gl.getAttribLocation(program, attribute);
  },

  /**
   * Gets a shader uniform location from a program.
   *
   * @param {WebGLProgram} program: the shader program
   * @param {String} uniform: the uniform name
   * @return {WebGLUniformLocation} the uniform object from the program
   */
  shaderUniform: function(program, uniform) {
    return Tilt.$gl.getUniformLocation(program, uniform);
  },

  /**
   * Gets a generic shader variable (attribute or uniform) from a program.
   * If an attribute is found, the attribute location will be returned.
   * Otherwise, the uniform will be searched and returned if found.
   *
   * @param {WebGLProgram} program: the shader program
   * @param {String} variable: the attribute or uniform name
   * @return {Number} | {WebGLUniformLocation} the attribute or uniform
   */
  shaderIO: function(program, variable) {
    if ("string" === typeof variable) {
      // weird stuff can happen with empty strings
      if (variable.length < 1) {
        return null;
      }

      var io;

      // try to get a shader attribute
      if ((io = this.shaderAttribute(program, variable)) >= 0) {
        return io;
      }
      else {
        // if unavailable, search for a shader uniform
        return this.shaderUniform(program, variable);
      }
    }

    // no attribute or uniform was found, so we return null
    return null;
  },

  /**
   * Caches shader attributes and uniforms as properties for a program object.
   *
   * @param {WebGLProgram} program: the shader program used for caching
   * @param {Array} variables: string array with variable names
   * @return {WebGLProgram} the same program
   */
  shaderIOCache: function(program, variables) {
    var i, len, param, io;

    // make sure the attributes and uniforms cache objects are created
    program.attributes = {};
    program.attributes.length = 0;
    program.uniforms = {};
    program.uniforms.length = 0;

    // pass through each element in the variables array
    for (i = 0, len = variables.length; i < len; i++) {
      // try to get a shader variable from the program
      param = variables[i];
      io = this.shaderIO(program, param);

      if ("number" === typeof io) {
        // if we get an attribute location, store it
        // bind the new parameter only if it was not already defined
        if ("undefined" === typeof program.attributes[param]) {
          program.attributes[param] = io;
          program.attributes.length++;
        }
      }

      /*global WebGLUniformLocation */
      if (("object" === typeof io && io instanceof WebGLUniformLocation)) {
        // if we get a WebGL uniform object, store it
        // bind the new parameter only if it was not already defined
        if ("undefined" === typeof program.uniforms[param]) {
          program.uniforms[param] = io;
          program.uniforms.length++;
        }
      }
    }

    return program;
  },

  /**
   * The total number of shaders created.
   */
  $count: 0
};
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
var EXPORTED_SYMBOLS = ["Tilt.Texture"];

/**
 * Texture constructor.
 * This wrapper creates a texture using an already initialized Image. To
 * create a texture using a remote image, use initTextureAt.
 *
 * @param {Image} image: the texture source image or canvas
 * @param {Object} properties: an object containing the following properties
 *  @param {String} fill: optional, color to fill the transparent bits
 *  @param {String} stroke: optional, color to draw an outline
 *  @param {Number} strokeWeight: optional, the width of the outline
 *  @param {String} minFilter: either "nearest" or "linear"
 *  @param {String} magFilter: either "nearest" or "linear"
 *  @param {Boolean} mipmap: true if should generate mipmap
 *  @param {String} wrapS: either "repeat" or "clamp"
 *  @param {String} wrapT: either "repeat" or "clamp"
 *  @param {Function} onload: function function called when texture has loaded
 */
Tilt.Texture = function(image, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Texture", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * A reference to the WebGL texture object.
   */
  this.$ref = null;

  /**
   * Each texture has an unique id assigned.
   */
  this.$id = -1;

  /**
   * Variables specifying the width and height of the texture.
   * If these values are less than 0, the texture hasn't loaded yet.
   */
  this.width = -1;
  this.height = -1;

  /**
   * Specifies if the texture has loaded or not.
   * @return {Boolean} true if the texture has loaded, false if not
   */
  this.loaded = false;

  /**
   * Function to be called when the texture has finished loading.
   */
  this.onload = properties.onload;

  // if the image is specified in the constructor, initialize directly
  if ("object" === typeof image) {
    this.initTexture(image, properties);
  }
  else if ("string" === typeof image) {
    this.initTextureAt(image, properties);
  }
  else {
    Tilt.Console.error(Tilt.StringBundle.get("initTexture.source.error"));
  }

  // cleanup
  image = null;
  properties = null;
};

Tilt.Texture.prototype = {

  /**
   * Initializes a texture from a pre-existing image or canvas.
   *
   * @param {Image | HTMLCanvasElement} image: the source image or canvas
   * @param {Object} parameters: an object containing the texture properties
   */
  initTexture: function(image, parameters) {
    this.$ref = Tilt.TextureUtils.create(image, parameters);

    if ("undefined" !== typeof this.$ref && this.$ref !== null) {
      // cache for faster access
      this.$id = this.$ref.id;
      this.width = this.$ref.width;
      this.height = this.$ref.height;
      this.loaded = true;

      // if the onload event function is specified, call it now
      if ("function" === typeof this.onload) {
        this.onload();
      }

      // cleanup
      this.$ref.id = null;
      this.$ref.width = null;
      this.$ref.height = null;

      delete this.$ref.id;
      delete this.$ref.width;
      delete this.$ref.height;
    }

    this.onload = null;
    delete this.onload;

    image = null;
    parameters = null;
  },

  /**
   * Initializes a texture from a source, runs a callback function when ready.
   *
   * @param {String} imageSource: the texture source
   * @param {Object} parameters: an object containing the texture properties
   */
  initTextureAt: function(imageSource, parameters, readyCallback) {
    var image = new Image(); // load the image from the source in an object
    image.src = imageSource;
    image.onload = function() {
      // the image has loaded, continue initialization as usual
      this.initTexture(image, parameters);

      // cleanup
      image = null;
      parameters = null;
    }.bind(this);
  },

  /**
   * Updates a region of a texture with another image.
   *
   * @param {Image | HTMLCanvasElement} image: the source image or canvas
   * @param {Number} x: the x offset
   * @param {Number} y: the y offset
   */
  updateSubImage2D: function(img, x, y) {
    if (this.width === img.width && this.height === img.height && x && y) {
      x = 0;
      y = 0;
    }

    var gl = Tilt.$gl;
    gl.bindTexture(gl.TEXTURE_2D, this.$ref);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, img);
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    try { Tilt.$gl.deleteTexture(this.$ref); } catch(e) {}
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.TextureUtils"];

/**
 * Utility functions for creating and manipulating textures.
 */
Tilt.TextureUtils = {

  /**
   * Initializes a texture from a pre-existing image or canvas.
   *
   * @param {Image | HTMLCanvasElement} image: the source image or canvas
   * @param {Object} parameters: an object containing the texture properties
   * @return {WebGLTexture} the created texture
   */
  create: function(image, parameters) {
    if ("undefined" === typeof image || image === null) {
      return;
    }

    // make sure the parameters argument is an object
    parameters = parameters || {};

    // check to see if the texture hasn't been already created
    if ("undefined" !== typeof Tilt.$loadedTextures[image.src]) {
      return Tilt.$loadedTextures[image.src];
    }

    // make sure the image is power of two before binding to a texture
    var gl = Tilt.$gl,
      resz = Tilt.TextureUtils.resizeImageToPowerOfTwo(image, parameters),
      prev = gl.getParameter(gl.TEXTURE_BINDING_2D),
      width = image.width,
      height = image.height,

    // first, create the texture to hold the image data
    texture = gl.createTexture();

    // attach the image data to the newly create texture
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resz);

    // remember the width and the height
    texture.width = width;
    texture.height = height;

    // generate an id for the texture
    texture.id = this.$count++;

    // set the required texture params and do some cleanup
    this.setTextureParams(parameters);
    gl.bindTexture(gl.TEXTURE_2D, prev);

    // cache the current texture in a hash table, for easy future access
    if ("undefined" !== typeof image.src) {
      Tilt.$loadedTextures[image.src] = texture;
    }

    // cleanup
    gl = null;
    resz = null;
    prev = null;
    image = null;
    parameters = null;

    return texture;
  },

  /**
   * Sets texture parameters for the current texture binding.
   * Optionally, you can also (re)set the current texture binding manually.
   *
   * @param {Object} parameters: an object containing the texture properties
   */
  setTextureParams: function(parameters) {
    var gl = Tilt.$gl,
      minFilter = gl.TEXTURE_MIN_FILTER,
      magFilter = gl.TEXTURE_MAG_FILTER,
      wrapS = gl.TEXTURE_WRAP_S,
      wrapT = gl.TEXTURE_WRAP_T;

    // make sure the parameters argument is an object
    parameters = parameters || {};

    // bind a new texture if necessary
    if (parameters.texture) {
      gl.bindTexture(gl.TEXTURE_2D, parameters.texture.ref);
    }

    // set the minification filter
    if ("nearest" === parameters.minFilter) {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.NEAREST);
    }
    else if ("linear" === parameters.minFilter && parameters.mipmap) {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, minFilter, gl.LINEAR);
    }

    // set the magnification filter
    if ("nearest" === parameters.magFilter) {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.NEAREST);
    }
    else if ("linear" === parameters.magFilter && parameters.mipmap) {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.LINEAR_MIPMAP_LINEAR);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, magFilter, gl.LINEAR);
    }

    // set the wrapping on the x-axis for the texture
    if ("repeat" === parameters.wrapS) {
      gl.texParameteri(gl.TEXTURE_2D, wrapS, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, wrapS, gl.CLAMP_TO_EDGE);
    }

    // set the wrapping on the y-axis for the texture
    if ("repeat" === parameters.wrapT) {
      gl.texParameteri(gl.TEXTURE_2D, wrapT, gl.REPEAT);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, wrapT, gl.CLAMP_TO_EDGE);
    }

    // generate mipmap if necessary
    if (parameters.mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  },

  /**
   * Scales an image to power of two width and height.
   * If the image already has power of two sizes, it is immediately returned.
   *
   * @param {Image} image: the image to be scaled
   * @param {Object} parameters: an object containing the following properties
   *  @param {Boolean} preserve: true if resize should be ignored
   *  @param {String} fill: optional, color to fill the transparent bits
   *  @param {String} stroke: optional, color to draw an image outline
   *  @param {Number} strokeWeight: optional, the width of the outline
   * @return {Image} the resized image
   */
  resizeImageToPowerOfTwo: function(image, parameters) {
    // make sure the parameters argument is an object
    parameters = parameters || {};

    var isChromePath = (image.src || "").indexOf("chrome://"),
      isPowerOfTwoWidth = Tilt.Math.isPowerOfTwo(image.width),
      isPowerOfTwoHeight = Tilt.Math.isPowerOfTwo(image.height),
      width, height, canvas, context;

    // first check if the image is not already power of two
    if (parameters.preserve || (
        isPowerOfTwoWidth && isPowerOfTwoHeight && isChromePath === -1)) {
      try {
        return image;
      }
      finally {
        image = null;
        parameters = null;
      }
    }

    // calculate the power of two dimensions for the npot image
    width = Tilt.Math.nextPowerOfTwo(image.width);
    height = Tilt.Math.nextPowerOfTwo(image.height);

    // create a canvas, then we will use a 2d context to scale the image
    canvas = Tilt.Document.initCanvas(width, height);

    // do some 2d context magic
    context = canvas.getContext("2d");

    // optional fill (useful when handling transparent images)
    if (parameters.fill) {
      context.fillStyle = parameters.fill;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // draw the image with power of two dimensions
    context.drawImage(image,
      0, 0, image.width, image.height,
      0, 0, canvas.width, canvas.height);

    // optional stroke (useful when creating textures for edges)
    if (parameters.stroke) {
      context.strokeStyle = parameters.stroke;
      context.lineWidth = parameters.strokeWeight;
      context.strokeRect(0, 0, canvas.width, canvas.height);
    }

    try {
      return canvas;
    }
    finally {
      // cleanup
      image = null;
      parameters = null;
      canvas = null;
      context = null;
    }
  },

  /**
   * Specify if the textures should be flipped.
   * @param {Boolean} flipY: true if the textures should be flipped
   */
  setTextureFlipY: function(flipY) {
    Tilt.$gl.pixelStorei(Tilt.$gl.UNPACK_FLIP_Y_WEBGL, flipY);
  },

  /**
   * The total number of shaders created.
   */
  $count: 0
};
/*

 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <elfz@laacz.lv>
    http://jsbeautifier.org/


  You are free to use this in any way you want, in case you find this useful or working for you.

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    max_char (default 70)            -  maximum amount of characters per line,
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.

    e.g.

    style_html(html_source, {
      'indent_size': 2,
      'indent_char': ' ',
      'max_char': 78,
      'brace_style': 'expand'
    });
*/

function style_html(html_source, options) {
//Wrapper function to invoke all the necessary constructors and deal with the output.

  var multi_parser,
      indent_size,
      indent_character,
      max_char,
      brace_style;

  options = options || {};
  indent_size = options.indent_size || 2;
  indent_character = options.indent_char || ' ';
  brace_style = options.brace_style || 'collapse';
  max_char = options.max_char || '78';

  function Parser() {

    this.pos = 0; //Parser position
    this.token = '';
    this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
    this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
      parent: 'parent1',
      parentcount: 1,
      parent1: ''
    };
    this.tag_type = '';
    this.token_text = this.last_token = this.last_text = this.token_type = '';

    this.Utils = { //Uilities made available to the various functions
      whitespace: "\n\r\t ".split(''),
      single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed'.split(','), //all the single tags for HTML
      extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
      in_array: function (what, arr) {
        for (var i=0; i<arr.length; i++) {
          if (what === arr[i]) {
            return true;
          }
        }
        return false;
      }
    }

    this.get_content = function () { //function to capture regular content between tags

      var input_char = '';
      var content = [];
      var space = false; //if a space is needed
      while (this.input.charAt(this.pos) !== '<') {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (content.length) {
            space = true;
          }
          this.line_char_count--;
          continue; //don't want to insert unnecessary space
        }
        else if (space) {
          if (this.line_char_count >= this.max_char) { //insert a line when the max_char is reached
            content.push('\n');
            for (var i=0; i<this.indent_level; i++) {
              content.push(this.indent_string);
            }
            this.line_char_count = 0;
          }
          else{
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //letter at-a-time (or string) inserted to an array
      }
      return content.length?content.join(''):'';
    }

    this.get_script = function () { //get the full content of a script to pass to js_beautify

      var input_char = '';
      var content = [];
      var reg_match = new RegExp('\<\/script' + '\>', 'igm');
      reg_match.lastIndex = this.pos;
      var reg_array = reg_match.exec(this.input);
      var end_script = reg_array?reg_array.index:this.input.length; //absolute end of script
      while(this.pos < end_script) { //get everything in between the script tags
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;

        content.push(input_char);
      }
      return content.length?content.join(''):''; //we might not have any content at all
    }

    this.record_tag = function (tag){ //function to record a tag and its parent in this.tags Object
      if (this.tags[tag + 'count']) { //check for the existence of this tag type
        this.tags[tag + 'count']++;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      else { //otherwise initialize this tag type
        this.tags[tag + 'count'] = 1;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
      this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
    }

    this.retrieve_tag = function (tag) { //function to retrieve the opening tag to the corresponding closer
      if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
        var temp_parent = this.tags.parent; //check to see if it's a closable tag.
        while (temp_parent) { //till we reach '' (the initial value);
          if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
            break;
          }
          temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
        }
        if (temp_parent) { //if we caught something
          this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
          this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
        }
        delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
        delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
        if (this.tags[tag + 'count'] == 1) {
          delete this.tags[tag + 'count'];
        }
        else {
          this.tags[tag + 'count']--;
        }
      }
    }

    this.get_tag = function () { //function to get a full tag and parse its type
      var input_char = '';
      var content = [];
      var space = false;

      do {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
          space = true;
          this.line_char_count--;
          continue;
        }

        if (input_char === "'" || input_char === '"') {
          if (!content[1] || content[1] !== '!') { //if we're in a comment strings don't get treated specially
            input_char += this.get_unformatted(input_char);
            space = true;
          }
        }

        if (input_char === '=') { //no space before =
          space = false;
        }

        if (content.length && content[content.length-1] !== '=' && input_char !== '>'
            && space) { //no space after = or before >
          if (this.line_char_count >= this.max_char) {
            this.print_newline(false, content);
            this.line_char_count = 0;
          }
          else {
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //inserts character at-a-time (or string)
      } while (input_char !== '>');

      var tag_complete = content.join('');
      var tag_index;
      if (tag_complete.indexOf(' ') != -1) { //if there's whitespace, thats where the tag name ends
        tag_index = tag_complete.indexOf(' ');
      }
      else { //otherwise go with the tag ending
        tag_index = tag_complete.indexOf('>');
      }
      var tag_check = tag_complete.substring(1, tag_index).toLowerCase();
      if (tag_complete.charAt(tag_complete.length-2) === '/' ||
          this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
        this.tag_type = 'SINGLE';
      }
      else if (tag_check === 'script') { //for later script handling
        this.record_tag(tag_check);
        this.tag_type = 'SCRIPT';
      }
      else if (tag_check === 'style') { //for future style handling (for now it justs uses get_content)
        this.record_tag(tag_check);
        this.tag_type = 'STYLE';
      }
      else if (tag_check === 'a') { // do not reformat the <a> links
        var comment = this.get_unformatted('</a>', tag_complete); //...delegate to get_unformatted function
        content.push(comment);
        this.tag_type = 'SINGLE';
      }
      else if (tag_check.charAt(0) === '!') { //peek for <!-- comment
        if (tag_check.indexOf('[if') != -1) { //peek for <!--[if conditional comment
          if (tag_complete.indexOf('!IE') != -1) { //this type needs a closing --> so...
            var comment = this.get_unformatted('-->', tag_complete); //...delegate to get_unformatted
            content.push(comment);
          }
          this.tag_type = 'START';
        }
        else if (tag_check.indexOf('[endif') != -1) {//peek for <!--[endif end conditional comment
          this.tag_type = 'END';
          this.unindent();
        }
        else if (tag_check.indexOf('[cdata[') != -1) { //if it's a <[cdata[ comment...
          var comment = this.get_unformatted(']]>', tag_complete); //...delegate to get_unformatted function
          content.push(comment);
          this.tag_type = 'SINGLE'; //<![CDATA[ comments are treated like single tags
        }
        else {
          var comment = this.get_unformatted('-->', tag_complete);
          content.push(comment);
          this.tag_type = 'SINGLE';
        }
      }
      else {
        if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
          this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
          this.tag_type = 'END';
        }
        else { //otherwise it's a start-tag
          this.record_tag(tag_check); //push it on the tag stack
          this.tag_type = 'START';
        }
        if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
          this.print_newline(true, this.output);
        }
      }
      return content.join(''); //returns fully formatted tag
    }

    this.get_unformatted = function (delimiter, orig_tag) { //function to return unformatted content in its entirety

      if (orig_tag && orig_tag.indexOf(delimiter) != -1) {
        return '';
      }
      var input_char = '';
      var content = '';
      var space = true;
      do {

        if (this.pos >= this.input.length) {
          return content;
        }

        input_char = this.input.charAt(this.pos);
        this.pos++

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (!space) {
            this.line_char_count--;
            continue;
          }
          if (input_char === '\n' || input_char === '\r') {
            content += '\n';
            for (var i=0; i<this.indent_level; i++) {
              content += this.indent_string;
            }
            space = false; //...and make sure other indentation is erased
            this.line_char_count = 0;
            continue;
          }
        }
        content += input_char;
        this.line_char_count++;
        space = true;


      } while (content.indexOf(delimiter) == -1);
      return content;
    }

    this.get_token = function () { //initial handler for token-retrieval
      var token;

      if (this.last_token === 'TK_TAG_SCRIPT') { //check if we need to format javascript
        var temp_token = this.get_script();
        if (typeof temp_token !== 'string') {
          return temp_token;
        }
        token = js_beautify(temp_token, {
          'indent_size': this.indent_size,
          'indent_char': this.indent_character,
          'indent_level': this.indent_level,
          'brace_style': this.brace_style
        }); //call the JS Beautifier
        return [token.replace(/^[\t ]+/, ''), 'TK_CONTENT'];
      }
      if (this.current_mode === 'CONTENT') {
        token = this.get_content();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          return [token, 'TK_CONTENT'];
        }
      }

      if (this.current_mode === 'TAG') {
        token = this.get_tag();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          var tag_name_type = 'TK_TAG_' + this.tag_type;
          return [token, tag_name_type];
        }
      }
    }

    this.printer = function (js_source, indent_character, indent_size, max_char, brace_style) { //handles input/output and some other printing functions

      this.input = js_source || ''; //gets the input for the Parser
      this.output = [];
      this.indent_character = indent_character;
      this.indent_string = '';
      this.indent_size = indent_size;
      this.brace_style = brace_style;
      this.indent_level = 0;
      this.max_char = max_char;
      this.line_char_count = 0; //count to see if max_char was exceeded

      for (var i=0; i<this.indent_size; i++) {
        this.indent_string += this.indent_character;
      }

      this.print_newline = function (ignore, arr) {
        this.line_char_count = 0;
        if (!arr || !arr.length) {
          return;
        }
        if (!ignore) { //we might want the extra line
          while (this.Utils.in_array(arr[arr.length-1], this.Utils.whitespace)) {
            arr.pop();
          }
        }
        arr.push('\n');
        for (var i=0; i<this.indent_level; i++) {
          arr.push(this.indent_string);
        }
      }

      this.print_token = function (text) {
        this.output.push(text);
      }

      this.indent = function () {
        this.indent_level++;
      }

      this.unindent = function () {
        if (this.indent_level > 0) {
          this.indent_level--;
        }
      }
    }
    return this;
  }

  /*_____________________--------------------_____________________*/

  multi_parser = new Parser(); //wrapping functions Parser
  multi_parser.printer(html_source, indent_character, indent_size, 80, brace_style); //initialize starting values

  while (true) {
      var t = multi_parser.get_token();
      multi_parser.token_text = t[0];
      multi_parser.token_type = t[1];

    if (multi_parser.token_type === 'TK_EOF') {
      break;
    }

    switch (multi_parser.token_type) {
      case 'TK_TAG_START': case 'TK_TAG_SCRIPT': case 'TK_TAG_STYLE':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.indent();
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_END':
        multi_parser.print_newline(true, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_SINGLE':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_CONTENT':
        if (multi_parser.token_text !== '') {
          multi_parser.print_newline(false, multi_parser.output);
          multi_parser.print_token(multi_parser.token_text);
        }
        multi_parser.current_mode = 'TAG';
        break;
    }
    multi_parser.last_token = multi_parser.token_type;
    multi_parser.last_text = multi_parser.token_text;
  }
  return multi_parser.output.join('');
}
/*jslint onevar: false, plusplus: false */
/*

 JS Beautifier
---------------


  Written by Einar Lielmanis, <einar@jsbeautifier.org>
      http://jsbeautifier.org/

  Originally converted to javascript by Vital, <vital76@gmail.com>
  "End braces on own line" added by Chris J. Shull, <chrisjshull@gmail.com>

  You are free to use this in any way you want, in case you find this useful or working for you.

  Usage:
    js_beautify(js_source_text);
    js_beautify(js_source_text, options);

  The options are:
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    preserve_newlines (default true) — whether existing line breaks should be preserved,
    preserve_max_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,

    jslint_happy (default false) — if true, then jslint-stricter mode is enforced.

            jslint_happy   !jslint_happy
            ---------------------------------
             function ()      function()

    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.

    e.g

    js_beautify(js_source_text, {
      'indent_size': 1,
      'indent_char': '\t'
    });


*/



function js_beautify(js_source_text, options) {

    var input, output, token_text, last_type, last_text, last_last_text, last_word, flags, flag_store, indent_string;
    var whitespace, wordchar, punct, parser_pos, line_starters, digits;
    var prefix, token_type, do_block_just_closed;
    var wanted_newline, just_added_newline, n_newlines;
    var preindent_string = '';


    // Some interpreters have unexpected results with foo = baz || bar;
    options = options ? options : {};

    var opt_brace_style;

    // compatibility
    if (options.space_after_anon_function !== undefined && options.jslint_happy === undefined) {
        options.jslint_happy = options.space_after_anon_function;
    }
    if (options.braces_on_own_line !== undefined) { //graceful handling of depricated option
        opt_brace_style = options.braces_on_own_line ? "expand" : "collapse";
    }
    opt_brace_style = options.brace_style ? options.brace_style : (opt_brace_style ? opt_brace_style : "collapse");


    var opt_indent_size = options.indent_size ? options.indent_size : 2;
    var opt_indent_char = options.indent_char ? options.indent_char : ' ';
    var opt_preserve_newlines = typeof options.preserve_newlines === 'undefined' ? true : options.preserve_newlines;
    var opt_max_preserve_newlines = typeof options.max_preserve_newlines === 'undefined' ? false : options.max_preserve_newlines;
    var opt_jslint_happy = options.jslint_happy === 'undefined' ? false : options.jslint_happy;
    var opt_keep_array_indentation = typeof options.keep_array_indentation === 'undefined' ? false : options.keep_array_indentation;

    just_added_newline = false;

    // cache the source's length.
    var input_length = js_source_text.length;

    function trim_output(eat_newlines) {
        eat_newlines = typeof eat_newlines === 'undefined' ? false : eat_newlines;
        while (output.length && (output[output.length - 1] === ' '
            || output[output.length - 1] === indent_string
            || output[output.length - 1] === preindent_string
            || (eat_newlines && (output[output.length - 1] === '\n' || output[output.length - 1] === '\r')))) {
            output.pop();
        }
    }

    function trim(s) {
        return s.replace(/^\s\s*|\s\s*$/, '');
    }

    function force_newline()
    {
        var old_keep_array_indentation = opt_keep_array_indentation;
        opt_keep_array_indentation = false;
        print_newline()
        opt_keep_array_indentation = old_keep_array_indentation;
    }

    function print_newline(ignore_repeated) {

        flags.eat_next_space = false;
        if (opt_keep_array_indentation && is_array(flags.mode)) {
            return;
        }

        ignore_repeated = typeof ignore_repeated === 'undefined' ? true : ignore_repeated;

        flags.if_line = false;
        trim_output();

        if (!output.length) {
            return; // no newline on start of file
        }

        if (output[output.length - 1] !== "\n" || !ignore_repeated) {
            just_added_newline = true;
            output.push("\n");
        }
        if (preindent_string) {
            output.push(preindent_string);
        }
        for (var i = 0; i < flags.indentation_level; i += 1) {
            output.push(indent_string);
        }
        if (flags.var_line && flags.var_line_reindented) {
            if (opt_indent_char === ' ') {
                output.push('    '); // var_line always pushes 4 spaces, so that the variables would be one under another
            } else {
                output.push(indent_string); // skip space-stuffing, if indenting with a tab
            }
        }
    }



    function print_single_space() {
        if (flags.eat_next_space) {
            flags.eat_next_space = false;
            return;
        }
        var last_output = ' ';
        if (output.length) {
            last_output = output[output.length - 1];
        }
        if (last_output !== ' ' && last_output !== '\n' && last_output !== indent_string) { // prevent occassional duplicate space
            output.push(' ');
        }
    }


    function print_token() {
        just_added_newline = false;
        flags.eat_next_space = false;
        output.push(token_text);
    }

    function indent() {
        flags.indentation_level += 1;
    }


    function remove_indent() {
        if (output.length && output[output.length - 1] === indent_string) {
            output.pop();
        }
    }

    function set_mode(mode) {
        if (flags) {
            flag_store.push(flags);
        }
        flags = {
            previous_mode: flags ? flags.mode : 'BLOCK',
            mode: mode,
            var_line: false,
            var_line_tainted: false,
            var_line_reindented: false,
            in_html_comment: false,
            if_line: false,
            in_case: false,
            eat_next_space: false,
            indentation_baseline: -1,
            indentation_level: (flags ? flags.indentation_level + ((flags.var_line && flags.var_line_reindented) ? 1 : 0) : 0),
            ternary_depth: 0
        };
    }

    function is_array(mode) {
        return mode === '[EXPRESSION]' || mode === '[INDENTED-EXPRESSION]';
    }

    function is_expression(mode) {
        return mode === '[EXPRESSION]' || mode === '[INDENTED-EXPRESSION]' || mode === '(EXPRESSION)';
    }

    function restore_mode() {
        do_block_just_closed = flags.mode === 'DO_BLOCK';
        if (flag_store.length > 0) {
            flags = flag_store.pop();
        }
    }

    function all_lines_start_with(lines, c) {
        for (var i = 0; i < lines.length; i++) {
            if (trim(lines[i])[0] != c) {
                return false;
            }
        }
        return true;
    }

    function in_array(what, arr) {
        for (var i = 0; i < arr.length; i += 1) {
            if (arr[i] === what) {
                return true;
            }
        }
        return false;
    }

    function get_next_token() {
        n_newlines = 0;

        if (parser_pos >= input_length) {
            return ['', 'TK_EOF'];
        }

        wanted_newline = false;

        var c = input.charAt(parser_pos);
        parser_pos += 1;


        var keep_whitespace = opt_keep_array_indentation && is_array(flags.mode);

        if (keep_whitespace) {

            //
            // slight mess to allow nice preservation of array indentation and reindent that correctly
            // first time when we get to the arrays:
            // var a = [
            // ....'something'
            // we make note of whitespace_count = 4 into flags.indentation_baseline
            // so we know that 4 whitespaces in original source match indent_level of reindented source
            //
            // and afterwards, when we get to
            //    'something,
            // .......'something else'
            // we know that this should be indented to indent_level + (7 - indentation_baseline) spaces
            //
            var whitespace_count = 0;

            while (in_array(c, whitespace)) {

                if (c === "\n") {
                    trim_output();
                    output.push("\n");
                    just_added_newline = true;
                    whitespace_count = 0;
                } else {
                    if (c === '\t') {
                        whitespace_count += 4;
                    } else if (c === '\r') {
                        // nothing
                    } else {
                        whitespace_count += 1;
                    }
                }

                if (parser_pos >= input_length) {
                    return ['', 'TK_EOF'];
                }

                c = input.charAt(parser_pos);
                parser_pos += 1;

            }
            if (flags.indentation_baseline === -1) {
                flags.indentation_baseline = whitespace_count;
            }

            if (just_added_newline) {
                var i;
                for (i = 0; i < flags.indentation_level + 1; i += 1) {
                    output.push(indent_string);
                }
                if (flags.indentation_baseline !== -1) {
                    for (i = 0; i < whitespace_count - flags.indentation_baseline; i++) {
                        output.push(' ');
                    }
                }
            }

        } else {
            while (in_array(c, whitespace)) {

                if (c === "\n") {
                    n_newlines += ( (opt_max_preserve_newlines) ? (n_newlines <= opt_max_preserve_newlines) ? 1: 0: 1 );
                }


                if (parser_pos >= input_length) {
                    return ['', 'TK_EOF'];
                }

                c = input.charAt(parser_pos);
                parser_pos += 1;

            }

            if (opt_preserve_newlines) {
                if (n_newlines > 1) {
                    for (i = 0; i < n_newlines; i += 1) {
                        print_newline(i === 0);
                        just_added_newline = true;
                    }
                }
            }
            wanted_newline = n_newlines > 0;
        }


        if (in_array(c, wordchar)) {
            if (parser_pos < input_length) {
                while (in_array(input.charAt(parser_pos), wordchar)) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos === input_length) {
                        break;
                    }
                }
            }

            // small and surprisingly unugly hack for 1E-10 representation
            if (parser_pos !== input_length && c.match(/^[0-9]+[Ee]$/) && (input.charAt(parser_pos) === '-' || input.charAt(parser_pos) === '+')) {

                var sign = input.charAt(parser_pos);
                parser_pos += 1;

                var t = get_next_token(parser_pos);
                c += sign + t[0];
                return [c, 'TK_WORD'];
            }

            if (c === 'in') { // hack for 'in' operator
                return [c, 'TK_OPERATOR'];
            }
            if (wanted_newline && last_type !== 'TK_OPERATOR'
                && last_type !== 'TK_EQUALS'
                && !flags.if_line && (opt_preserve_newlines || last_text !== 'var')) {
                print_newline();
            }
            return [c, 'TK_WORD'];
        }

        if (c === '(' || c === '[') {
            return [c, 'TK_START_EXPR'];
        }

        if (c === ')' || c === ']') {
            return [c, 'TK_END_EXPR'];
        }

        if (c === '{') {
            return [c, 'TK_START_BLOCK'];
        }

        if (c === '}') {
            return [c, 'TK_END_BLOCK'];
        }

        if (c === ';') {
            return [c, 'TK_SEMICOLON'];
        }

        if (c === '/') {
            var comment = '';
            // peek for comment /* ... */
            var inline_comment = true;
            if (input.charAt(parser_pos) === '*') {
                parser_pos += 1;
                if (parser_pos < input_length) {
                    while (! (input.charAt(parser_pos) === '*' && input.charAt(parser_pos + 1) && input.charAt(parser_pos + 1) === '/') && parser_pos < input_length) {
                        c = input.charAt(parser_pos);
                        comment += c;
                        if (c === '\x0d' || c === '\x0a') {
                            inline_comment = false;
                        }
                        parser_pos += 1;
                        if (parser_pos >= input_length) {
                            break;
                        }
                    }
                }
                parser_pos += 2;
                if (inline_comment) {
                    return ['/*' + comment + '*/', 'TK_INLINE_COMMENT'];
                } else {
                    return ['/*' + comment + '*/', 'TK_BLOCK_COMMENT'];
                }
            }
            // peek for comment // ...
            if (input.charAt(parser_pos) === '/') {
                comment = c;
                while (input.charAt(parser_pos) !== '\r' && input.charAt(parser_pos) !== '\n') {
                    comment += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos >= input_length) {
                        break;
                    }
                }
                parser_pos += 1;
                if (wanted_newline) {
                    print_newline();
                }
                return [comment, 'TK_COMMENT'];
            }

        }

        if (c === "'" || // string
        c === '"' || // string
        (c === '/' &&
            ((last_type === 'TK_WORD' && in_array(last_text, ['return', 'do'])) ||
                (last_type === 'TK_COMMENT' || last_type === 'TK_START_EXPR' || last_type === 'TK_START_BLOCK' || last_type === 'TK_END_BLOCK' || last_type === 'TK_OPERATOR' || last_type === 'TK_EQUALS' || last_type === 'TK_EOF' || last_type === 'TK_SEMICOLON')))) { // regexp
            var sep = c;
            var esc = false;
            var resulting_string = c;

            if (parser_pos < input_length) {
                if (sep === '/') {
                    //
                    // handle regexp separately...
                    //
                    var in_char_class = false;
                    while (esc || in_char_class || input.charAt(parser_pos) !== sep) {
                        resulting_string += input.charAt(parser_pos);
                        if (!esc) {
                            esc = input.charAt(parser_pos) === '\\';
                            if (input.charAt(parser_pos) === '[') {
                                in_char_class = true;
                            } else if (input.charAt(parser_pos) === ']') {
                                in_char_class = false;
                            }
                        } else {
                            esc = false;
                        }
                        parser_pos += 1;
                        if (parser_pos >= input_length) {
                            // incomplete string/rexp when end-of-file reached.
                            // bail out with what had been received so far.
                            return [resulting_string, 'TK_STRING'];
                        }
                    }

                } else {
                    //
                    // and handle string also separately
                    //
                    while (esc || input.charAt(parser_pos) !== sep) {
                        resulting_string += input.charAt(parser_pos);
                        if (!esc) {
                            esc = input.charAt(parser_pos) === '\\';
                        } else {
                            esc = false;
                        }
                        parser_pos += 1;
                        if (parser_pos >= input_length) {
                            // incomplete string/rexp when end-of-file reached.
                            // bail out with what had been received so far.
                            return [resulting_string, 'TK_STRING'];
                        }
                    }
                }



            }

            parser_pos += 1;

            resulting_string += sep;

            if (sep === '/') {
                // regexps may have modifiers /regexp/MOD , so fetch those, too
                while (parser_pos < input_length && in_array(input.charAt(parser_pos), wordchar)) {
                    resulting_string += input.charAt(parser_pos);
                    parser_pos += 1;
                }
            }
            return [resulting_string, 'TK_STRING'];
        }

        if (c === '#') {


            if (output.length === 0 && input.charAt(parser_pos) === '!') {
                // shebang
                resulting_string = c;
                while (parser_pos < input_length && c != '\n') {
                    c = input.charAt(parser_pos);
                    resulting_string += c;
                    parser_pos += 1;
                }
                output.push(trim(resulting_string) + '\n');
                print_newline();
                return get_next_token();
            }



            // Spidermonkey-specific sharp variables for circular references
            // https://developer.mozilla.org/En/Sharp_variables_in_JavaScript
            // http://mxr.mozilla.org/mozilla-central/source/js/src/jsscan.cpp around line 1935
            var sharp = '#';
            if (parser_pos < input_length && in_array(input.charAt(parser_pos), digits)) {
                do {
                    c = input.charAt(parser_pos);
                    sharp += c;
                    parser_pos += 1;
                } while (parser_pos < input_length && c !== '#' && c !== '=');
                if (c === '#') {
                    //
                } else if (input.charAt(parser_pos) === '[' && input.charAt(parser_pos + 1) === ']') {
                    sharp += '[]';
                    parser_pos += 2;
                } else if (input.charAt(parser_pos) === '{' && input.charAt(parser_pos + 1) === '}') {
                    sharp += '{}';
                    parser_pos += 2;
                }
                return [sharp, 'TK_WORD'];
            }
        }

        if (c === '<' && input.substring(parser_pos - 1, parser_pos + 3) === '<!--') {
            parser_pos += 3;
            flags.in_html_comment = true;
            return ['<!--', 'TK_COMMENT'];
        }

        if (c === '-' && flags.in_html_comment && input.substring(parser_pos - 1, parser_pos + 2) === '-->') {
            flags.in_html_comment = false;
            parser_pos += 2;
            if (wanted_newline) {
                print_newline();
            }
            return ['-->', 'TK_COMMENT'];
        }

        if (in_array(c, punct)) {
            while (parser_pos < input_length && in_array(c + input.charAt(parser_pos), punct)) {
                c += input.charAt(parser_pos);
                parser_pos += 1;
                if (parser_pos >= input_length) {
                    break;
                }
            }

            if (c === '=') {
                return [c, 'TK_EQUALS'];
            } else {
                return [c, 'TK_OPERATOR'];
            }
        }

        return [c, 'TK_UNKNOWN'];
    }

    //----------------------------------
    indent_string = '';
    while (opt_indent_size > 0) {
        indent_string += opt_indent_char;
        opt_indent_size -= 1;
    }

    while (js_source_text && (js_source_text[0] === ' ' || js_source_text[0] === '\t')) {
        preindent_string += js_source_text[0];
        js_source_text = js_source_text.substring(1);
    }
    input = js_source_text;

    last_word = ''; // last 'TK_WORD' passed
    last_type = 'TK_START_EXPR'; // last token type
    last_text = ''; // last token text
    last_last_text = ''; // pre-last token text
    output = [];

    do_block_just_closed = false;

    whitespace = "\n\r\t ".split('');
    wordchar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$'.split('');
    digits = '0123456789'.split('');

    punct = '+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! !! , : ? ^ ^= |= ::'.split(' ');

    // words which should always start on new line.
    line_starters = 'continue,try,throw,return,var,if,switch,case,default,for,while,break,function'.split(',');

    // states showing if we are currently in expression (i.e. "if" case) - 'EXPRESSION', or in usual block (like, procedure), 'BLOCK'.
    // some formatting depends on that.
    flag_store = [];
    set_mode('BLOCK');

    parser_pos = 0;
    while (true) {
        var t = get_next_token(parser_pos);
        token_text = t[0];
        token_type = t[1];
        if (token_type === 'TK_EOF') {
            break;
        }

        switch (token_type) {

        case 'TK_START_EXPR':

            if (token_text === '[') {

                if (last_type === 'TK_WORD' || last_text === ')') {
                    // this is array index specifier, break immediately
                    // a[x], fn()[x]
                    if (in_array(last_text, line_starters)) {
                        print_single_space();
                    }
                    set_mode('(EXPRESSION)');
                    print_token();
                    break;
                }

                if (flags.mode === '[EXPRESSION]' || flags.mode === '[INDENTED-EXPRESSION]') {
                    if (last_last_text === ']' && last_text === ',') {
                        // ], [ goes to new line
                        if (flags.mode === '[EXPRESSION]') {
                            flags.mode = '[INDENTED-EXPRESSION]';
                            if (!opt_keep_array_indentation) {
                                indent();
                            }
                        }
                        set_mode('[EXPRESSION]');
                        if (!opt_keep_array_indentation) {
                            print_newline();
                        }
                    } else if (last_text === '[') {
                        if (flags.mode === '[EXPRESSION]') {
                            flags.mode = '[INDENTED-EXPRESSION]';
                            if (!opt_keep_array_indentation) {
                                indent();
                            }
                        }
                        set_mode('[EXPRESSION]');

                        if (!opt_keep_array_indentation) {
                            print_newline();
                        }
                    } else {
                        set_mode('[EXPRESSION]');
                    }
                } else {
                    set_mode('[EXPRESSION]');
                }



            } else {
                set_mode('(EXPRESSION)');
            }

            if (last_text === ';' || last_type === 'TK_START_BLOCK') {
                print_newline();
            } else if (last_type === 'TK_END_EXPR' || last_type === 'TK_START_EXPR' || last_type === 'TK_END_BLOCK' || last_text === '.') {
                // do nothing on (( and )( and ][ and ]( and .(
            } else if (last_type !== 'TK_WORD' && last_type !== 'TK_OPERATOR') {
                print_single_space();
            } else if (last_word === 'function' || last_word === 'typeof') {
                // function() vs function ()
                if (opt_jslint_happy) {
                    print_single_space();
                }
            } else if (in_array(last_text, line_starters) || last_text === 'catch') {
                print_single_space();
            }
            print_token();

            break;

        case 'TK_END_EXPR':
            if (token_text === ']') {
                if (opt_keep_array_indentation) {
                    if (last_text === '}') {
                        // trim_output();
                        // print_newline(true);
                        remove_indent();
                        print_token();
                        restore_mode();
                        break;
                    }
                } else {
                    if (flags.mode === '[INDENTED-EXPRESSION]') {
                        if (last_text === ']') {
                            restore_mode();
                            print_newline();
                            print_token();
                            break;
                        }
                    }
                }
            }
            restore_mode();
            print_token();
            break;

        case 'TK_START_BLOCK':

            if (last_word === 'do') {
                set_mode('DO_BLOCK');
            } else {
                set_mode('BLOCK');
            }
            if (opt_brace_style=="expand") {
                if (last_type !== 'TK_OPERATOR') {
                    if (last_text === 'return' || last_text === '=') {
                        print_single_space();
                    } else {
                        print_newline(true);
                    }
                }
                print_token();
                indent();
            } else {
                if (last_type !== 'TK_OPERATOR' && last_type !== 'TK_START_EXPR') {
                    if (last_type === 'TK_START_BLOCK') {
                        print_newline();
                    } else {
                        print_single_space();
                    }
                } else {
                    // if TK_OPERATOR or TK_START_EXPR
                    if (is_array(flags.previous_mode) && last_text === ',') {
                        if (last_last_text === '}') {
                            // }, { in array context
                            print_single_space();
                        } else {
                            print_newline(); // [a, b, c, {
                        }
                    }
                }
                indent();
                print_token();
            }

            break;

        case 'TK_END_BLOCK':
            restore_mode();
            if (opt_brace_style=="expand") {
                if (last_text !== '{') {
                    print_newline();
                }
                print_token();
            } else {
                if (last_type === 'TK_START_BLOCK') {
                    // nothing
                    if (just_added_newline) {
                        remove_indent();
                    } else {
                        // {}
                        trim_output();
                    }
                } else {
                    if (is_array(flags.mode) && opt_keep_array_indentation) {
                        // we REALLY need a newline here, but newliner would skip that
                        opt_keep_array_indentation = false;
                        print_newline();
                        opt_keep_array_indentation = true;

                    } else {
                        print_newline();
                    }
                }
                print_token();
            }
            break;

        case 'TK_WORD':

            // no, it's not you. even I have problems understanding how this works
            // and what does what.
            if (do_block_just_closed) {
                // do {} ## while ()
                print_single_space();
                print_token();
                print_single_space();
                do_block_just_closed = false;
                break;
            }

            if (token_text === 'function') {
                if (flags.var_line) {
                    flags.var_line_reindented = true;
                }
                if ((just_added_newline || last_text === ';') && last_text !== '{') {
                    // make sure there is a nice clean space of at least one blank line
                    // before a new function definition
                    n_newlines = just_added_newline ? n_newlines : 0;
                    if ( ! opt_preserve_newlines) {
                        n_newlines = 1;
                    }

                    for (var i = 0; i < 2 - n_newlines; i++) {
                        print_newline(false);
                    }
                }
            }

            if (token_text === 'case' || token_text === 'default') {
                if (last_text === ':') {
                    // switch cases following one another
                    remove_indent();
                } else {
                    // case statement starts in the same line where switch
                    flags.indentation_level--;
                    print_newline();
                    flags.indentation_level++;
                }
                print_token();
                flags.in_case = true;
                break;
            }

            prefix = 'NONE';

            if (last_type === 'TK_END_BLOCK') {

                if (!in_array(token_text.toLowerCase(), ['else', 'catch', 'finally'])) {
                    prefix = 'NEWLINE';
                } else {
                    if (opt_brace_style=="expand" || opt_brace_style=="end-expand") {
                        prefix = 'NEWLINE';
                    } else {
                        prefix = 'SPACE';
                        print_single_space();
                    }
                }
            } else if (last_type === 'TK_SEMICOLON' && (flags.mode === 'BLOCK' || flags.mode === 'DO_BLOCK')) {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_SEMICOLON' && is_expression(flags.mode)) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_STRING') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_WORD') {
                if (last_text === 'else') {
                    // eat newlines between ...else *** some_op...
                    // won't preserve extra newlines in this place (if any), but don't care that much
                    trim_output(true);
                }
                prefix = 'SPACE';
            } else if (last_type === 'TK_START_BLOCK') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_END_EXPR') {
                print_single_space();
                prefix = 'NEWLINE';
            }

            if (in_array(token_text, line_starters) && last_text !== ')') {
                if (last_text == 'else') {
                    prefix = 'SPACE';
                } else {
                    prefix = 'NEWLINE';
                }
            }

            if (flags.if_line && last_type === 'TK_END_EXPR') {
                flags.if_line = false;
            }
            if (in_array(token_text.toLowerCase(), ['else', 'catch', 'finally'])) {
                if (last_type !== 'TK_END_BLOCK' || opt_brace_style=="expand" || opt_brace_style=="end-expand") {
                    print_newline();
                } else {
                    trim_output(true);
                    print_single_space();
                }
            } else if (prefix === 'NEWLINE') {
                if ((last_type === 'TK_START_EXPR' || last_text === '=' || last_text === ',') && token_text === 'function') {
                    // no need to force newline on 'function': (function
                    // DONOTHING
                } else if (token_text === 'function' && last_text == 'new') {
                    print_single_space();
                } else if (last_text === 'return' || last_text === 'throw') {
                    // no newline between 'return nnn'
                    print_single_space();
                } else if (last_type !== 'TK_END_EXPR') {
                    if ((last_type !== 'TK_START_EXPR' || token_text !== 'var') && last_text !== ':') {
                        // no need to force newline on 'var': for (var x = 0...)
                        if (token_text === 'if' && last_word === 'else' && last_text !== '{') {
                            // no newline for } else if {
                            print_single_space();
                        } else {
                            flags.var_line = false;
                            flags.var_line_reindented = false;
                            print_newline();
                        }
                    }
                } else if (in_array(token_text, line_starters) && last_text != ')') {
                    flags.var_line = false;
                    flags.var_line_reindented = false;
                    print_newline();
                }
            } else if (is_array(flags.mode) && last_text === ',' && last_last_text === '}') {
                print_newline(); // }, in lists get a newline treatment
            } else if (prefix === 'SPACE') {
                print_single_space();
            }
            print_token();
            last_word = token_text;

            if (token_text === 'var') {
                flags.var_line = true;
                flags.var_line_reindented = false;
                flags.var_line_tainted = false;
            }

            if (token_text === 'if') {
                flags.if_line = true;
            }
            if (token_text === 'else') {
                flags.if_line = false;
            }

            break;

        case 'TK_SEMICOLON':

            print_token();
            flags.var_line = false;
            flags.var_line_reindented = false;
            if (flags.mode == 'OBJECT') {
                // OBJECT mode is weird and doesn't get reset too well.
                flags.mode = 'BLOCK';
            }
            break;

        case 'TK_STRING':

            if (last_type === 'TK_START_BLOCK' || last_type === 'TK_END_BLOCK' || last_type === 'TK_SEMICOLON') {
                print_newline();
            } else if (last_type === 'TK_WORD') {
                print_single_space();
            }
            print_token();
            break;

        case 'TK_EQUALS':
            if (flags.var_line) {
                // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
                flags.var_line_tainted = true;
            }
            print_single_space();
            print_token();
            print_single_space();
            break;

        case 'TK_OPERATOR':

            var space_before = true;
            var space_after = true;

            if (flags.var_line && token_text === ',' && (is_expression(flags.mode))) {
                // do not break on comma, for(var a = 1, b = 2)
                flags.var_line_tainted = false;
            }

            if (flags.var_line) {
                if (token_text === ',') {
                    if (flags.var_line_tainted) {
                        print_token();
                        flags.var_line_reindented = true;
                        flags.var_line_tainted = false;
                        print_newline();
                        break;
                    } else {
                        flags.var_line_tainted = false;
                    }
                // } else if (token_text === ':') {
                    // hmm, when does this happen? tests don't catch this
                    // flags.var_line = false;
                }
            }

            if (last_text === 'return' || last_text === 'throw') {
                // "return" had a special handling in TK_WORD. Now we need to return the favor
                print_single_space();
                print_token();
                break;
            }

            if (token_text === ':' && flags.in_case) {
                print_token(); // colon really asks for separate treatment
                print_newline();
                flags.in_case = false;
                break;
            }

            if (token_text === '::') {
                // no spaces around exotic namespacing syntax operator
                print_token();
                break;
            }

            if (token_text === ',') {
                if (flags.var_line) {
                    if (flags.var_line_tainted) {
                        print_token();
                        print_newline();
                        flags.var_line_tainted = false;
                    } else {
                        print_token();
                        print_single_space();
                    }
                } else if (last_type === 'TK_END_BLOCK' && flags.mode !== "(EXPRESSION)") {
                    print_token();
                    if (flags.mode === 'OBJECT' && last_text === '}') {
                        print_newline();
                    } else {
                        print_single_space();
                    }
                } else {
                    if (flags.mode === 'OBJECT') {
                        print_token();
                        print_newline();
                    } else {
                        // EXPR or DO_BLOCK
                        print_token();
                        print_single_space();
                    }
                }
                break;
            // } else if (in_array(token_text, ['--', '++', '!']) || (in_array(token_text, ['-', '+']) && (in_array(last_type, ['TK_START_BLOCK', 'TK_START_EXPR', 'TK_EQUALS']) || in_array(last_text, line_starters) || in_array(last_text, ['==', '!=', '+=', '-=', '*=', '/=', '+', '-'])))) {
            } else if (in_array(token_text, ['--', '++', '!']) || (in_array(token_text, ['-', '+']) && (in_array(last_type, ['TK_START_BLOCK', 'TK_START_EXPR', 'TK_EQUALS', 'TK_OPERATOR']) || in_array(last_text, line_starters)))) {
                // unary operators (and binary +/- pretending to be unary) special cases

                space_before = false;
                space_after = false;

                if (last_text === ';' && is_expression(flags.mode)) {
                    // for (;; ++i)
                    //        ^^^
                    space_before = true;
                }
                if (last_type === 'TK_WORD' && in_array(last_text, line_starters)) {
                    space_before = true;
                }

                if (flags.mode === 'BLOCK' && (last_text === '{' || last_text === ';')) {
                    // { foo; --i }
                    // foo(); --bar;
                    print_newline();
                }
            } else if (token_text === '.') {
                // decimal digits or object.property
                space_before = false;

            } else if (token_text === ':') {
                if (flags.ternary_depth == 0) {
                    flags.mode = 'OBJECT';
                    space_before = false;
                } else {
                    flags.ternary_depth -= 1;
                }
            } else if (token_text === '?') {
                flags.ternary_depth += 1;
            }
            if (space_before) {
                print_single_space();
            }

            print_token();

            if (space_after) {
                print_single_space();
            }

            if (token_text === '!') {
                // flags.eat_next_space = true;
            }

            break;

        case 'TK_BLOCK_COMMENT':

            var lines = token_text.split(/\x0a|\x0d\x0a/);

            if (all_lines_start_with(lines.slice(1), '*')) {
                // javadoc: reformat and reindent
                print_newline();
                output.push(lines[0]);
                for (i = 1; i < lines.length; i++) {
                    print_newline();
                    output.push(' ');
                    output.push(trim(lines[i]));
                }

            } else {

                // simple block comment: leave intact
                if (lines.length > 1) {
                    // multiline comment block starts with a new line
                    print_newline();
                    trim_output();
                } else {
                    // single-line /* comment */ stays where it is
                    print_single_space();

                }

                for (i = 0; i < lines.length; i++) {
                    output.push(lines[i]);
                    output.push('\n');
                }

            }
            print_newline();
            break;

        case 'TK_INLINE_COMMENT':

            print_single_space();
            print_token();
            if (is_expression(flags.mode)) {
                print_single_space();
            } else {
                force_newline();
            }
            break;

        case 'TK_COMMENT':

            // print_newline();
            if (wanted_newline) {
                print_newline();
            } else {
                print_single_space();
            }
            print_token();
            force_newline();
            break;

        case 'TK_UNKNOWN':
            if (last_text === 'return' || last_text === 'throw') {
                print_single_space();
            }
            print_token();
            break;
        }

        last_last_text = last_text;
        last_type = token_type;
        last_text = token_text;
    }

    var sweet_code = preindent_string + output.join('').replace(/[\n ]+$/, '');
    return sweet_code;

}

// Add support for CommonJS. Just put this file somewhere on your require.paths
// and you will be able to `var js_beautify = require("beautify").js_beautify`.
if (typeof exports !== "undefined")
    exports.js_beautify = js_beautify;
/* 
 * glMatrix.js - High performance matrix and vector operations for WebGL
 * version 0.9.6
 */
 
/*
 * Copyright (c) 2011 Brandon Jones
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

var glMatrixArrayType;

// Fallback for systems that don't support WebGL
if(typeof Float32Array != 'undefined') {
  glMatrixArrayType = Float32Array;
} else if(typeof WebGLFloatArray != 'undefined') {
  glMatrixArrayType = WebGLFloatArray; // This is officially deprecated and should dissapear in future revisions.
} else {
  glMatrixArrayType = Array;
}

/*
 * vec3 - 3 Dimensional Vector
 */
var vec3 = {};

/*
 * vec3.create
 * Creates a new instance of a vec3 using the default array type
 * Any javascript array containing at least 3 numeric elements can serve as a vec3
 *
 * Params:
 * vec - Optional, vec3 containing values to initialize with
 *
 * Returns:
 * New vec3
 */
vec3.create = function(vec) {
  var dest = new glMatrixArrayType(3);
  
  if(vec) {
    dest[0] = vec[0];
    dest[1] = vec[1];
    dest[2] = vec[2];
  }
  
  return dest;
};

/*
 * vec3.set
 * Copies the values of one vec3 to another
 *
 * Params:
 * vec - vec3 containing values to copy
 * dest - vec3 receiving copied values
 *
 * Returns:
 * dest
 */
vec3.set = function(vec, dest) {
  dest[0] = vec[0];
  dest[1] = vec[1];
  dest[2] = vec[2];
  
  return dest;
};

/*
 * vec3.add
 * Performs a vector addition
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.add = function(vec, vec2, dest) {
  if(!dest || vec == dest) {
    vec[0] += vec2[0];
    vec[1] += vec2[1];
    vec[2] += vec2[2];
    return vec;
  }
  
  dest[0] = vec[0] + vec2[0];
  dest[1] = vec[1] + vec2[1];
  dest[2] = vec[2] + vec2[2];
  return dest;
};

/*
 * vec3.subtract
 * Performs a vector subtraction
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.subtract = function(vec, vec2, dest) {
  if(!dest || vec == dest) {
    vec[0] -= vec2[0];
    vec[1] -= vec2[1];
    vec[2] -= vec2[2];
    return vec;
  }
  
  dest[0] = vec[0] - vec2[0];
  dest[1] = vec[1] - vec2[1];
  dest[2] = vec[2] - vec2[2];
  return dest;
};

/*
 * vec3.negate
 * Negates the components of a vec3
 *
 * Params:
 * vec - vec3 to negate
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.negate = function(vec, dest) {
  if(!dest) { dest = vec; }
  
  dest[0] = -vec[0];
  dest[1] = -vec[1];
  dest[2] = -vec[2];
  return dest;
};

/*
 * vec3.scale
 * Multiplies the components of a vec3 by a scalar value
 *
 * Params:
 * vec - vec3 to scale
 * val - Numeric value to scale by
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.scale = function(vec, val, dest) {
  if(!dest || vec == dest) {
    vec[0] *= val;
    vec[1] *= val;
    vec[2] *= val;
    return vec;
  }
  
  dest[0] = vec[0]*val;
  dest[1] = vec[1]*val;
  dest[2] = vec[2]*val;
  return dest;
};

/*
 * vec3.normalize
 * Generates a unit vector of the same direction as the provided vec3
 * If vector length is 0, returns [0, 0, 0]
 *
 * Params:
 * vec - vec3 to normalize
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.normalize = function(vec, dest) {
  if(!dest) { dest = vec; }
  
  var x = vec[0], y = vec[1], z = vec[2];
  var len = Math.sqrt(x*x + y*y + z*z);
  
  if (!len) {
    dest[0] = 0;
    dest[1] = 0;
    dest[2] = 0;
    return dest;
  } else if (len == 1) {
    dest[0] = x;
    dest[1] = y;
    dest[2] = z;
    return dest;
  }
  
  len = 1 / len;
  dest[0] = x*len;
  dest[1] = y*len;
  dest[2] = z*len;
  return dest;
};

/*
 * vec3.cross
 * Generates the cross product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.cross = function(vec, vec2, dest){
  if(!dest) { dest = vec; }
  
  var x = vec[0], y = vec[1], z = vec[2];
  var x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];
  
  dest[0] = y*z2 - z*y2;
  dest[1] = z*x2 - x*z2;
  dest[2] = x*y2 - y*x2;
  return dest;
};

/*
 * vec3.length
 * Caclulates the length of a vec3
 *
 * Params:
 * vec - vec3 to calculate length of
 *
 * Returns:
 * Length of vec
 */
vec3.length = function(vec){
  var x = vec[0], y = vec[1], z = vec[2];
  return Math.sqrt(x*x + y*y + z*z);
};

/*
 * vec3.dot
 * Caclulates the dot product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 *
 * Returns:
 * Dot product of vec and vec2
 */
vec3.dot = function(vec, vec2){
  return vec[0]*vec2[0] + vec[1]*vec2[1] + vec[2]*vec2[2];
};

/*
 * vec3.direction
 * Generates a unit vector pointing from one vector to another
 *
 * Params:
 * vec - origin vec3
 * vec2 - vec3 to point to
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.direction = function(vec, vec2, dest) {
  if(!dest) { dest = vec; }
  
  var x = vec[0] - vec2[0];
  var y = vec[1] - vec2[1];
  var z = vec[2] - vec2[2];
  
  var len = Math.sqrt(x*x + y*y + z*z);
  if (!len) { 
    dest[0] = 0; 
    dest[1] = 0; 
    dest[2] = 0;
    return dest; 
  }
  
  len = 1 / len;
  dest[0] = x * len; 
  dest[1] = y * len; 
  dest[2] = z * len;
  return dest; 
};

/*
 * vec3.lerp
 * Performs a linear interpolation between two vec3
 *
 * Params:
 * vec - vec3, first vector
 * vec2 - vec3, second vector
 * lerp - interpolation amount between the two inputs
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.lerp = function(vec, vec2, lerp, dest){
    if(!dest) { dest = vec; }
    
    dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
    dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
    dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);
    
    return dest;
}

/*
 * vec3.str
 * Returns a string representation of a vector
 *
 * Params:
 * vec - vec3 to represent as a string
 *
 * Returns:
 * string representation of vec
 */
vec3.str = function(vec) {
  return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']'; 
};

/*
 * mat3 - 3x3 Matrix
 */
var mat3 = {};

/*
 * mat3.create
 * Creates a new instance of a mat3 using the default array type
 * Any javascript array containing at least 9 numeric elements can serve as a mat3
 *
 * Params:
 * mat - Optional, mat3 containing values to initialize with
 *
 * Returns:
 * New mat3
 */
mat3.create = function(mat) {
  var dest = new glMatrixArrayType(9);
  
  if(mat) {
    dest[0] = mat[0];
    dest[1] = mat[1];
    dest[2] = mat[2];
    dest[3] = mat[3];
    dest[4] = mat[4];
    dest[5] = mat[5];
    dest[6] = mat[6];
    dest[7] = mat[7];
    dest[8] = mat[8];
  }
  
  return dest;
};

/*
 * mat3.set
 * Copies the values of one mat3 to another
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - mat3 receiving copied values
 *
 * Returns:
 * dest
 */
mat3.set = function(mat, dest) {
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[3];
  dest[4] = mat[4];
  dest[5] = mat[5];
  dest[6] = mat[6];
  dest[7] = mat[7];
  dest[8] = mat[8];
  return dest;
};

/*
 * mat3.identity
 * Sets a mat3 to an identity matrix
 *
 * Params:
 * dest - mat3 to set
 *
 * Returns:
 * dest
 */
mat3.identity = function(dest) {
  dest[0] = 1;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 1;
  dest[5] = 0;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = 1;
  return dest;
};

/*
 * mat4.transpose
 * Transposes a mat3 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat3 to transpose
 * dest - Optional, mat3 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat3.transpose = function(mat, dest) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if(!dest || mat == dest) { 
    var a01 = mat[1], a02 = mat[2];
    var a12 = mat[5];
    
        mat[1] = mat[3];
        mat[2] = mat[6];
        mat[3] = a01;
        mat[5] = mat[7];
        mat[6] = a02;
        mat[7] = a12;
    return mat;
  }
  
  dest[0] = mat[0];
  dest[1] = mat[3];
  dest[2] = mat[6];
  dest[3] = mat[1];
  dest[4] = mat[4];
  dest[5] = mat[7];
  dest[6] = mat[2];
  dest[7] = mat[5];
  dest[8] = mat[8];
  return dest;
};

/*
 * mat3.toMat4
 * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat3.toMat4 = function(mat, dest) {
  if(!dest) { dest = mat4.create(); }
  
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = 0;

  dest[4] = mat[3];
  dest[5] = mat[4];
  dest[6] = mat[5];
  dest[7] = 0;

  dest[8] = mat[6];
  dest[9] = mat[7];
  dest[10] = mat[8];
  dest[11] = 0;

  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  
  return dest;
}

/*
 * mat3.str
 * Returns a string representation of a mat3
 *
 * Params:
 * mat - mat3 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat3.str = function(mat) {
  return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + 
    ', ' + mat[3] + ', '+ mat[4] + ', ' + mat[5] + 
    ', ' + mat[6] + ', ' + mat[7] + ', '+ mat[8] + ']';
};

/*
 * mat4 - 4x4 Matrix
 */
var mat4 = {};

/*
 * mat4.create
 * Creates a new instance of a mat4 using the default array type
 * Any javascript array containing at least 16 numeric elements can serve as a mat4
 *
 * Params:
 * mat - Optional, mat4 containing values to initialize with
 *
 * Returns:
 * New mat4
 */
mat4.create = function(mat) {
  var dest = new glMatrixArrayType(16);
  
  if(mat) {
    dest[0] = mat[0];
    dest[1] = mat[1];
    dest[2] = mat[2];
    dest[3] = mat[3];
    dest[4] = mat[4];
    dest[5] = mat[5];
    dest[6] = mat[6];
    dest[7] = mat[7];
    dest[8] = mat[8];
    dest[9] = mat[9];
    dest[10] = mat[10];
    dest[11] = mat[11];
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  return dest;
};

/*
 * mat4.set
 * Copies the values of one mat4 to another
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - mat4 receiving copied values
 *
 * Returns:
 * dest
 */
mat4.set = function(mat, dest) {
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[3];
  dest[4] = mat[4];
  dest[5] = mat[5];
  dest[6] = mat[6];
  dest[7] = mat[7];
  dest[8] = mat[8];
  dest[9] = mat[9];
  dest[10] = mat[10];
  dest[11] = mat[11];
  dest[12] = mat[12];
  dest[13] = mat[13];
  dest[14] = mat[14];
  dest[15] = mat[15];
  return dest;
};

/*
 * mat4.identity
 * Sets a mat4 to an identity matrix
 *
 * Params:
 * dest - mat4 to set
 *
 * Returns:
 * dest
 */
mat4.identity = function(dest) {
  dest[0] = 1;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 0;
  dest[5] = 1;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = 0;
  dest[9] = 0;
  dest[10] = 1;
  dest[11] = 0;
  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  return dest;
};

/*
 * mat4.transpose
 * Transposes a mat4 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat4 to transpose
 * dest - Optional, mat4 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.transpose = function(mat, dest) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if(!dest || mat == dest) { 
    var a01 = mat[1], a02 = mat[2], a03 = mat[3];
    var a12 = mat[6], a13 = mat[7];
    var a23 = mat[11];
    
    mat[1] = mat[4];
    mat[2] = mat[8];
    mat[3] = mat[12];
    mat[4] = a01;
    mat[6] = mat[9];
    mat[7] = mat[13];
    mat[8] = a02;
    mat[9] = a12;
    mat[11] = mat[14];
    mat[12] = a03;
    mat[13] = a13;
    mat[14] = a23;
    return mat;
  }
  
  dest[0] = mat[0];
  dest[1] = mat[4];
  dest[2] = mat[8];
  dest[3] = mat[12];
  dest[4] = mat[1];
  dest[5] = mat[5];
  dest[6] = mat[9];
  dest[7] = mat[13];
  dest[8] = mat[2];
  dest[9] = mat[6];
  dest[10] = mat[10];
  dest[11] = mat[14];
  dest[12] = mat[3];
  dest[13] = mat[7];
  dest[14] = mat[11];
  dest[15] = mat[15];
  return dest;
};

/*
 * mat4.determinant
 * Calculates the determinant of a mat4
 *
 * Params:
 * mat - mat4 to calculate determinant of
 *
 * Returns:
 * determinant of mat
 */
mat4.determinant = function(mat) {
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

  return  a30*a21*a12*a03 - a20*a31*a12*a03 - a30*a11*a22*a03 + a10*a31*a22*a03 +
      a20*a11*a32*a03 - a10*a21*a32*a03 - a30*a21*a02*a13 + a20*a31*a02*a13 +
      a30*a01*a22*a13 - a00*a31*a22*a13 - a20*a01*a32*a13 + a00*a21*a32*a13 +
      a30*a11*a02*a23 - a10*a31*a02*a23 - a30*a01*a12*a23 + a00*a31*a12*a23 +
      a10*a01*a32*a23 - a00*a11*a32*a23 - a20*a11*a02*a33 + a10*a21*a02*a33 +
      a20*a01*a12*a33 - a00*a21*a12*a33 - a10*a01*a22*a33 + a00*a11*a22*a33;
};

/*
 * mat4.inverse
 * Calculates the inverse matrix of a mat4
 *
 * Params:
 * mat - mat4 to calculate inverse of
 * dest - Optional, mat4 receiving inverse matrix. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.inverse = function(mat, dest) {
  if(!dest) { dest = mat; }
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
  
  var b00 = a00*a11 - a01*a10;
  var b01 = a00*a12 - a02*a10;
  var b02 = a00*a13 - a03*a10;
  var b03 = a01*a12 - a02*a11;
  var b04 = a01*a13 - a03*a11;
  var b05 = a02*a13 - a03*a12;
  var b06 = a20*a31 - a21*a30;
  var b07 = a20*a32 - a22*a30;
  var b08 = a20*a33 - a23*a30;
  var b09 = a21*a32 - a22*a31;
  var b10 = a21*a33 - a23*a31;
  var b11 = a22*a33 - a23*a32;
  
  // Calculate the determinant (inlined to avoid double-caching)
  var invDet = 1/(b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);
  
  dest[0] = (a11*b11 - a12*b10 + a13*b09)*invDet;
  dest[1] = (-a01*b11 + a02*b10 - a03*b09)*invDet;
  dest[2] = (a31*b05 - a32*b04 + a33*b03)*invDet;
  dest[3] = (-a21*b05 + a22*b04 - a23*b03)*invDet;
  dest[4] = (-a10*b11 + a12*b08 - a13*b07)*invDet;
  dest[5] = (a00*b11 - a02*b08 + a03*b07)*invDet;
  dest[6] = (-a30*b05 + a32*b02 - a33*b01)*invDet;
  dest[7] = (a20*b05 - a22*b02 + a23*b01)*invDet;
  dest[8] = (a10*b10 - a11*b08 + a13*b06)*invDet;
  dest[9] = (-a00*b10 + a01*b08 - a03*b06)*invDet;
  dest[10] = (a30*b04 - a31*b02 + a33*b00)*invDet;
  dest[11] = (-a20*b04 + a21*b02 - a23*b00)*invDet;
  dest[12] = (-a10*b09 + a11*b07 - a12*b06)*invDet;
  dest[13] = (a00*b09 - a01*b07 + a02*b06)*invDet;
  dest[14] = (-a30*b03 + a31*b01 - a32*b00)*invDet;
  dest[15] = (a20*b03 - a21*b01 + a22*b00)*invDet;
  
  return dest;
};

/*
 * mat4.toRotationMat
 * Copies the upper 3x3 elements of a mat4 into another mat4
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat4 otherwise
 */
mat4.toRotationMat = function(mat, dest) {
  if(!dest) { dest = mat4.create(); }
  
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[3];
  dest[4] = mat[4];
  dest[5] = mat[5];
  dest[6] = mat[6];
  dest[7] = mat[7];
  dest[8] = mat[8];
  dest[9] = mat[9];
  dest[10] = mat[10];
  dest[11] = mat[11];
  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  
  return dest;
};

/*
 * mat4.toMat3
 * Copies the upper 3x3 elements of a mat4 into a mat3
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat3 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toMat3 = function(mat, dest) {
  if(!dest) { dest = mat3.create(); }
  
  dest[0] = mat[0];
  dest[1] = mat[1];
  dest[2] = mat[2];
  dest[3] = mat[4];
  dest[4] = mat[5];
  dest[5] = mat[6];
  dest[6] = mat[8];
  dest[7] = mat[9];
  dest[8] = mat[10];
  
  return dest;
};

/*
 * mat4.toInverseMat3
 * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
 * The resulting matrix is useful for calculating transformed normals
 *
 * Params:
 * mat - mat4 containing values to invert and copy
 * dest - Optional, mat3 receiving values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toInverseMat3 = function(mat, dest) {
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10];
  
  var b01 = a22*a11-a12*a21;
  var b11 = -a22*a10+a12*a20;
  var b21 = a21*a10-a11*a20;
    
  var d = a00*b01 + a01*b11 + a02*b21;
  if (!d) { return null; }
  var id = 1/d;
  
  if(!dest) { dest = mat3.create(); }
  
  dest[0] = b01*id;
  dest[1] = (-a22*a01 + a02*a21)*id;
  dest[2] = (a12*a01 - a02*a11)*id;
  dest[3] = b11*id;
  dest[4] = (a22*a00 - a02*a20)*id;
  dest[5] = (-a12*a00 + a02*a10)*id;
  dest[6] = b21*id;
  dest[7] = (-a21*a00 + a01*a20)*id;
  dest[8] = (a11*a00 - a01*a10)*id;
  
  return dest;
};

/*
 * mat4.multiply
 * Performs a matrix multiplication
 *
 * Params:
 * mat - mat4, first operand
 * mat2 - mat4, second operand
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.multiply = function(mat, mat2, dest) {
  if(!dest) { dest = mat }
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
  
  var b00 = mat2[0], b01 = mat2[1], b02 = mat2[2], b03 = mat2[3];
  var b10 = mat2[4], b11 = mat2[5], b12 = mat2[6], b13 = mat2[7];
  var b20 = mat2[8], b21 = mat2[9], b22 = mat2[10], b23 = mat2[11];
  var b30 = mat2[12], b31 = mat2[13], b32 = mat2[14], b33 = mat2[15];
  
  dest[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
  dest[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
  dest[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
  dest[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
  dest[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
  dest[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
  dest[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
  dest[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
  dest[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
  dest[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
  dest[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
  dest[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
  dest[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
  dest[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
  dest[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
  dest[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;
  
  return dest;
};

/*
 * mat4.multiplyVec3
 * Transforms a vec3 with the given matrix
 * 4th vector component is implicitly '1'
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec3 = function(mat, vec, dest) {
  if(!dest) { dest = vec }
  
  var x = vec[0], y = vec[1], z = vec[2];
  
  dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
  dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
  dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
  
  return dest;
};

/*
 * mat4.multiplyVec4
 * Transforms a vec4 with the given matrix
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec4 to transform
 * dest - Optional, vec4 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec4 = function(mat, vec, dest) {
  if(!dest) { dest = vec }
  
  var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
  
  dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12]*w;
  dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13]*w;
  dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14]*w;
  dest[3] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15]*w;
  
  return dest;
};

/*
 * mat4.translate
 * Translates a matrix by the given vector
 *
 * Params:
 * mat - mat4 to translate
 * vec - vec3 specifying the translation
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.translate = function(mat, vec, dest) {
  var x = vec[0], y = vec[1], z = vec[2];
  
  if(!dest || mat == dest) {
    mat[12] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
    mat[13] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
    mat[14] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
    mat[15] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15];
    return mat;
  }
  
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  
  dest[0] = a00;
  dest[1] = a01;
  dest[2] = a02;
  dest[3] = a03;
  dest[4] = a10;
  dest[5] = a11;
  dest[6] = a12;
  dest[7] = a13;
  dest[8] = a20;
  dest[9] = a21;
  dest[10] = a22;
  dest[11] = a23;
  
  dest[12] = a00*x + a10*y + a20*z + mat[12];
  dest[13] = a01*x + a11*y + a21*z + mat[13];
  dest[14] = a02*x + a12*y + a22*z + mat[14];
  dest[15] = a03*x + a13*y + a23*z + mat[15];
  return dest;
};

/*
 * mat4.scale
 * Scales a matrix by the given vector
 *
 * Params:
 * mat - mat4 to scale
 * vec - vec3 specifying the scale for each axis
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.scale = function(mat, vec, dest) {
  var x = vec[0], y = vec[1], z = vec[2];
  
  if(!dest || mat == dest) {
    mat[0] *= x;
    mat[1] *= x;
    mat[2] *= x;
    mat[3] *= x;
    mat[4] *= y;
    mat[5] *= y;
    mat[6] *= y;
    mat[7] *= y;
    mat[8] *= z;
    mat[9] *= z;
    mat[10] *= z;
    mat[11] *= z;
    return mat;
  }
  
  dest[0] = mat[0]*x;
  dest[1] = mat[1]*x;
  dest[2] = mat[2]*x;
  dest[3] = mat[3]*x;
  dest[4] = mat[4]*y;
  dest[5] = mat[5]*y;
  dest[6] = mat[6]*y;
  dest[7] = mat[7]*y;
  dest[8] = mat[8]*z;
  dest[9] = mat[9]*z;
  dest[10] = mat[10]*z;
  dest[11] = mat[11]*z;
  dest[12] = mat[12];
  dest[13] = mat[13];
  dest[14] = mat[14];
  dest[15] = mat[15];
  return dest;
};

/*
 * mat4.rotate
 * Rotates a matrix by the given angle around the specified axis
 * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * axis - vec3 representing the axis to rotate around 
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotate = function(mat, angle, axis, dest) {
  var x = axis[0], y = axis[1], z = axis[2];
  var len = Math.sqrt(x*x + y*y + z*z);
  if (!len) { return null; }
  if (len != 1) {
    len = 1 / len;
    x *= len; 
    y *= len; 
    z *= len;
  }
  
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  var t = 1-c;
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  
  // Construct the elements of the rotation matrix
  var b00 = x*x*t + c, b01 = y*x*t + z*s, b02 = z*x*t - y*s;
  var b10 = x*y*t - z*s, b11 = y*y*t + c, b12 = z*y*t + x*s;
  var b20 = x*z*t + y*s, b21 = y*z*t - x*s, b22 = z*z*t + c;
  
  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform rotation-specific matrix multiplication
  dest[0] = a00*b00 + a10*b01 + a20*b02;
  dest[1] = a01*b00 + a11*b01 + a21*b02;
  dest[2] = a02*b00 + a12*b01 + a22*b02;
  dest[3] = a03*b00 + a13*b01 + a23*b02;
  
  dest[4] = a00*b10 + a10*b11 + a20*b12;
  dest[5] = a01*b10 + a11*b11 + a21*b12;
  dest[6] = a02*b10 + a12*b11 + a22*b12;
  dest[7] = a03*b10 + a13*b11 + a23*b12;
  
  dest[8] = a00*b20 + a10*b21 + a20*b22;
  dest[9] = a01*b20 + a11*b21 + a21*b22;
  dest[10] = a02*b20 + a12*b21 + a22*b22;
  dest[11] = a03*b20 + a13*b21 + a23*b22;
  return dest;
};

/*
 * mat4.rotateX
 * Rotates a matrix by the given angle around the X axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateX = function(mat, angle, dest) {
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  
  // Cache the matrix values (makes for huge speed increases!)
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
    dest[0] = mat[0];
    dest[1] = mat[1];
    dest[2] = mat[2];
    dest[3] = mat[3];
    
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform axis-specific matrix multiplication
  dest[4] = a10*c + a20*s;
  dest[5] = a11*c + a21*s;
  dest[6] = a12*c + a22*s;
  dest[7] = a13*c + a23*s;
  
  dest[8] = a10*-s + a20*c;
  dest[9] = a11*-s + a21*c;
  dest[10] = a12*-s + a22*c;
  dest[11] = a13*-s + a23*c;
  return dest;
};

/*
 * mat4.rotateY
 * Rotates a matrix by the given angle around the Y axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateY = function(mat, angle, dest) {
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
  
  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
    dest[4] = mat[4];
    dest[5] = mat[5];
    dest[6] = mat[6];
    dest[7] = mat[7];
    
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform axis-specific matrix multiplication
  dest[0] = a00*c + a20*-s;
  dest[1] = a01*c + a21*-s;
  dest[2] = a02*c + a22*-s;
  dest[3] = a03*c + a23*-s;
  
  dest[8] = a00*s + a20*c;
  dest[9] = a01*s + a21*c;
  dest[10] = a02*s + a22*c;
  dest[11] = a03*s + a23*c;
  return dest;
};

/*
 * mat4.rotateZ
 * Rotates a matrix by the given angle around the Z axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateZ = function(mat, angle, dest) {
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  
  // Cache the matrix values (makes for huge speed increases!)
  var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
  var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
  
  if(!dest) { 
    dest = mat 
  } else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
    dest[8] = mat[8];
    dest[9] = mat[9];
    dest[10] = mat[10];
    dest[11] = mat[11];
    
    dest[12] = mat[12];
    dest[13] = mat[13];
    dest[14] = mat[14];
    dest[15] = mat[15];
  }
  
  // Perform axis-specific matrix multiplication
  dest[0] = a00*c + a10*s;
  dest[1] = a01*c + a11*s;
  dest[2] = a02*c + a12*s;
  dest[3] = a03*c + a13*s;
  
  dest[4] = a00*-s + a10*c;
  dest[5] = a01*-s + a11*c;
  dest[6] = a02*-s + a12*c;
  dest[7] = a03*-s + a13*c;
  
  return dest;
};

/*
 * mat4.frustum
 * Generates a frustum matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.frustum = function(left, right, bottom, top, near, far, dest) {
  if(!dest) { dest = mat4.create(); }
  var rl = (right - left);
  var tb = (top - bottom);
  var fn = (far - near);
  dest[0] = (near*2) / rl;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 0;
  dest[5] = (near*2) / tb;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = (right + left) / rl;
  dest[9] = (top + bottom) / tb;
  dest[10] = -(far + near) / fn;
  dest[11] = -1;
  dest[12] = 0;
  dest[13] = 0;
  dest[14] = -(far*near*2) / fn;
  dest[15] = 0;
  return dest;
};

/*
 * mat4.perspective
 * Generates a perspective projection matrix with the given bounds
 *
 * Params:
 * fovy - scalar, vertical field of view
 * aspect - scalar, aspect ratio. typically viewport width/height
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.perspective = function(fovy, aspect, near, far, dest, flip) {
  var top = near*Math.tan(fovy*Math.PI / 360.0);
  var right = top*aspect;
  return mat4.frustum(-right, right, -top * (flip ? -1 : 1), top * (flip ? -1 : 1), near, far, dest);
};

/*
 * mat4.ortho
 * Generates a orthogonal projection matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.ortho = function(left, right, bottom, top, near, far, dest) {
  if(!dest) { dest = mat4.create(); }
  var rl = (right - left);
  var tb = (top - bottom);
  var fn = (far - near);
  dest[0] = 2 / rl;
  dest[1] = 0;
  dest[2] = 0;
  dest[3] = 0;
  dest[4] = 0;
  dest[5] = 2 / tb;
  dest[6] = 0;
  dest[7] = 0;
  dest[8] = 0;
  dest[9] = 0;
  dest[10] = -2 / fn;
  dest[11] = 0;
  dest[12] = -(left + right) / rl;
  dest[13] = -(top + bottom) / tb;
  dest[14] = -(far + near) / fn;
  dest[15] = 1;
  return dest;
};

/*
 * mat4.ortho
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * Params:
 * eye - vec3, position of the viewer
 * center - vec3, point the viewer is looking at
 * up - vec3 pointing "up"
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.lookAt = function(eye, center, up, dest) {
  if(!dest) { dest = mat4.create(); }
  
  var eyex = eye[0],
    eyey = eye[1],
    eyez = eye[2],
    upx = up[0],
    upy = up[1],
    upz = up[2],
    centerx = center[0],
    centery = center[1],
    centerz = center[2];

  if (eyex == centerx && eyey == centery && eyez == centerz) {
    return mat4.identity(dest);
  }
  
  var z0,z1,z2,x0,x1,x2,y0,y1,y2,len;
  
  //vec3.direction(eye, center, z);
  z0 = eyex - center[0];
  z1 = eyey - center[1];
  z2 = eyez - center[2];
  
  // normalize (no check needed for 0 because of early return)
  len = 1/Math.sqrt(z0*z0 + z1*z1 + z2*z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  
  //vec3.normalize(vec3.cross(up, z, x));
  x0 = upy*z2 - upz*z1;
  x1 = upz*z0 - upx*z2;
  x2 = upx*z1 - upy*z0;
  len = Math.sqrt(x0*x0 + x1*x1 + x2*x2);
  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1/len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  };
  
  //vec3.normalize(vec3.cross(z, x, y));
  y0 = z1*x2 - z2*x1;
  y1 = z2*x0 - z0*x2;
  y2 = z0*x1 - z1*x0;
  
  len = Math.sqrt(y0*y0 + y1*y1 + y2*y2);
  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1/len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }
  
  dest[0] = x0;
  dest[1] = y0;
  dest[2] = z0;
  dest[3] = 0;
  dest[4] = x1;
  dest[5] = y1;
  dest[6] = z1;
  dest[7] = 0;
  dest[8] = x2;
  dest[9] = y2;
  dest[10] = z2;
  dest[11] = 0;
  dest[12] = -(x0*eyex + x1*eyey + x2*eyez);
  dest[13] = -(y0*eyex + y1*eyey + y2*eyez);
  dest[14] = -(z0*eyex + z1*eyey + z2*eyez);
  dest[15] = 1;
  
  return dest;
};

/*
 * mat4.str
 * Returns a string representation of a mat4
 *
 * Params:
 * mat - mat4 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat4.str = function(mat) {
  return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + 
    ', '+ mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] + 
    ', '+ mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] + 
    ', '+ mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
};

/*
 * quat4 - Quaternions 
 */
var quat4 = {};

/*
 * quat4.create
 * Creates a new instance of a quat4 using the default array type
 * Any javascript array containing at least 4 numeric elements can serve as a quat4
 *
 * Params:
 * quat - Optional, quat4 containing values to initialize with
 *
 * Returns:
 * New quat4
 */
quat4.create = function(quat) {
  var dest = new glMatrixArrayType(4);
  
  if(quat) {
    dest[0] = quat[0];
    dest[1] = quat[1];
    dest[2] = quat[2];
    dest[3] = quat[3];
  }
  
  return dest;
};

/*
 * quat4.set
 * Copies the values of one quat4 to another
 *
 * Params:
 * quat - quat4 containing values to copy
 * dest - quat4 receiving copied values
 *
 * Returns:
 * dest
 */
quat4.set = function(quat, dest) {
  dest[0] = quat[0];
  dest[1] = quat[1];
  dest[2] = quat[2];
  dest[3] = quat[3];
  
  return dest;
};

/*
 * quat4.calculateW
 * Calculates the W component of a quat4 from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length. 
 * Any existing W component will be ignored. 
 *
 * Params:
 * quat - quat4 to calculate W component of
 * dest - Optional, quat4 receiving calculated values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.calculateW = function(quat, dest) {
  var x = quat[0], y = quat[1], z = quat[2];

  if(!dest || quat == dest) {
    quat[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
    return quat;
  }
  dest[0] = x;
  dest[1] = y;
  dest[2] = z;
  dest[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
  return dest;
}

/*
 * quat4.inverse
 * Calculates the inverse of a quat4
 *
 * Params:
 * quat - quat4 to calculate inverse of
 * dest - Optional, quat4 receiving inverse values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.inverse = function(quat, dest) {
  if(!dest || quat == dest) {
    quat[0] *= -1;
    quat[1] *= -1;
    quat[2] *= -1;
    return quat;
  }
  dest[0] = -quat[0];
  dest[1] = -quat[1];
  dest[2] = -quat[2];
  dest[3] = quat[3];
  return dest;
}

/*
 * quat4.length
 * Calculates the length of a quat4
 *
 * Params:
 * quat - quat4 to calculate length of
 *
 * Returns:
 * Length of quat
 */
quat4.length = function(quat) {
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
  return Math.sqrt(x*x + y*y + z*z + w*w);
}

/*
 * quat4.normalize
 * Generates a unit quaternion of the same direction as the provided quat4
 * If quaternion length is 0, returns [0, 0, 0, 0]
 *
 * Params:
 * quat - quat4 to normalize
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.normalize = function(quat, dest) {
  if(!dest) { dest = quat; }
  
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
  var len = Math.sqrt(x*x + y*y + z*z + w*w);
  if(len == 0) {
    dest[0] = 0;
    dest[1] = 0;
    dest[2] = 0;
    dest[3] = 0;
    return dest;
  }
  len = 1/len;
  dest[0] = x * len;
  dest[1] = y * len;
  dest[2] = z * len;
  dest[3] = w * len;
  
  return dest;
}

/*
 * quat4.multiply
 * Performs a quaternion multiplication
 *
 * Params:
 * quat - quat4, first operand
 * quat2 - quat4, second operand
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.multiply = function(quat, quat2, dest) {
  if(!dest) { dest = quat; }
  
  var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3];
  var qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];
  
  dest[0] = qax*qbw + qaw*qbx + qay*qbz - qaz*qby;
  dest[1] = qay*qbw + qaw*qby + qaz*qbx - qax*qbz;
  dest[2] = qaz*qbw + qaw*qbz + qax*qby - qay*qbx;
  dest[3] = qaw*qbw - qax*qbx - qay*qby - qaz*qbz;
  
  return dest;
}

/*
 * quat4.multiplyVec3
 * Transforms a vec3 with the given quaternion
 *
 * Params:
 * quat - quat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
quat4.multiplyVec3 = function(quat, vec, dest) {
  if(!dest) { dest = vec; }
  
  var x = vec[0], y = vec[1], z = vec[2];
  var qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3];

  // calculate quat * vec
  var ix = qw*x + qy*z - qz*y;
  var iy = qw*y + qz*x - qx*z;
  var iz = qw*z + qx*y - qy*x;
  var iw = -qx*x - qy*y - qz*z;
  
  // calculate result * inverse quat
  dest[0] = ix*qw + iw*-qx + iy*-qz - iz*-qy;
  dest[1] = iy*qw + iw*-qy + iz*-qx - ix*-qz;
  dest[2] = iz*qw + iw*-qz + ix*-qy - iy*-qx;
  
  return dest;
}

/*
 * quat4.toMat3
 * Calculates a 3x3 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat3 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat3 otherwise
 */
quat4.toMat3 = function(quat, dest) {
  if(!dest) { dest = mat3.create(); }
  
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;

  var xx = x*x2;
  var xy = x*y2;
  var xz = x*z2;

  var yy = y*y2;
  var yz = y*z2;
  var zz = z*z2;

  var wx = w*x2;
  var wy = w*y2;
  var wz = w*z2;

  dest[0] = 1 - (yy + zz);
  dest[1] = xy - wz;
  dest[2] = xz + wy;

  dest[3] = xy + wz;
  dest[4] = 1 - (xx + zz);
  dest[5] = yz - wx;

  dest[6] = xz - wy;
  dest[7] = yz + wx;
  dest[8] = 1 - (xx + yy);
  
  return dest;
}

/*
 * quat4.toMat4
 * Calculates a 4x4 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat4 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
quat4.toMat4 = function(quat, dest) {
  if(!dest) { dest = mat4.create(); }
  
  var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;

  var xx = x*x2;
  var xy = x*y2;
  var xz = x*z2;

  var yy = y*y2;
  var yz = y*z2;
  var zz = z*z2;

  var wx = w*x2;
  var wy = w*y2;
  var wz = w*z2;

  dest[0] = 1 - (yy + zz);
  dest[1] = xy - wz;
  dest[2] = xz + wy;
  dest[3] = 0;

  dest[4] = xy + wz;
  dest[5] = 1 - (xx + zz);
  dest[6] = yz - wx;
  dest[7] = 0;

  dest[8] = xz - wy;
  dest[9] = yz + wx;
  dest[10] = 1 - (xx + yy);
  dest[11] = 0;

  dest[12] = 0;
  dest[13] = 0;
  dest[14] = 0;
  dest[15] = 1;
  
  return dest;
}

/*
 * quat4.slerp
 * Performs a spherical linear interpolation between two quat4
 *
 * Params:
 * quat - quat4, first quaternion
 * quat2 - quat4, second quaternion
 * slerp - interpolation amount between the two inputs
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.slerp = function(quat, quat2, slerp, dest) {
    if(!dest) { dest = quat; }
    
  var cosHalfTheta =  quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
  
  if (Math.abs(cosHalfTheta) >= 1.0){
      if(dest != quat) {
        dest[0] = quat[0];
        dest[1] = quat[1];
        dest[2] = quat[2];
        dest[3] = quat[3];
    }
    return dest;
  }
  
  var halfTheta = Math.acos(cosHalfTheta);
  var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);

  if (Math.abs(sinHalfTheta) < 0.001){
    dest[0] = (quat[0]*0.5 + quat2[0]*0.5);
    dest[1] = (quat[1]*0.5 + quat2[1]*0.5);
    dest[2] = (quat[2]*0.5 + quat2[2]*0.5);
    dest[3] = (quat[3]*0.5 + quat2[3]*0.5);
    return dest;
  }
  
  var ratioA = Math.sin((1 - slerp)*halfTheta) / sinHalfTheta;
  var ratioB = Math.sin(slerp*halfTheta) / sinHalfTheta; 
  
  dest[0] = (quat[0]*ratioA + quat2[0]*ratioB);
  dest[1] = (quat[1]*ratioA + quat2[1]*ratioB);
  dest[2] = (quat[2]*ratioA + quat2[2]*ratioB);
  dest[3] = (quat[3]*ratioA + quat2[3]*ratioB);
  
  return dest;
}


/*
 * quat4.str
 * Returns a string representation of a quaternion
 *
 * Params:
 * quat - quat4 to represent as a string
 *
 * Returns:
 * string representation of quat
 */
quat4.str = function(quat) {
  return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']'; 
}

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
var EXPORTED_SYMBOLS = ["Tilt.Cube"];

/**
 * Tilt.Cube constructor.
 *
 * @param {Number} width: the width of the cube
 * @param {Number} height: the height of the cube
 * @param {Number} depth: the depth of the cube
 * @return {Tilt.Cube} the newly created object
 */
Tilt.Cube = function(width, height, depth) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Cube", this);

  // make sure the width, height and depth are valid number values
  width = width || 1;
  height = height || 1;
  depth = depth || 1;

  /**
   * Buffer of 3-component vertices (x, y, z) as the corners of a cube.
   */
  this.vertices = new Tilt.VertexBuffer([
    -0.5 * width, -0.5 * height,  0.5 * depth, /* front */
     0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth, /* bottom */
     0.5 * width,  0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width, -0.5 * height, -0.5 * depth, /* back */
    -0.5 * width, -0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
    -0.5 * width, -0.5 * height, -0.5 * depth, /* top */
     0.5 * width, -0.5 * height, -0.5 * depth,
     0.5 * width, -0.5 * height,  0.5 * depth,
    -0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width, -0.5 * height,  0.5 * depth, /* right */
     0.5 * width, -0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width, -0.5 * height, -0.5 * depth, /* left */
    -0.5 * width, -0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth], 3);

  /**
   * Buffer of 2-component texture coordinates (u, v) for the cube.
   */
  this.texCoord = new Tilt.VertexBuffer([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1], 2);

  /**
   * Vertex indices for the cube vertices, defining the order for which
   * these points can create a cube from triangles.
   */
  this.indices = new Tilt.IndexBuffer([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23]);
};

Tilt.Cube.prototype = {

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.CubeWireframe"];

/**
 * Tilt.CubeWireframe constructor.
 *
 * @param {Number} width: the width of the cube
 * @param {Number} height: the height of the cube
 * @param {Number} depth: the depth of the cube
 * @return {Tilt.CubeWireframe} the newly created object
 */
Tilt.CubeWireframe = function(width, height, depth) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.CubeWireframe", this);

  // make sure the width, height and depth are valid number values
  width = width || 1;
  height = height || 1;
  depth = depth || 1;

  /**
   * Buffer of 3-component vertices (x, y, z) as the outline of a cube.
   */
  this.vertices = new Tilt.VertexBuffer([
    -0.5 * width, -0.5 * height,  0.5 * depth, /* front */
     0.5 * width, -0.5 * height,  0.5 * depth,
     0.5 * width,  0.5 * height,  0.5 * depth,
    -0.5 * width,  0.5 * height,  0.5 * depth,
     0.5 * width, -0.5 * height, -0.5 * depth, /* back */
    -0.5 * width, -0.5 * height, -0.5 * depth,
    -0.5 * width,  0.5 * height, -0.5 * depth,
     0.5 * width,  0.5 * height, -0.5 * depth], 3);

  /**
   * Vertex indices for the cube vertices, defining the order for which
   * these points can create a wireframe cube from lines.
   */
  this.indices = new Tilt.IndexBuffer([
    0, 1, 1, 2, 2, 3, 3, 0, /* front */
    4, 5, 5, 6, 6, 7, 7, 4, /* back */
    0, 5, 1, 4,
    2, 7, 3, 6]);
};

Tilt.CubeWireframe.prototype = {

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.Rectangle"];

/**
 * Tilt.Rectangle constructor.
 * @return {Tilt.Rectangle} the newly created object
 */
Tilt.Rectangle = function() {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Rectangle", this);

  /**
   * Buffer of 2-component vertices (x, y) as the corners of a rectangle.
   */
  this.vertices = new Tilt.VertexBuffer([0, 0, 1, 0, 0, 1, 1, 1], 2);

  /**
   * Buffer of 2-component texture coordinates (u, v) for the rectangle.
   */
  this.texCoord = new Tilt.VertexBuffer([0, 0, 1, 0, 0, 1, 1, 1], 2);
};

Tilt.Rectangle.prototype = {

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.RectangleWireframe"];

/**
 * Tilt.RectangleWireframe constructor.
 * @return {Tilt.RectangleWireframe} the newly created object
 */
Tilt.RectangleWireframe = function() {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.RectangleWireframe", this);

  /**
   * Buffer of 2-component vertices (x, y) as the outline of a rectangle.
   */
  this.vertices = new Tilt.VertexBuffer([0, 0, 1, 0, 1, 1, 0, 1], 2);
};

Tilt.RectangleWireframe.prototype = {

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.Mesh"];

/**
 * Mesh constructor.
 *
 * @param {Object} parameters: an object containing the following properties
 *  @param {Tilt.VertexBuffer} vertices: the vertices buffer (x, y and z)
 *  @param {Tilt.VertexBuffer} texCoord: the texture coordinates buffer (u, v)
 *  @param {Tilt.VertexBuffer} normals: the normals buffer (m, n, p)
 *  @param {Tilt.IndexBuffer} indices: indices for the passed vertices buffer
 *  @param {String} color: the color to be used by the shader if required
 *  @param {Tilt.Texture} texture: optional texture to be used by the shader
 *  @param {Number} drawMode: WebGL enum, like tilt.TRIANGLES
 *  @param {Function} draw: optional function to handle custom drawing
 * @return {Tilt.Mesh} the newly created object
 */
Tilt.Mesh = function(parameters) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Mesh", this);

  /**
   * Retain each parameter for easy access.
   */
  for (var i in parameters) {
    if (this[i] !== "draw") {
      this[i] = parameters[i];
    }
  }

  // the color should be [r, g, b, a] array, check this now
  if ("undefined" === typeof this.color) {
    this.color = [1, 1, 1, 1];
  }

  // the draw mode should be valid, default to TRIANGLES if unspecified
  if ("undefined" === typeof this.drawMode) {
    this.drawMode = Tilt.$renderer.TRIANGLES;
  }

  // if the draw call is specified in the constructor, overwrite directly
  if ("function" === typeof parameters.draw) {
    this.draw = parameters.draw;
  }
};

Tilt.Mesh.prototype = {

  /**
   * Draws a custom mesh, using only the built-in shaders.
   * For more complex techniques, create your own shaders and drawing logic.
   * Overwrite this function to handle custom drawing.
   */
  draw: function() {
    // cache some properties for easy access
    var tilt = Tilt.$renderer,
      vertices = this.vertices,
      texCoord = this.texCoord,
      normals = this.normals,
      indices = this.indices,
      color = this.color,
      texture = this.texture,
      drawMode = this.drawMode;

    // use the necessary shader
    if (texture) {
      tilt.useTextureShader(vertices, texCoord, color, texture);
    }
    else {
      tilt.useColorShader(vertices, color);
    }

    // draw the vertices as indexed elements or simple arrays
    if (indices) {
      tilt.drawIndexedVertices(drawMode, indices);
    }
    else {
      tilt.drawVertices(drawMode, vertices.numItems);
    }
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.Mesh"];

/**
 * Saves the mesh as a .obj file to be used with an external editor.
 *
 * @param {String} directory: the directory to save the mesh into
 * @param {String} name: the mesh name
 */
Tilt.Mesh.prototype.save = function(directory, name) {
  var output = [],
    material = [],
    v = this.vertices.components,
    t = this.texCoord.components,
    f = this.indices.components,
    i, j, k, len, str, s;

  output.push("mtllib " + name + ".mtl",
              "usemtl webpage");

  material.push("newmtl webpage",
                "illum 2",
                "Ka 1.000 1.000 1.000",
                "Kd 1.000 1.000 1.000",
                "Ks 0.000 0.000 0.000",
                "map_Ka " + name + ".png",
                "map_Kd " + name + ".png",
                "map_Ks " + name + ".png");

  for (i = 0, len = v.length; i < len; i += 3) {
    output.push("v " + (v[i    ] / +100) + " " +
                       (v[i + 1] / -100) + " " +
                       (v[i + 2] / +100));
  }
  for (i = 0, len = t.length; i < len; i += 2) {
    output.push("vt " + (    t[i    ]) + " " +
                        (1 - t[i + 1]));
  }
  for (i = 0, len = f.length; i < len; i += 3) {
    output.push("f " + (f[i    ] + 1) + "/" + (f[i    ] + 1) + " " +
                       (f[i + 1] + 1) + "/" + (f[i + 1] + 1) + " " +
                       (f[i + 2] + 1) + "/" + (f[i + 2] + 1));
  }

  s = Tilt.File.separator;
  Tilt.File.save(output.join("\n"), directory + s + name + ".obj");
  Tilt.File.save(material.join("\n"), directory + s + name + ".mtl");
};
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
var EXPORTED_SYMBOLS = ["Tilt.Renderer"];

/*global vec3, mat3, mat4, quat4 */

/**
 * Tilt.Renderer constructor.
 *
 * @param {HTMLCanvasElement} canvas: the canvas element used for rendering
 * @param {Object} properties: additional properties for this object
 *  @param {Function} onsuccess: to be called if initialization worked
 *  @param {Function} onfail: to be called if initialization failed
 * @return {Tilt.Renderer} the newly created object
 */
Tilt.Renderer = function(canvas, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Renderer", this);

  // make sure the properties parameter is a valid object
  properties = properties || {};

  /**
   * The WebGL context obtained from the canvas element, used for drawing.
   */
  this.canvas = canvas;
  this.gl = this.create3DContext(canvas);

  // first, clear the cache
  Tilt.clearCache();
  Tilt.$gl = this.gl;
  Tilt.$renderer = this;

  // check if the context was created successfully
  if ("undefined" !== typeof this.gl && this.gl !== null) {

    // if successful, run a success callback function if available
    if ("function" === typeof properties.onsuccess) {
      properties.onsuccess();
    }

    // set up some global enums
    this.TRIANGLES = this.gl.TRIANGLES;
    this.TRIANGLE_STRIP = this.gl.TRIANGLE_STRIP;
    this.TRIANGLE_FAN = this.gl.TRIANGLE_FAN;
    this.LINES = this.gl.LINES;
    this.LINE_STRIP = this.gl.LINE_STRIP;
    this.LINE_LOOP = this.gl.LINE_LOOP;
    this.POINTS = this.gl.POINTS;
    this.COLOR_BUFFER_BIT = this.gl.COLOR_BUFFER_BIT;
    this.DEPTH_BUFFER_BIT = this.gl.DEPTH_BUFFER_BIT;
    this.STENCIL_BUFFER_BIT = this.gl.STENCIL_BUFFER_BIT;

    // set the default clear color and depth buffers
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clearDepth(1);
  }
  else {
    // if unsuccessful, log the error and run a fail callback if available
    Tilt.Console.log(Tilt.StringBundle.get("initWebGL.error"));

    if ("function" === typeof properties.onfail) {
      properties.onfail();
      return;
    }
  }

  /**
   * Helpers for managing variables like frameCount, frameRate, frameDelta,
   * used internally, in the requestAnimFrame function.
   */
  this.$lastTime = 0;
  this.$currentTime = null;

  /**
   * Time passed since initialization.
   */
  this.elapsedTime = 0;

  /**
   * Counter for the number of frames passed since initialization.
   */
  this.frameCount = 0;

  /**
   * Variable retaining the current frame rate.
   */
  this.frameRate = 0;

  /**
   * Variable representing the delta time elapsed between frames.
   * Use this to create smooth animations regardless of the frame rate.
   */
  this.frameDelta = 0;

  /**
   * Variables representing the current framebuffer width and height.
   */
  this.width = canvas.width;
  this.height = canvas.height;

  /**
   * A model view matrix stack, used for push/pop operations.
   */
  this.mvMatrixStack = [];

  /**
   * The current model view matrix;
   */
  this.mvMatrix = mat4.identity(mat4.create());

  /**
   * The current projection matrix;
   */
  this.projMatrix = mat4.identity(mat4.create());

  /**
   * The current clear color used to clear the color buffer bit.
   */
  this.$clearColor = [0, 0, 0, 0];

  /**
   * The current tint color applied to any objects which can be tinted.
   * These mostly represent images or primitives which are textured.
   */
  this.$tintColor = [1, 1, 1, 1];

  /**
   * The current fill color applied to any objects which can be filled.
   * These are rectangles, circles, boxes, 2d or 3d primitives in general.
   */
  this.$fillColor = [1, 1, 1, 1];

  /**
   * The current stroke color applied to any objects which can be stroked.
   * This property mostly refers to lines.
   */
  this.$strokeColor = [0, 0, 0, 1];

  /**
   * Variable representing the current stroke weight.
   */
  this.$strokeWeightValue = 1;

  /**
   * A shader useful for drawing vertices with only a color component.
   */
  this.colorShader = new Tilt.Program(
    Tilt.Shaders.Color.vs, Tilt.Shaders.Color.fs);

  /**
   * A shader useful for drawing vertices with both a color component and
   * texture coordinates.
   */
  this.textureShader = new Tilt.Program(
    Tilt.Shaders.Texture.vs, Tilt.Shaders.Texture.fs);

  /**
   * Vertices buffer representing the corners of a rectangle.
   */
  this.$rectangle = new Tilt.Rectangle();
  this.$rectangleWireframe = new Tilt.RectangleWireframe();

  /**
   * Vertices buffer representing the corners of a cube.
   */
  this.$cube = new Tilt.Cube();
  this.$cubeWireframe = new Tilt.CubeWireframe();

  // set the default model view and projection matrices
  this.origin();
  this.perspective();

  // set the default tint, fill, stroke and other visual properties
  this.defaults();

  // cleanup
  canvas = null;
  properties = null;
};

Tilt.Renderer.prototype = {

  /**
   * Clears the color and depth buffers to a specific color.
   * The color components are represented in the 0..1 range.
   *
   * @param {Number} r: the red component of the clear color
   * @param {Number} g: the green component of the clear color
   * @param {Number} b: the blue component of the clear color
   * @param {Number} a: the alpha component of the clear color
   */
  clear: function(r, g, b, a) {
    // cache some variables for easy access
    var col = this.$clearColor,
      gl = this.gl;

    if (col[0] !== r || col[1] !== g || col[2] !== b || col[3] !== a) {
      col[0] = r;
      col[1] = g;
      col[2] = b;
      col[3] = a;
      gl.clearColor(r, g, b, a);

      r *= 255;
      g *= 255;
      b *= 255;
      a *= 255;
      this.canvas.setAttribute("style", [
        "background: rgba(", r, ", ", g, ", ", b, ", ", a, "); ",
        "width: 100%; height: 100%;"].join(""));
    }

    // clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  },

  /**
   * Clears the canvas context (usually at the beginning of each frame).
   * If the color is undefined, it will default to opaque black.
   * It is not recommended but possible to pass a number as a parameter,
   * in which case the color will be [n, n, n, 255], or directly an array of
   * [r, g, b, a] values, all in the 0..255 interval.
   *
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  background: function(color) {
    var rgba;

    if ("string" === typeof color) {
      rgba = Tilt.Math.hex2rgba(color);
    }
    else if ("undefined" === typeof color) {
      rgba = [0, 0, 0, 1];
    }
    else if ("number" === typeof color) {
      rgba = [color / 255, color / 255, color / 255, 1];
    }
    else {
      rgba = [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
    }

    // clear the color and depth buffers
    this.clear(rgba[0], rgba[1], rgba[2], rgba[3]);
  },

  /**
   * Sets a default perspective projection, with the near frustum rectangle
   * mapped to the canvas width and height bounds.
   */
  perspective: function() {
    var fov = 45,
      w = this.width,
      h = this.height,
      x = w / 2,
      y = h / 2,
      z = y / Math.tan(Tilt.Math.radians(45) / 2),
      znear = z / 10,
      zfar = z * 10,
      aspect = w / h;

    mat4.perspective(fov, aspect, znear, zfar, this.projMatrix, true);
    mat4.translate(this.projMatrix, [-x, -y, -z]);
    mat4.identity(this.mvMatrix);
    this.depthTest(true);
  },

  /**
   * Sets a default orthographic projection (recommended for 2d rendering).
   */
  ortho: function() {
    var clip = 1000000;

    mat4.ortho(0, this.width, this.height, 0, -clip, clip, this.projMatrix);
    mat4.translate(this.projMatrix, [0, 0, -clip + 1]);
    mat4.identity(this.mvMatrix);
    this.depthTest(false);
  },

  /**
   * Sets a custom projection matrix.
   * @param {Array} matrix: the custom projection matrix to be used
   */
  projection: function(matrix) {
    mat4.set(matrix, this.projMatrix);
  },

  /**
   * Pushes the current model view matrix on a stack, to be popped out later.
   * This can be used, for example, to create complex animations and be able
   * to revert back to the current model view.
   */
  pushMatrix: function() {
    this.mvMatrixStack.push(mat4.create(this.mvMatrix));
  },

  /**
   * Pops an existing model view matrix from stack.
   * Use this only after pushMatrix() has been previously called.
   */
  popMatrix: function() {
    if (this.mvMatrixStack.length > 0) {
      this.mvMatrix = this.mvMatrixStack.pop();
    }
  },

  /**
   * Resets the model view matrix to identity.
   * This is a default matrix with no rotation, no scaling, at (0, 0, 0);
   */
  origin: function() {
    mat4.identity(this.mvMatrix);
  },

  /**
   * Transforms the model view matrix with a new matrix.
   * Useful for creating custom transformations.
   *
   * @param {Array} matrix: the matrix to be multiply the model view with
   */
  transform: function(matrix) {
    mat4.multiply(this.mvMatrix, matrix);
  },

  /**
   * Translates the model view by the x, y and z coordinates.
   *
   * @param {Number} x: the x amount of translation
   * @param {Number} y: the y amount of translation
   * @param {Number} z: the z amount of translation
   */
  translate: function(x, y, z) {
    mat4.translate(this.mvMatrix, [x, y, z || 0]);
  },

  /**
   * Rotates the model view by a specified angle on the x, y and z axis.
   *
   * @param {Number} angle: the angle expressed in radians
   * @param {Number} x: the x axis of the rotation
   * @param {Number} y: the y axis of the rotation
   * @param {Number} z: the z axis of the rotation
   */
  rotate: function(angle, x, y, z) {
    mat4.rotate(this.mvMatrix, angle, [x, y, z]);
  },

  /**
   * Rotates the model view by a specified angle on the x axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateX: function(angle) {
    mat4.rotateX(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the y axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateY: function(angle) {
    mat4.rotateY(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the z axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateZ: function(angle) {
    mat4.rotateZ(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by specified angles on the x, y, and z axis.
   *
   * @param {Number} x: the x axis rotation
   * @param {Number} y: the y axis rotation
   * @param {Number} z: the z axis rotation
   */
  rotateXYZ: function(x, y, z) {
    mat4.rotateX(this.mvMatrix, x);
    mat4.rotateY(this.mvMatrix, y);
    mat4.rotateZ(this.mvMatrix, z);
  },

  /**
   * Scales the model view by the x, y and z coordinates.
   *
   * @param {Number} x: the x amount of scaling
   * @param {Number} y: the y amount of scaling
   * @param {Number} z: the z amount of scaling
   */
  scale: function(x, y, z) {
    mat4.scale(this.mvMatrix, [x, y, z || 0]);
  },

  /**
   * Sets the current tint color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  tint: function(color) {
    var rgba = Tilt.Math.hex2rgba(color),
      tint = this.$tintColor;

    tint[0] = rgba[0];
    tint[1] = rgba[1];
    tint[2] = rgba[2];
    tint[3] = rgba[3];
  },

  /**
   * Disables the current tint color value.
   */
  noTint: function() {
    var tint = this.$tintColor;
    tint[0] = 1;
    tint[1] = 1;
    tint[2] = 1;
    tint[3] = 1;
  },

  /**
   * Sets the current fill color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  fill: function(color) {
    var rgba = Tilt.Math.hex2rgba(color),
      fill = this.$fillColor;

    fill[0] = rgba[0];
    fill[1] = rgba[1];
    fill[2] = rgba[2];
    fill[3] = rgba[3];
  },

  /**
   * Disables the current fill color value.
   */
  noFill: function() {
    var fill = this.$fillColor;
    fill[0] = 0;
    fill[1] = 0;
    fill[2] = 0;
    fill[3] = 0;
  },

  /**
   * Sets the current stroke color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  stroke: function(color) {
    var rgba = Tilt.Math.hex2rgba(color),
      stroke = this.$strokeColor;

    stroke[0] = rgba[0];
    stroke[1] = rgba[1];
    stroke[2] = rgba[2];
    stroke[3] = rgba[3];
  },

  /**
   * Disables the current stroke color value.
   */
  noStroke: function() {
    var stroke = this.$strokeColor;
    stroke[0] = 0;
    stroke[1] = 0;
    stroke[2] = 0;
    stroke[3] = 0;
  },

  /**
   * Sets the current stroke weight (line width).
   * @param {Number} weight: the stroke weight
   */
  strokeWeight: function(value) {
    if (this.$strokeWeightValue !== value) {
      this.$strokeWeightValue = value;
      this.gl.lineWidth(value);
    }
  },

  /**
   * Sets blending, either "alpha" or "add" (additive blending).
   * Anything else disables blending.
   *
   * @param {String} mode: blending, either "alpha", "add" or falsy
   */
  blendMode: function(mode) {
    var gl = this.gl;

    if ("alpha" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    else if ("add" === mode || "additive" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }
    else {
      gl.disable(gl.BLEND);
    }
  },

  /**
   * Sets if depth testing should be enabled or not.
   * Disabling could be useful when handling transparency (for example).
   *
   * @param {Boolean} enabled: true if depth testing should be enabled
   */
  depthTest: function(enabled) {
    var gl = this.gl;

    if (enabled) {
      gl.enable(gl.DEPTH_TEST);
    }
    else {
      gl.disable(gl.DEPTH_TEST);
    }
  },

  /**
   * Sets if stencil testing should be enabled or not.
   * @param {Boolean} enabled: true if stencil testing should be enabled
   */
  stencilTest: function(enabled) {
    var gl = this.gl;

    if (enabled) {
      gl.enable(gl.STENCIL_TEST);
    }
    else {
      gl.disable(gl.STENCIL_TEST);
    }
  },

  /**
   * Resets the drawing style to default.
   */
  defaults: function(depthTest, blendMode) {
    this.tint("#fff");
    this.fill("#fff");
    this.stroke("#000");
    this.strokeWeight(1);
    this.depthTest(true);
    this.stencilTest(false);
    this.blendMode("alpha");
  },

  /**
   * Helper function to set active the color shader with required params.
   *
   * @param {Tilt.VertexBuffer} verticesBuffer: a buffer of vertices positions
   * @param {Array} color: the color used, as [r, g, b, a] with 0..1 range
   */
  useColorShader: function(vertices, color) {
    var program = this.colorShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", vertices);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
  },

  /**
   * Helper function to set active the texture shader with required params.
   *
   * @param {Tilt.VertexBuffer} verticesBuffer: a buffer of vertices positions
   * @param {Tilt.VertexBuffer} texCoordBuffer: a buffer of texture coords
   * @param {Array} color: the color used, as [r, g, b, a] with 0..1 range
   * @param {Tilt.Texture} texture: the texture to be applied
   */
  useTextureShader: function(vertices, texCoord, color, texture) {
    var program = this.textureShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", vertices);
    program.bindVertexBuffer("vertexTexCoord", texCoord);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
    program.bindTexture("sampler", texture);
  },

  /**
   * Draw a single triangle.
   * Do not abuse this function, it is quite slow, use for debugging only!
   *
   * @param {Array} v0: the [x, y, z] position of the first triangle point
   * @param {Array} v1: the [x, y, z] position of the second triangle point
   * @param {Array} v2: the [x, y, z] position of the third triangle point
   */
  triangle: function(v0, v1, v2) {
    var fill = this.$fillColor,
      stroke = this.$strokeColor,
      vertices = new Tilt.VertexBuffer([v0[0], v0[1], v0[2] || 0,
                                        v1[0], v1[1], v1[2] || 0,
                                        v2[0], v2[1], v2[2] || 0], 3);

    // draw the triangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, stroke);
      this.drawVertices(this.LINE_LOOP, vertices.numItems);
    }

    vertices.destroy();
    vertices = null;
  },

  /**
   * Draw a quad composed of four vertices.
   * Vertices must be in clockwise order, or else drawing will be distorted.
   *
   * @param {Array} v0: the [x, y, z] position of the first triangle point
   * @param {Array} v1: the [x, y, z] position of the second triangle point
   * @param {Array} v2: the [x, y, z] position of the third triangle point
   * @param {Array} v3: the [x, y, z] position of the fourth triangle point
   */
  quad: function(v0, v1, v2, v3) {
    var fill = this.$fillColor,
      stroke = this.$strokeColor,
      vertices = new Tilt.VertexBuffer([v0[0], v0[1], v0[2] || 0,
                                        v1[0], v1[1], v1[2] || 0,
                                        v2[0], v2[1], v2[2] || 0,
                                        v3[0], v3[1], v3[2] || 0], 3);

    // draw the quad only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_FAN, vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, stroke);
      this.drawVertices(this.LINE_LOOP, vertices.numItems);
    }

    vertices.destroy();
    vertices = null;
  },

  /**
   * Modifies the location from which rectangles draw. The default mode is
   * rectMode("corner"), which specifies the location to be the upper left
   * corner of the shape and uses the third and fourth parameters of rect() to
   * specify the width and height. Use rectMode("center") to draw centered
   * at the given x and y position.
   *
   * @param {String} mode: either "corner" or "center"
   */
  rectMode: function(mode) {
    this.$rectangle.rectModeValue = mode;
  },

  /**
   * Draws a rectangle using the specified parameters.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   */
  rect: function(x, y, width, height) {
    var rectangle = this.$rectangle,
      wireframe = this.$rectangleWireframe,
      fill = this.$fillColor,
      stroke = this.$strokeColor,
      vertices = rectangle.vertices,
      wvertices = wireframe.vertices;

    // if rectMode is set to "center", we need to offset the origin
    if ("center" === this.$rectangle.rectModeValue) {
      x -= width / 2;
      y -= height / 2;
    }

    // in memory, the rectangle is represented as a perfect 1x1 square, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.translate(x, y, 0);
    this.scale(width, height, 1);

    // draw the rectangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wvertices, stroke);
      this.drawVertices(this.LINE_LOOP, wvertices.numItems);
    }

    this.popMatrix();
  },

  /**
   * Modifies the location from which images draw. The default mode is
   * imageMode("corner"), which specifies the location to be the upper left
   * corner and uses the fourth and fifth parameters of image() to set the
   * image"s width and height. Use imageMode("center") to draw images centered
   * at the given x and y position.
   *
   * @param {String} mode: either "corner" or "center"
   */
  imageMode: function(mode) {
    this.$rectangle.imageModeValue = mode;
  },

  /**
   * Draws an image using the specified parameters.
   *
   * @param {Tilt.Texture} tex: the texture to be used
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   * @param {Tilt.VertexBuffer} texCoord: optional, custom texture coordinates
   */
  image: function(tex, x, y, width, height, texCoord) {
    if (!tex.loaded) {
      return;
    }

    var rectangle = this.$rectangle,
      tint = this.$tintColor,
      stroke = this.$strokeColor,
      vertices = rectangle.vertices,
      texCoordBuffer = texCoord || rectangle.texCoord;

    // if the width and height are not specified, we use the embedded
    // texture dimensions, from the source image or framebuffer
    if ("undefined" === typeof width || "undefined" === typeof height) {
      width = tex.width;
      height = tex.height;
    }

    // if imageMode is set to "center", we need to offset the origin
    if ("center" === rectangle.imageModeValue) {
      x -= width * 0.5;
      y -= height * 0.5;
    }

    // draw the image only if the tint alpha channel is not transparent
    if (tint[3]) {
      // in memory, the rectangle is represented as a perfect 1x1 square, so
      // some transformations are applied to achieve the desired shape
      this.pushMatrix();
      this.translate(x, y, 0);
      this.scale(width, height, 1);

      // use the necessary shader and draw the vertices
      this.useTextureShader(vertices, texCoordBuffer, tint, tex);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);

      this.popMatrix();
    }
  },

  /**
   * Draws a box using the specified parameters.
   *
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   * @param {Number} depth: the depth of the object
   * @param {Tilt.Texture} tex: the texture to be used
   */
  box: function(width, height, depth, tex) {
    var cube = this.$cube,
      wireframe = this.$cubeWireframe,
      tint = this.$tintColor,
      fill = this.$fillColor,
      stroke = this.$strokeColor;

    // in memory, the box is represented as a simple perfect 1x1 cube, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.scale(width, height, depth);

    if (tex) {
      // draw the box only if the tint alpha channel is not transparent
      if (tint[3]) {
        // use the necessary shader and draw the vertices
        this.useTextureShader(cube.vertices, cube.texCoord, tint, tex);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    }
    else {
      // draw the box only if the fill alpha channel is not transparent
      if (fill[3]) {
        // use the necessary shader and draw the vertices
        this.useColorShader(cube.vertices, fill);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    }

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wireframe.vertices, stroke);
      this.drawIndexedVertices(this.LINES, wireframe.indices);
    }

    this.popMatrix();
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   *
   * @param {Number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {Number} count: the number of indices to be rendered
   */
  drawVertices: function(drawMode, count) {
    this.gl.drawArrays(drawMode, 0, count);
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   * This function also makes use of an index buffer.
   *
   * @param {Number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {Tilt.IndexBuffer} indicesBuffer: indices for the vertices buffer
   */
  drawIndexedVertices: function(drawMode, indicesBuffer) {
    var gl = this.gl;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.$ref);
    gl.drawElements(drawMode, indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  },

  /**
   * Helper function to create a 3D context in a cross browser way.
   *
   * @param {HTMLCanvasElement} canvas: the canvas to get the WebGL context
   * @param {Object} opt_attribs: optional attributes used for initialization
   * @reuturn {Object} the WebGL context, or undefined if anything failed
   */
  create3DContext: function(canvas, opt_attribs) {
    var names = ["experimental-webgl", "webgl", "webkit-3d", "moz-webgl"],
      context, i, len;

    for (i = 0, len = names.length; i < len; i++) {
      try { context = canvas.getContext(names[i], opt_attribs); } catch(e) {}
      finally {
        if (context) {
          return context;
        }
      }
    }

    return undefined;
  },

  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally,
   * and resets the model view and projection matrices.
   * Use it at the beginning of your loop function, like this:
   *
   *      function draw() {
   *        tilt.loop(draw);
   *
   *        // do rendering
   *        ...
   *      };
   *      draw();
   *
   * @param {Function} draw: the function to be called each frame
   * @param {Boolean} debug: true if params like frame rate and frame delta
   * should be calculated
   */
  loop: function(draw, debug) {
    window.requestAnimFrame(draw);

    // reset the model view and projection matrices
    this.perspective();

    // increment the total frame count
    this.frameCount++;

    // only compute debugging variables if we really want to
    if (debug) {

      // calculate the frame delta and frame rate using the current time
      this.$currentTime = new Date().getTime();
      if (this.$lastTime !== 0) {
        this.frameDelta = this.$currentTime - this.$lastTime;
        this.frameRate = 1000 / this.frameDelta;
      }

      // increase the elapsed time based on the frame delta
      this.$lastTime = this.$currentTime;
      this.elapsedTime += this.frameDelta;
    }
  },

  /**
   * Clears the Tilt cache, destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.clearCache();
    Tilt.destroyObject(this);
  }
};
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

window.requestAnimFrame = function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback, element) {
           window.setTimeout(callback, 1000 / 60);
         };
}();
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
var EXPORTED_SYMBOLS = ["Tilt.Shaders.Color"];

Tilt.Shaders = {};

/**
 * A color shader. The only useful thing it does is set the gl_FragColor.
 *
 * @param {Attribute} vertexPosition: the vertex position
 * @param {Uniform} mvMatrix: the model view matrix
 * @param {Uniform} projMatrix: the projection matrix
 * @param {Uniform} color: the color to set the gl_FragColor to
 */
Tilt.Shaders.Color = {

  /**
   * Vertex shader.
   */
  vs: [
"attribute vec3 vertexPosition;",

"uniform mat4 mvMatrix;",
"uniform mat4 projMatrix;",

"void main(void) {",
"    gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);",
"}"
].join("\n"),

  /**
   * Fragment shader.
   */
  fs: [
"#ifdef GL_ES",
"precision lowp float;",
"#endif",

"uniform vec4 color;",

"void main(void) {",
"    gl_FragColor = color;",
"}"
].join("\n")
};

/**
 * A simple texture shader. It uses one sampler and a uniform color.
 *
 * @param {Attribute} vertexPosition: the vertex position
 * @param {Attribute} vertexTexCoord: texture coordinates used by the sampler
 * @param {Uniform} mvMatrix: the model view matrix
 * @param {Uniform} projMatrix: the projection matrix
 * @param {Uniform} color: the color to multiply the sampled pixel with
 * @param {Uniform} sampler: the texture sampler to fetch the pixels from
 */
Tilt.Shaders.Texture = {

  /**
   * Vertex shader.
   */
  vs: [
"attribute vec3 vertexPosition;",
"attribute vec2 vertexTexCoord;",

"uniform mat4 mvMatrix;",
"uniform mat4 projMatrix;",

"varying vec2 texCoord;",

"void main(void) {",
"  gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);",
"  texCoord = vertexTexCoord;",
"}"
].join("\n"),

  /**
   * Fragment shader.
   */
  fs: [
"#ifdef GL_ES",
"precision lowp float;",
"#endif",

"uniform vec4 color;",
"uniform sampler2D sampler;",

"varying vec2 texCoord;",

"void main(void) {",
"  vec4 texture = texture2D(sampler, texCoord);",
"  gl_FragColor = color * texture;",
"}"
].join("\n")
};
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
var EXPORTED_SYMBOLS = ["Tilt.Container"];

/**
 * View constructor.
 *
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this shouldn't be drawn
 *  @param {Boolean} disabled: true if the children shouldn't receive events
 *  @param {Boolean} standby: true if the container should respond to events
 *  @param {String} background: color to fill the screen
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} width: the width of the object
 *  @param {Number} height: the height of the object
 *  @param {Array} offset: the [x, y] offset of the inner contents
 *  @param {Array} elements: an array of elements to be initially added
 */
Tilt.Container = function(properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Container", this);

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
   * Specifies if the container should respond to events.
   */
  this.standby = properties.standby || false;

  /**
   * The color of the full screen background rectangle.
   */
  this.$background = properties.background || null;

  /**
   * The draw coordinates of this object.
   */
  this.$x = properties.x || 0;
  this.$y = properties.y || 0;
  this.$width = properties.width || 0;
  this.$height = properties.height || 0;

  /**
   * The offset of the inner contents.
   */
  this.$offset = properties.offset || [0, 0];

  // if initial elements are specified, add them to this view
  if (properties.elements instanceof Array) {
    properties.elements.forEach(function(e) { this.push(e); }.bind(this));
  }

  // add this view to the top level UI handler.
  Tilt.UI.push(this);
};

/**
 * All the UI elements will be added to a list for proper handling.
 */
Tilt.Container.prototype = [];

/**
 * Sets this object's position.
 *
 * @param {Number} x: the x position of the object
 * @param {Number} y: the y position of the object
 */
Tilt.Container.prototype.setPosition = function(x, y) {
  this.$x = x;
  this.$y = y;
};

/**
 * Sets this object's dimensions.
 *
 * @param {Number} width: the width of the object
 * @param {Number} height: the height of the object
 */
Tilt.Container.prototype.setSize = function(width, height) {
  this.$width = width;
  this.$height = height;
};

/**
 * Sets this object's position.
 * @param {Number} x: the x position of the object
 */
Tilt.Container.prototype.setX = function(x) {
  this.$x = x;
};

/**
 * Sets this object's position.
 * @param {Number} y: the y position of the object
 */
Tilt.Container.prototype.setY = function(y) {
  this.$y = y;
};

/**
 * Sets this object's dimensions.
 * @param {Number} width: the width of the object
 */
Tilt.Container.prototype.setWidth = function(width) {
  this.$width = width;
};

/**
 * Sets this object's dimensions.
 * @param {Number} height: the height of the object
 */
Tilt.Container.prototype.setHeight = function(height) {
  this.$height = height;
};

/**
 * Returns the x position of this object.
 * @return {Number} the x position
 */
Tilt.Container.prototype.getX = function() {
  return this.$x;
};

/**
 * Returns the y position of this object.
 * @return {Number} the y position
 */
Tilt.Container.prototype.getY = function() {
  return this.$y;
};

/**
 * Returns the width of this object.
 * @return {Number} the width
 */
Tilt.Container.prototype.getWidth = function() {
  return this.$width;
};

/**
 * Returns the height of this object.
 * @return {Number} the height
 */
Tilt.Container.prototype.getHeight = function() {
  return this.$height;
};

/**
 * Updates this object's internal params.
 *
 * @param {Number} frameDelta: the delta time elapsed between frames
 * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
 */
Tilt.Container.prototype.update = function(frameDelta, tilt) {
};

/**
 * Draws this object using the specified internal params.
 *
 * @param {Number} frameDelta: the delta time elapsed between frames
 * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
 */
Tilt.Container.prototype.draw = function(frameDelta, tilt) {
  tilt = tilt || Tilt.$renderer;

  var element,
    background = this.$background,
    x = this.$x,
    y = this.$y,
    width = this.$width,
    height = this.$height,
    offset = this.$offset,
    offsetX = offset[0],
    offsetY = offset[1],
    left = x + offsetX,
    top = y + offsetY,
    elementBounds, elementX, elementY, elementWidth, elementHeight,
    r1x1, r1y1, r1x2, r1y2, r2x1, r2y1, r2x2, r2y2, i, len;

  // a view may specify a full screen rectangle as a background
  if (background !== null) {
    tilt.fill(background);
    tilt.noStroke();
    tilt.rect(x, y, width || tilt.width, height || tilt.height);
  }

  // translate by the view offset (for example, used in scroll containers)
  tilt.pushMatrix();
  tilt.translate(left, top, 0);

  // a view has multiple elements attach, browse and handle each one
  for (i = 0, len = this.length; i < len; i++) {
    element = this[i];
    element.drawable = false;
    element.$parentX = x;
    element.$parentY = y;
    element.$parentWidth = width;
    element.$parentHeight = height;

    // draw only if the element is visible (it may be enabled or not)
    if (!element.hidden) {

      // some elements don't require an update function, check for it first
      if ("function" === typeof element.update) {

        // update only if the element is visible and enabled
        if (!element.hidden && !element.disabled) {
          element.update(frameDelta, tilt);
        }
      }

      // if the current view bounds do not restrict drawing the child elements
      if (width === 0 || height === 0) {
        element.draw(frameDelta, tilt);
        element.drawable = true;
        continue;
      }

      // otherwise, we need to calculate if the child element is visible
      elementBounds = element.$bounds || [1, 1, 1, 1];
      elementX = elementBounds[0] + left;
      elementY = elementBounds[1] + top;
      elementWidth = elementBounds[2];
      elementHeight = elementBounds[3];

      // compute the two rectangles representing the element and view bounds
      r1x1 = elementX;
      r1y1 = elementY;
      r1x2 = elementX + elementWidth;
      r1y2 = elementY + elementHeight;
      r2x1 = x;
      r2y1 = y;
      r2x2 = x + width;
      r2y2 = y + height;

      // check to see if the child UI element is visible inside the bounds
      if (r1x1 > r2x1 && r1x2 < r2x2 && r1y1 > r2y1 && r1y2 < r2y2) {
        element.draw(frameDelta, tilt);
        element.drawable = true;
      }
    }
  }

  tilt.popMatrix();
};

/**
 * Checks to see if the mouse is over an element handled boundsY this view.
 *
 * @param {Object} element: the element to check
 * @return {Boolean} true if the mouse is over the element
 */
Tilt.Container.prototype.isMouseOver = function(element) {
  // get the bounds from the element (if it's not set, use default values)
  var ui = Tilt.UI,
    mouseX = ui.mouseX,
    mouseY = ui.mouseY,

    // remember the view offset (for example, used in scroll containers)
    offset = this.$offset || [0, 0],
    left = this.$x || 0 + offset[0],
    top = this.$y || 0 + offset[1],

    // get the bounds from the element (if it's not set, use default values)
    bounds = element.$bounds || [-1, -1, -1, -1],
    boundsX = bounds[0] + left,
    boundsY = bounds[1] + top,
    boundsWidth = bounds[2],
    boundsHeight = bounds[3];

  // check to see if the mouse pointer is inside the element bounds
  return mouseX > boundsX && mouseX < boundsX + boundsWidth &&
         mouseY > boundsY && mouseY < boundsY + boundsHeight;
};

/**
 * Removes all the children from the container.
 */
Tilt.Container.prototype.clear = function() {
  for (var i = 0, len = this.length; i < len; i++) {
    this[i].destroy();
    this[i] = null;
  }

  this.splice(0, this.length);
};

/**
 * Destroys this object and deletes all members.
 */
Tilt.Container.prototype.destroy = function() {
  Tilt.UI.splice(Tilt.UI.indexOf(this), 1);
  Tilt.destroyObject(this);
};
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
var EXPORTED_SYMBOLS = ["Tilt.Scrollview"];

/**
 * ScrollContainer constructor.
 *
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this shouldn't be drawn
 *  @param {Boolean} disabled: true if the children shouldn't receive events
 *  @param {Boolean} standby: true if the container should respond to events
 *  @param {String} background: color to fill the screen
 *  @param {Array} offset: the [x, y] offset of the inner contents
 *  @param {Array} scrollable: the [min, max] scrollable offset of contents
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
  this.view.standby = true;

  /**
   * The view containing the scrollbars.
   */
  this.scrollbars = new Tilt.Container();

  /**
   * The minimum and maximum scrollable offset for the contents.
   */
  this.top = properties.scrollable[0] || 0;
  this.bottom = properties.scrollable[1] || Number.MAX_VALUE;
  this.view.$offset[1] = this.top;

  /**
   * Button scrolling the content to top.
   */
  var topButton = new Tilt.Button(properties.top, {
    x: this.view.$x - 25,
    y: this.view.$y - 5,
    width: 32,
    height: 30,
    fill: properties.top ? null : "#f00a",
    padding: properties.top ? properties.top.$padding : [0, 0, 0, 0],

    onmousedown: function() {
      window.clearInterval(this.$scrollTopReset);
      window.clearInterval(this.$scrollTop);
      window.clearInterval(this.$scrollBottom);

      var ui = Tilt.UI,
        view = this.view,
        offset = view.$offset;

      this.$scrollTop = window.setInterval(function() {
        offset[1] = Tilt.Math.clamp(
          offset[1] + 5, this.top, -this.bottom + view.$height);

        ui.requestRedraw();

        if (!ui.mousePressed) {
          ui = null;
          view = null;
          offset = null;
          window.clearInterval(this.$scrollTop);
        }
      }.bind(this), 1000 / 60);
    }.bind(this)
  }),

  /**
   * Button scrolling the content to bottom.
   */
  bottomButton = new Tilt.Button(properties.bottom, {
    x: this.view.$x - 25,
    y: this.view.$y + this.view.$height - 25,
    width: 32,
    height: 30,
    fill: properties.bottom ? null : "#0f0a",
    padding: properties.bottom ? properties.bottom.$padding : [0, 0, 0, 0],

    onmousedown: function() {
      window.clearInterval(this.$scrollTopReset);
      window.clearInterval(this.$scrollTop);
      window.clearInterval(this.$scrollBottom);

      var ui = Tilt.UI,
        view = this.view,
        offset = view.$offset;

      this.$scrollBottom = window.setInterval(function() {
        offset[1] = Tilt.Math.clamp(
          offset[1] - 5, this.top, -this.bottom + view.$height);

        ui.requestRedraw();

        if (!ui.mousePressed) {
          ui = null;
          view = null;
          offset = null;
          window.clearInterval(this.$scrollBottom);
        }
      }.bind(this), 1000 / 60);
    }.bind(this)
  }),

  /**
   * Button resetting the content scrolling to top.
   */
  resetButton = new Tilt.Button(properties.reset, {
    x: this.view.$x - 25,
    y: this.view.$y + this.view.$height - 50,
    width: 32,
    height: 30,
    fill: properties.reset ? null : "#0f0b",
    padding: properties.reset ? properties.reset.$padding : [0, 0, 0, 0],

    onmousedown: function() {
      window.clearInterval(this.$scrollTopReset);
      window.clearInterval(this.$scrollTop);
      window.clearInterval(this.$scrollBottom);

      var ui = Tilt.UI,
        view = this.view,
        offset = view.$offset;

      this.$scrollTopReset = window.setInterval(function() {
        offset[1] -= (offset[1] - this.top) / 10;

        ui.requestRedraw();

        if (Math.abs(offset[1] - this.top) < 0.1) {
          ui = null;
          view = null;
          offset = null;
          window.clearInterval(this.$scrollTopReset);
        }
      }.bind(this), 1000 / 60);
    }.bind(this)
  });

  /**
   * Handles the mouse wheel event for the container view.
   * @param {Number} scroll: the mouse wheel direction and speed
   */
  this.view["onmousescroll"] = function(scroll) {
    window.clearInterval(this.$scrollTopReset);
    window.clearInterval(this.$scrollTop);
    window.clearInterval(this.$scrollBottom);

    var ui = Tilt.UI,
      view = this.view,
      offset = view.$offset;

    offset[1] = Tilt.Math.clamp(
      offset[1] - scroll / 2, this.top, -this.bottom + view.$height);

    ui.requestRedraw();

    ui = null;
    view = null;
    offset = null;
  }.bind(this);

  // add the top, bottom and reset button to the scrollbars container
  this.scrollbars.push(topButton, bottomButton, resetButton);
  topButton = null;
  bottomButton = null;
  resetButton = null;
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
var EXPORTED_SYMBOLS = ["Tilt.Button"];

/**
 * Button constructor.
 *
 * @param {Tilt.Sprite} sprite: the sprite to be drawn as background
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this object shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} width: the width of the object
 *  @param {Number} height: the height of the object
 *  @param {Array} padding: the inner padding offset for mouse events
 *  @param {String} fill: fill color for the rect bounding this object
 *  @param {String} stroke: stroke color for the rect bounding this object
 *  @param {Function} onmousedown: function called when the event is triggered
 *  @param {Function} onmouseup: function called when the event is triggered
 *  @param {Function} onclick: function called when the event is triggered
 * @return {Tilt.Button} the newly created object
 */
Tilt.Button = function(sprite, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Button", this);

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
   * A sprite used as a background for this object.
   */
  this.$sprite = sprite || { $x: -1, $y: -1, $width: -1, $height: -1 };
  this.$sprite.$x = properties.x || this.$sprite.$x;
  this.$sprite.$y = properties.y || this.$sprite.$y;
  this.$sprite.$width = properties.width || this.$sprite.$width;
  this.$sprite.$height = properties.height || this.$sprite.$height;
  this.$sprite.disabled = true;

  /**
   * The inner padding offset for mouse events.
   */
  this.$padding = properties.padding || [0, 0, 0, 0];

  /**
   * The fill color for the rectangle bounding this object.
   */
  this.$fill = properties.fill || null;

  /**
   * The stroke color for the rectangle bounding this object.
   */
  this.$stroke = properties.stroke || null;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [
    this.$sprite.$x + this.$padding[0],
    this.$sprite.$y + this.$padding[1],
    this.$sprite.$width - this.$padding[0] - this.$padding[2],
    this.$sprite.$height - this.$padding[1] - this.$padding[3]];
};

Tilt.Button.prototype = {

  /**
   * Sets this object's position.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   */
  setPosition: function(x, y) {
    if ("function" === typeof this.$sprite.setPosition) {
      this.$sprite.setPosition(x, y);
    }
    else {
      this.$sprite.$x = x;
      this.$sprite.$y = y;
    }
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
    if ("function" === typeof this.$sprite.setSize) {
      this.$sprite.setSize(width, height);
    }
    else {
      this.$sprite.$width = width;
      this.$sprite.$height = height;
    }
    this.$bounds[2] = width - this.$padding[0] - this.$padding[2];
    this.$bounds[3] = height - this.$padding[1] - this.$padding[3];
  },

  /**
   * Sets the x position of this object.
   * @param {Number} x: the x position
   */
  setX: function(x) {
    this.setPosition(x, this.$sprite.$y);
  },

  /**
   * Sets the y position of this object.
   * @param {Number} y: the y position
   */
  setY: function(y) {
    this.setPosition(this.$sprite.$x, y);
  },

  /**
   * Sets the width of this object.
   * @param {Number} width: the width
   */
  setWidth: function(width) {
    this.setSize(width, this.$sprite.$height);
  },

  /**
   * Sets the height of this object.
   * @param {Number} height: the height
   */
  setHeight: function(height) {
    this.setSize(this.$sprite.$width, height);
  },

  /**
   * Sets a new sprite to be drawn as a background for this object.
   */
  setSprite: function(sprite) {
    var x = this.$sprite.$x,
      y = this.$sprite.$y,
      width = this.$sprite.$width,
      height = this.$sprite.$height,
      padding = this.$sprite.$padding;

    this.$sprite = sprite;
    this.$sprite.$padding = padding;
    this.$sprite.setPosition(x, y);
    this.$sprite.setSize(width, height);
    this.$sprite.disabled = true;
  },

  /**
   * Sets the fill color for the rectangle bounding this object.
   * @param {String} color: the fill color
   */
  setFill: function(color) {
    this.$fill = color;
  },

  /**
   * Sets the stroke color for the rectangle bounding this object.
   * @param {String} color: the stroke color
   */
  setStroke: function(color) {
    this.$stroke = color;
  },

  /**
   * Returns the x position of this object.
   * @return {Number} the x position
   */
  getX: function() {
    return this.$sprite.$x;
  },

  /**
   * Returns the y position of this object.
   * @return {Number} the y position
   */
  getY: function() {
    return this.$sprite.$y;
  },

  /**
   * Returns the width of this object.
   * @return {Number} the width
   */
  getWidth: function() {
    return this.$sprite.$width;
  },

  /**
   * Returns the height of this object.
   * @return {Number} the height
   */
  getHeight: function() {
    return this.$sprite.$height;
  },

  /**
   * Gets the fill color for the rectangle bounding this object.
   * @return {String} the fill color
   */
  getFill: function() {
    return this.$fill;
  },

  /**
   * Gets the stroke color for the rectangle bounding this object.
   * @return {String} the stroke color
   */
  getStroke: function() {
    return this.$stroke;
  },

  /**
   * Draws this object using the specified internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(frameDelta, tilt) {
    tilt = tilt || Tilt.$renderer;

    // a button may not have a sprite attached, so check before drawing
    if ("undefined" !== typeof this.$sprite.$texture) {
      this.$sprite.draw(tilt);
    }

    var bounds, padding,
      fill = this.$fill,
      stroke = this.$stroke;

    // if fill and stroke params are specified, draw a rectangle using the
    // current bounds around the object
    if (fill || stroke) {
      bounds = this.$bounds;
      padding = this.$padding;

      tilt.fill(fill || "#fff0");
      tilt.stroke(stroke || "#0000");
      tilt.rect(
        bounds[0] - padding[0],
        bounds[1] - padding[1],
        bounds[2] + padding[0] + padding[2],
        bounds[3] + padding[1] + padding[3]);
    }

    if (Tilt.UI.debug) {
      tilt.fill("#fff2");
      tilt.stroke("#00f");
      tilt.rect(
        this.$sprite.$x,
        this.$sprite.$y,
        this.$sprite.$width,
        this.$sprite.$height);

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
var EXPORTED_SYMBOLS = ["Tilt.Slider"];

/**
 * Slider constructor.
 *
 * @param {Tilt.Sprite} sprite: the sprite to be drawn for the handler
 * @param {Object} properties: additional properties for this object
 *  @param {Boolean} hidden: specifies if this object shouldn't be drawn
 *  @param {Boolean} disabled: specifies if this shouldn't receive events
 *  @param {Number} x: the x position of the object
 *  @param {Number} y: the y position of the object
 *  @param {Number} size: the slider size
 *  @param {Number} value: number ranging from 0..100
 *  @param {Boolean} direction: 0 for horizontal, 1 for vertical
 *  @param {Function} onmousedown: function called when the event is triggered
 *  @param {Function} onmouseup: function called when the event is triggered
 *  @param {Function} onclick: function called when the event is triggered
 * @return {Tilt.Slider} the newly created object
 */
Tilt.Slider = function(sprite, properties) {

  // intercept this object using a profiler when building in debug mode
  Tilt.Profiler.intercept("Tilt.Slider", this);

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
   * A sprite used as a background for this object.
   */
  this.$sprite = new Tilt.Sprite(sprite.$texture, sprite.$region, {
    padding: sprite.$padding,
    tint: sprite.$tint
  });
  this.$sprite.$x = properties.x || this.$sprite.$x;
  this.$sprite.$y = properties.y || this.$sprite.$y;
  this.$sprite.$width = properties.width || this.$sprite.$width;
  this.$sprite.$height = properties.height || this.$sprite.$height;

  /**
   * The draw coordinates of this object.
   */
  this.$x = this.$sprite.$x;
  this.$y = this.$sprite.$y;

  /**
   * The slider size (area in which the handler is moved).
   */
  this.$size = properties.size || 100;

  /**
   * The slider direction (0 for horizontal, 1 for vertical).
   */
  this.$direction = properties.direction || 0;

  /**
   * The bounds of this object (used for clicking and intersections).
   */
  this.$bounds = [
    this.$sprite.$x + this.$sprite.$padding[0],
    this.$sprite.$y + this.$sprite.$padding[1],
    this.$sprite.$width - this.$sprite.$padding[2],
    this.$sprite.$height - this.$sprite.$padding[3]];

  /**
   * The slider value (also defining the handler position).
   */
  this.setValue(properties.value || 0);
};

Tilt.Slider.prototype = {

  /**
   * Sets this object's position.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   */
  setPosition: function(x, y) {
    this.$x = x;
    this.$y = y;
    this.$bounds[0] = x + this.$sprite.$padding[0];
    this.$bounds[1] = y + this.$sprite.$padding[1];
    this.setValue(this.$value);
  },

  /**
   * Sets the x position of this object.
   * @param {Number} x: the x position
   */
  setX: function(x) {
    this.setPosition(x, this.$y);
    this.setValue(this.$value);
  },

  /**
   * Sets the y position of this object.
   * @param {Number} y: the y position
   */
  setY: function(y) {
    this.setPosition(this.$x, y);
    this.setValue(this.$value);
  },

  /**
   * Sets the size of this object.
   * @param {Number} size: the size
   */
  setSize: function(size) {
    this.$size = size;
    this.setValue(this.$value);
  },

  /**
   * Sets the value for this controller.
   * @param {Number} value: the value, ranging from 0..100
   */
  setValue: function(value) {
    var sprite = this.$sprite,
      x = this.$x,
      y = this.$y,
      size = this.$size,
      direction = this.$direction, p;

    // first, make sure the passed value is in 0..100 range
    this.$value = Tilt.Math.clamp(value + 0.001, 0, 100);

    // depending on the direction, move the handler along the x or y axis
    if (direction === 0) {
      // calculate the position using the value
      p = Tilt.Math.map(this.$value, 0, 100, x, x + size);

      // set the sprite x position and update the bounds
      sprite.setPosition(p, y);
      this.$bounds[0] = p + sprite.$padding[0];
    }
    else {
      // calculate the position using the value
      p = Tilt.Math.map(this.$value, 0, 100, y, y + size);

      // set the sprite y position and update the bounds
      sprite.setPosition(x, p);
      this.$bounds[1] = p + sprite.$padding[1];
    }
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
   * Returns the size of this object.
   * @return {Number} the size
   */
  getSize: function() {
    return this.$size;
  },

  /**
   * Gets the current value for this controller.
   * @return {Number} the value, ranging from 0..100
   */
  getValue: function() {
    return this.$value;
  },

  /**
   * Updates this object's internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  update: function(frameDelta, tilt) {
    var ui = Tilt.UI,
      sprite, px, py, x, y, size, direction, xps, yps, p, pmpx, pmpy;

    // if the mouse was pressed over the handler, begin sliding
    if (this.mousePressed) {
      this.$sliding = true;
    }
    // if the mouse was released (over the slider or not), end sliding
    else if (!ui.mousePressed) {
      this.$sliding = false;
    }

    // if we're currently sliding, update this object's internal params
    if (this.$sliding) {
      sprite = this.$sprite;
      px = this.$parentX;
      py = this.$parentY;
      x = this.$x;
      y = this.$y;
      size = this.$size;
      direction = this.$direction;

      // depending on the direction, move the handler along the x or y axis
      if (direction === 0) {
        x += px;
        xps = x + size;

        // clamp the handler position between the left and right edges
        p = Tilt.Math.clamp(ui.mouseX - sprite.$width * 0.5, x, xps);
        pmpx = p - px;

        // set the sprite x position and update the value and bounds
        sprite.setPosition(pmpx, y);
        this.$value = Tilt.Math.map(p, x, xps, 0, 100);
        this.$bounds[0] = pmpx + sprite.$padding[0];
      }
      else {
        y += py;
        yps = y + size;

        // clamp the handler position between the top and bottom edges
        p = Tilt.Math.clamp(ui.$mouseY - sprite.$height * 0.5, y, yps);
        pmpy = p - py;

        // set the sprite y position and update the value and bounds
        sprite.setPosition(x, pmpy);
        this.$value = Tilt.Math.map(pmpy, y, y + size, 0, 100);
        this.$bounds[1] = pmpy + sprite.$padding[1];
      }
    }
  },

  /**
   * Draws this object using the specified internal params.
   *
   * @param {Number} frameDelta: the delta time elapsed between frames
   * @param {Tilt.Renderer} tilt: optional, a reference to a Tilt.Renderer
   */
  draw: function(frameDelta, tilt) {
    tilt = tilt || Tilt.$renderer;
    this.$sprite.draw(tilt);
  },

  /**
   * Destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.destroyObject(this);
  }
};
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
var EXPORTED_SYMBOLS = ["Tilt.UI"];

/**
 * The top level UI handling events and containing all the views.
 */
Tilt.UI = [];
Tilt.UI.mouseX = 0;
Tilt.UI.mouseY = 0;
Tilt.UI.mousePressed = false;
Tilt.UI.mouseOver = false;
Tilt.UI.mouseScrollAmmount = 0;
Tilt.UI.keyPressed = [];
Tilt.UI.requestRedraw = function() {};

/**
 * Updates and draws each view handled by the UI.
 * @param {Number} frameDelta: the delta time elapsed between frames
 */
Tilt.UI.draw = function(frameDelta) {
  var tilt = Tilt.$renderer,
    i, len, container;

  // before drawing, make sure we're in an orthographic default environment
  tilt.defaults();
  tilt.ortho();

  for (i = 0, len = this.length; i < len; i++) {
    container = this[i];

    if (!container.hidden) {
      if (!container.disabled) {
        container.update(frameDelta, tilt);
      }
      container.draw(frameDelta, tilt);
    }
  }
};

/**
 * Sets a modal view.
 * @param {Tilt.Container} container: the container to be set modal
 */
Tilt.UI.presentModal = function(container) {
  if (container.modal || this.indexOf(container) === -1) {
    return;
  }

  // disable all the other views, so that they become unresponsive to events
  for (var i = 0, len = this.length; i < len; i++) {
    this[i].$prevDisabled = this[i].disabled;
    this[i].disabled = true;
  }

  // a modal view must always be marked as modal, be visible and enabled
  container.modal = true;
  container.hidden = false;
  container.disabled = false;
  this.requestRedraw();
};

/**
 * Unsets a modal view.
 * @param {Tilt.Container} view: the view to be set modal
 */
Tilt.UI.dismissModal = function(container) {
  if (!container.modal || this.indexOf(container) === -1) {
    return;
  }

  // reset the disabled parameter for all the other views
  for (var i = 0, len = this.length; i < len; i++) {
    this[i].disabled = this[i].$prevDisabled;
    delete this[i].$prevDisabled;
  }

  // a non-modal view must always be marked as modal, be hidden and disabled
  container.modal = false;
  container.hidden = true;
  container.disabled = true;
  this.requestRedraw();
};

/**
 * Delegate mouse down method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 * @param {Number} button: which mouse button was pressed
 */
Tilt.UI.mouseDown = function(x, y, button) {
  this.mousePressed = true;
  this.mouseOver = false;
  this.$handleMouseEvent("onmousedown", x, y, button);
};

/**
 * Delegate mouse up method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 * @param {Number} button: which mouse button was released
 */
Tilt.UI.mouseUp = function(x, y, button) {
  this.mousePressed = false;
  this.mouseOver = false;
  this.$handleMouseEvent("onmouseup", x, y, button);
};

/**
 * Delegate click method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 */
Tilt.UI.click = function(x, y) {
  this.$handleMouseEvent("onclick", x, y);
};

/**
 * Delegate double click method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 */
Tilt.UI.doubleClick = function(x, y) {
  this.$handleMouseEvent("ondoubleclick", x, y);
};

/**
 * Delegate mouse move method.
 *
 * @param {Number} x: the current horizontal coordinate of the mouse
 * @param {Number} y: the current vertical coordinate of the mouse
 */
Tilt.UI.mouseMove = function(x, y) {
  this.mouseX = x;
  this.mouseY = y;
};

/**
 * Delegate mouse scroll method.
 * @param {Number} scroll: the mouse wheel direction and speed
 */
Tilt.UI.mouseScroll = function(scroll) {
  this.mouseOver = false;
  this.mouseScrollAmmount = scroll;
  this.$handleMouseEvent("onmousescroll", scroll);
};

/**
 * Delegate mouse over method.
 */
Tilt.UI.mouseOver = function() {
};

/**
 * Delegate mouse out method.
 */
Tilt.UI.mouseOut = function() {
};

/**
 * Delegate key down method.
 * @param {Number} code: the code for the currently pressed key
 */
Tilt.UI.keyDown = function(code) {
  this.keyPressed[code] = true;
  this.$handleKeyEvent("onkeydown", code);
};

/**
 * Delegate key up method.
 * @param {Number} code: the code for the currently released key
 */
Tilt.UI.keyUp = function(code) {
  this.keyPressed[code] = false;
  this.$handleKeyEvent("onkeyup", code);
};

/**
 * Delegate focus method.
 */
Tilt.UI.windowFocus = function() {
  this.mouseX = -Number.MAX_VALUE;
  this.mouseY = -Number.MAX_VALUE;
};

/**
 * Internal function, handling a mouse event for each element in a view.
 * @param {String} name: the event name
 */
Tilt.UI.$handleMouseEvent = function(name, x, y, button) {
  var i, e, len, len2, container, element, func,
    offset, contnrX, contnrY, contnrWidth, contnrHeight, left,top,
    bounds, boundsX, boundsY, boundsWidth, boundsHeight,
    mouseX = this.mouseX,
    mouseY = this.mouseY;

  // browse each view handled by the top level UI array
  for (i = 0, len = this.length; i < len; i++) {
    container = this[i];

    // handle mouse events only if the view is visible and enabled
    if (container.hidden || container.disabled) {
      continue;
    }

    contnrX = container.$x || 0;
    contnrY = container.$y || 0;
    contnrWidth = container.$width || 0;
    contnrHeight = container.$height || 0;

    // the container can receive events just like it's child elements
    if (container.standby) {
      if (mouseX > contnrX && mouseX < contnrX + contnrWidth &&
          mouseY > contnrY && mouseY < contnrY + contnrHeight) {

        // the mouse pointer is over a container, set a global flag for this
        this.mouseOver = true;

        // get the event function from the container
        func = container[name];

        // if the event is a valid set function, call it now
        if ("function" === typeof func) {
          func(x, y, button);
        }
      }
    }

    // remember the view offset (for example, used in scroll containers)
    offset = container.$offset || [0, 0];
    left = contnrX + offset[0];
    top = contnrY + offset[1] + 2;

    // each view has multiple container attach, browse and handle each one
    for (e = 0, len2 = container.length; e < len2; e++) {
      if (!(element = container[e])) {
        continue;
      }

      // handle mouse events only if the element is visible and enabled
      if (element.hidden || element.disabled || !element.drawable) {
        continue;
      }

      // get the bounds from the element (if it's not set, use default values)
      bounds = element.$bounds || [-1, -1, -1, -1];
      boundsX = bounds[0] + left;
      boundsY = bounds[1] + top;
      boundsWidth = bounds[2];
      boundsHeight = bounds[3];

      // if the mouse was released (no matter where), the mousePressed flag
      // for that element must be set to false
      if ("onmouseup" === name) {
        element.mousePressed = false;
      }

      // continue only if the mouse pointer is inside the element bounds
      if (mouseX > boundsX && mouseX < boundsX + boundsWidth &&
          mouseY > boundsY && mouseY < boundsY + boundsHeight) {

        // if the mouse is pressed (inside the element), the mousePressed flag
        // for that element must be set to true
        if ("onmousedown" === name) {
          element.mousePressed = true;
        }

        // the mouse pointer is over a gui element, set a global flag for this
        this.mouseOver = true;

        // get the event function from the element
        func = element[name];

        // if the event is a valid set function, call it now
        if ("function" === typeof func) {
          func(x, y, button);
        }
      }
    }
  }
};

/**
 * Internal function, handling a key event for each element in a view.
 * @param {String} name: the event name
 */
Tilt.UI.$handleKeyEvent = function(name, code) {
  var i, e, len, len2, container, element, func;

  // browse each view handled by the top level UI array
  for (i = 0, len = this.length; i < len; i++) {
    container = this[i];

    // handle keyboard events only if the view is visible and enabled
    if (container.hidden || container.disabled) {
      continue;
    }

    // the container can receive events just like it's child elements
    if (container.standby) {
      // get the event function from the element
      func = container[name];

      // if the event is a valid set function, call it now
      if ("function" === typeof func) {
        func(code);
      }
    }

    // each view has multiple container attach, browse and handle each one
    for (e = 0, len2 = container.length; e < len2; e++) {
      if (!(element = container[e])) {
        continue;
      }

      // handle keyboard events only if the element is visible and enabled
      if (element.hidden || element.disabled) {
        continue;
      }

      // get the event function from the element
      func = element[name];

      // if the event is a valid set function, call it now
      if ("function" === typeof func) {
        func(code);
      }
    }
  }
};

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.UI", Tilt.UI);
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

/*global Components */

if ("undefined" === typeof Cc) {
  var Cc = Components.classes;
}
if ("undefined" === typeof Ci) {
  var Ci = Components.interfaces;
}
if ("undefined" === typeof Cu) {
  var Cu = Components.utils;
}
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
var EXPORTED_SYMBOLS = ["Tilt.Console", "Tilt.StringBundle"];

/*global Cc, Ci, Cu */

/**
 * Various console functions required by the engine.
 */
Tilt.Console = {

  /**
   * Shows a modal alert message popup.
   *
   * @param {String} title: the title of the popup
   * @param {String} message: the message to be logged
   */
  alert: function(title, message) {
    var prompt;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      prompt = Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

      prompt.alert(null, title, message);
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
    }
  },

  /**
   * Shows a modal confirm message popup.
   *
   * @param {String} title: the title of the popup
   * @param {String} message: the message to be logged
   * @param {String} checkMessage: text to appear with the checkbox
   * @param {Boolean} checkState: the checked state of the checkbox
   */
  confirmCheck: function(title, message, checkMessage, checkState) {
    var prompt;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      prompt = Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

      return (
        prompt.confirmCheck(null, title, message, checkMessage, checkState));
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
    }
  },

  /**
   * Logs a message to the console.
   * If this is not inside an extension environment, an alert() is used.
   *
   * @param {String} message: the message to be logged
   */
  log: function(message) {
    var consoleService;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      // get the console service
      consoleService = Cc["@mozilla.org/consoleservice;1"].
        getService(Ci.nsIConsoleService);

      // log the message
      consoleService.logStringMessage(message);
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
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
  error: function(message, sourceName, sourceLine, lineNumber, columnNumber) {
    var flags = arguments[5],
      category = arguments[6],
      consoleService, scriptError;

    if ("undefined" === typeof message) {
      message = "undefined";
    }
    try {
      // get the console service
      consoleService = Cc["@mozilla.org/consoleservice;1"].
        getService(Ci.nsIConsoleService);

      // also the script error service
      scriptError = Cc["@mozilla.org/scripterror;1"].
        createInstance(Ci.nsIScriptError);

      // initialize a script error
      scriptError.init(message, sourceName, sourceLine,
                       lineNumber, columnNumber, flags, category);

      // log the error
      consoleService.logMessage(scriptError);
    }
    catch(e) {
      // running from an unprivileged environment
      window.alert(message);
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

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Console);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Console", Tilt.Console);
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
var EXPORTED_SYMBOLS = ["Tilt.Document"];

/*global Exception */

/**
 * Utilities for accessing and manipulating a document.
 */
Tilt.Document = {

  /**
   * Current document object used when creating elements.
   * If unspecified, it will default to the window.document variable.
   */
  currentContentDocument: undefined,

  /**
   * Current parent node object used when appending elements.
   * If unspecified, it will default to the window.document.body variable.
   */
  currentParentNode: undefined,

  /**
   * Helper method, allowing to easily create and manage a canvas element.
   *
   * @param {Number} width: specifies the width of the canvas
   * @param {Number} height: specifies the height of the canvas
   * @param {Boolean} append: true to append the canvas to the parent node
   * @param {String} id: optional, id for the created canvas element
   * @return {HTMLCanvasElement} the newly created canvas element
   */
  initCanvas: function(width, height, append, id) {
    if ("undefined" === typeof this.currentContentDocument) {
      this.currentContentDocument = document;
    }
    if ("undefined" === typeof this.currentParentNode) {
      this.currentParentNode = document.body;
    }

    var doc = this.currentContentDocument,
      node = this.currentParentNode,
      canvas;

    // this should never happen, but just in case
    if ("undefined" === typeof doc || doc === null ||
        "undefined" === typeof node || node === null) {

      return null;
    }

    // create the canvas element
    canvas = doc.createElement("canvas");
    canvas.setAttribute("style", "width: 100%; height: 100%;");
    canvas.width = width;
    canvas.height = height;
    canvas.id = id;

    // append the canvas element to the current parent node, if specified
    if (append) {
      this.append(canvas, node);
    }

    try {
      return canvas;
    }
    finally {
      doc = null;
      node = null;
      canvas = null;
    }
  },

  /**
   * Helper method, initializing a canvas stretching the entire window.
   * This is mostly likely useful in a plain html page with an empty body.
   *
   * @return {HTMLCanvasElement} the newly created canvas
   */
  initFullScreenCanvas: function() {
    var width = window.innerWidth,
      height = window.innerHeight,
      canvas = this.initCanvas(width, height, true);

    this.currentParentNode.setAttribute("style",
      "background: #000; margin: 0px; padding: 0px; overflow: hidden;");

    try {
      return canvas;
    }
    finally {
      canvas = null;
    }
  },

  /**
   * Appends an element to a specific node.
   *
   * @param {Object} element: the element to be appended
   * @param {Object} node: the node to append the element to
   */
  append: function(element, node) {
    try {
      node.appendChild(element);
    }
    finally {
      element = null;
      node = null;
    }
  },

  /**
   * Removes an element from the parent node.
   * @param {Object} element: the element to be removed
   */
  remove: function(element) {
    try {
      element.parentNode.removeChild(element);
    }
    finally {
      element = null;
    }
  },

  /**
   * Traverses a document object model and calls function for each node.
   * If the dom parameter is omitted, then the current content.document will
   * be used. The nodeCallback function will have the current node and depth
   * passed as parameters, and the readyCallback function will have the
   * maximum depth and total nodes passed as parameters.
   *
   * @param {Function} nodeCallback: the function to call for each node
   * @param {Function} readyCallback: called when no more nodes are found
   * @param {Boolean} traverseChildIframes: true if 'we need to go deeper'
   * @param {HTMLDocument} dom: the document object model to traverse
   */
  traverse: function(nodeCallback, readyCallback, traverseChildIframes, dom) {
    this.uid = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.sliceWidth = Number.MAX_VALUE;
    this.sliceHeight = Number.MAX_VALUE;

    // used to calculate the maximum depth of a dom node
    var maxDepth = 0,
      totalNodes = 0,

    // used internally for recursively traversing a document object model
    recursive = function(parent, depth) {
      var i, len, child, coord, offsetX, offsetY, sliceWidth, sliceHeight;

      for (i = 0, len = parent.childNodes.length; i < len; i++) {
        child = parent.childNodes[i];

        if (depth > maxDepth) {
          maxDepth = depth;
        }
        totalNodes++;
        this.uid++;

        // run the node callback function for each node, pass the depth
        nodeCallback(child, depth, totalNodes, this.uid,
          this.offsetX, this.offsetY, this.sliceWidth, this.sliceHeight);

        // also continue the recursion with all the children
        recursive(child, depth + 1);

        // iframes requrie special handling
        if (traverseChildIframes && child.localName === "iframe") {
          coord = Tilt.Document.getNodeCoordinates(child);
          offsetX = coord.x - window.content.pageXOffset;
          offsetY = coord.y - window.content.pageYOffset;
          sliceWidth = coord.width;
          sliceHeight = coord.height;

          this.offsetX += offsetX;
          this.offsetY += offsetY;
          this.sliceWidth = sliceWidth;
          this.sliceHeight = sliceHeight;
          recursive(child.contentDocument, depth + 1);
          this.offsetX -= offsetX;
          this.offsetY -= offsetY;
          this.sliceWidth = Number.MAX_VALUE;
          this.sliceHeight = Number.MAX_VALUE;
        }
      }
    }.bind(this);

    try {
      if ("function" === typeof nodeCallback) {
        recursive(dom || window.content.document, 0);
      }
      if ("function" === typeof readyCallback) {
        readyCallback(maxDepth, totalNodes);
      }
    }
    finally {
      dom = null;
    }
  },

  /**
   * Gets the full webpage dimensions (width and height);
   *
   * @param {Object} contentWindow: the content window holding the webpage
   * @return {Object} an object containing the width and height coords
   */
  getContentWindowDimensions: function(contentWindow) {
    var coords,
      size = {
        width: contentWindow.innerWidth + contentWindow.scrollMaxX,
        height: contentWindow.innerHeight + contentWindow.scrollMaxY
      };

    this.traverse(function(child) {
      coords = this.getNodeCoordinates(child);

      size.width = Math.max(size.width, coords.x||0 + coords.width||0);
      size.height = Math.max(size.height, coords.y||0 + coords.height||0);
    }.bind(this), null, contentWindow.document);

    return size;
  },

  /**
   * Returns a node's absolute x, y, width and height coordinates.
   *
   * @param {Object} node: the node which type needs to be analyzed
   * @return {Object} an object containing the x, y, width and height coords
   */
  getNodeCoordinates: function(node) {
    if (node.nodeType !== 1) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }

    var x, y, w, h, clientRect;

    try {
      if (window.content.location.href === "about:blank" &&
          (node.localName === "head" ||
           node.localName === "body")) {

        throw new Exception();
      }

      // this is the preferred way of getting the bounding client rectangle
      clientRect = node.getBoundingClientRect();
      x = window.content.pageXOffset;
      y = window.content.pageYOffset;

      // a bit more verbose than a simple array
      return {
        x: clientRect.left + x,
        y: clientRect.top + y,
        width: clientRect.width,
        height: clientRect.height
      };
    }
    catch(e) {
      x = 0;
      y = 0;
      w = node.clientWidth;
      h = node.clientHeight;

      // if the node isn't the parent of everything
      if (node.offsetParent) {
        // calculate the offset recursively
        do {
          x += node.offsetLeft;
          y += node.offsetTop;
        } while ((node = node.offsetParent));
      }
      else {
        // just get the x and y coordinates of this node if available
        if (node.x) {
          x = node.x;
        }
        if (node.y) {
          y = node.y;
        }
      }

      // a bit more verbose than a simple array
      return {
        x: x,
        y: y,
        width: w,
        height: h
      };
    }
    finally {
      node = null;
    }
  },

  /**
   * Returns the string equivalent of a node type.
   * If the node type is invalid, undefined is returned.
   *
   * @param {Object} node: the node which type needs to be analyzed
   * @return {String} the string equivalent of the node type
   */
  getNodeType: function(node) {
    var type;

    if (node.nodeType === 1) {
      type = "ELEMENT_NODE";
    }
    else if (node.nodeType === 2) {
      type = "ATTRIBUTE_NODE";
    }
    else if (node.nodeType === 3) {
      type = "TEXT_NODE";
    }
    else if (node.nodeType === 4) {
      type = "CDATA_SECTION_NODE";
    }
    else if (node.nodeType === 5) {
      type = "ENTITY_REFERENCE_NODE";
    }
    else if (node.nodeType === 6) {
      type = "ENTITY_NODE";
    }
    else if (node.nodeType === 7) {
      type = "PROCESSING_INSTRUCTION_NODE";
    }
    else if (node.nodeType === 8) {
      type = "COMMENT_NODE";
    }
    else if (node.nodeType === 9) {
      type = "DOCUMENT_NODE";
    }
    else if (node.nodeType === 10) {
      type = "DOCUMENT_TYPE_NODE";
    }
    else if (node.nodeType === 11) {
      type = "DOCUMENT_FRAGMENT_NODE";
    }
    else if (node.nodeType === 12) {
      type = "NOTATION_NODE";
    }

    try {
      return type;
    }
    finally {
      node = null;
    }
  },

  /**
   * Returns the attributes from a dom node as a string.
   *
   * @param {NamedNodeMap} attributes: attributes to be analyzed
   * @return {String} the custom attributes text
   */
  getAttributesString: function(attributes) {
    var attText = [],
      i, len;

    for (i = 0, len = attributes.length; i < len; i++) {
      attText.push(attributes[i].name + " = \"" + attributes[i].value + "\"");
    }

    return attText.join("\n") + "\n";
  },

  /**
   * Returns the modified css values from a computed style.
   *
   * @param {CSSComputedStyle} style: the style to analyze
   * @return {String} the custom css text
   */
  getModifiedCss: function(style) {
    var cssText = [], n, v, t, i,
      defaults = [
"background-attachment: scroll;",
"background-clip: border-box;",
"background-color: transparent;",
"background-image: none;",
"background-origin: padding-box;",
"background-position: 0% 0%;",
"background-repeat: repeat;",
"background-size: auto auto;",
"border-bottom-color: rgb(0, 0, 0);",
"border-bottom-left-radius: 0px;",
"border-bottom-right-radius: 0px;",
"border-bottom-style: none;",
"border-bottom-width: 0px;",
"border-collapse: separate;",
"border-left-color: rgb(0, 0, 0);",
"border-left-style: none;",
"border-left-width: 0px;",
"border-right-color: rgb(0, 0, 0);",
"border-right-style: none;",
"border-right-width: 0px;",
"border-spacing: 0px 0px;",
"border-top-color: rgb(0, 0, 0);",
"border-top-left-radius: 0px;",
"border-top-right-radius: 0px;",
"border-top-style: none;",
"border-top-width: 0px;",
"bottom: auto;",
"box-shadow: none;",
"caption-side: top;",
"clear: none;",
"clip: auto;",
"color: rgb(0, 0, 0);",
"content: none;",
"counter-increment: none;",
"counter-reset: none;",
"cursor: auto;",
"direction: ltr;",
"display: block;",
"empty-cells: -moz-show-background;",
"float: none;",
"font-family: serif;",
"font-size: 16px;",
"font-size-adjust: none;",
"font-stretch: normal;",
"font-style: normal;",
"font-variant: normal;",
"font-weight: 400;",
"height: 0px;",
"ime-mode: auto;",
"left: auto;",
"letter-spacing: normal;",
"line-height: 19.2px;",
"list-style-image: none;",
"list-style-position: outside;",
"list-style-type: disc;",
"margin-bottom: 8px;",
"margin-left: 8px;",
"margin-right: 8px;",
"margin-top: 8px;",
"marker-offset: auto;",
"max-height: none;",
"max-width: none;",
"min-height: 0px;",
"min-width: 0px;",
"opacity: 1;",
"outline-color: rgb(0, 0, 0);",
"outline-offset: 0px;",
"outline-style: none;",
"outline-width: 0px;",
"overflow: visible;",
"overflow-x: visible;",
"overflow-y: visible;",
"padding-bottom: 0px;",
"padding-left: 0px;",
"padding-right: 0px;",
"padding-top: 0px;",
"page-break-after: auto;",
"page-break-before: auto;",
"pointer-events: auto;",
"position: static;",
"quotes: \"“\" \"”\" \"‘\" \"’\";",
"resize: none;",
"right: auto;",
"table-layout: auto;",
"text-align: start;",
"text-decoration: none;",
"text-indent: 0px;",
"text-overflow: clip;",
"text-shadow: none;",
"text-transform: none;",
"top: auto;",
"unicode-bidi: embed;",
"vertical-align: baseline;",
"visibility: visible;",
"white-space: normal;",
"width: 1157px;",
"word-spacing: 0px;",
"word-wrap: normal;",
"z-index: auto;",
"-moz-animation-delay: 0s;",
"-moz-animation-direction: normal;",
"-moz-animation-duration: 0s;",
"-moz-animation-fill-mode: none;",
"-moz-animation-iteration-count: 1;",
"-moz-animation-name: none;",
"-moz-animation-play-state: running;",
"-moz-animation-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);",
"-moz-appearance: none;",
"-moz-background-inline-policy: continuous;",
"-moz-binding: none;",
"-moz-border-bottom-colors: none;",
"-moz-border-image: none;",
"-moz-border-left-colors: none;",
"-moz-border-right-colors: none;",
"-moz-border-top-colors: none;",
"-moz-box-align: stretch;",
"-moz-box-direction: normal;",
"-moz-box-flex: 0;",
"-moz-box-ordinal-group: 1;",
"-moz-box-orient: horizontal;",
"-moz-box-pack: start;",
"-moz-box-sizing: content-box;",
"-moz-column-count: auto;",
"-moz-column-gap: 16px;",
"-moz-column-rule-color: rgb(0, 0, 0);",
"-moz-column-rule-style: none;",
"-moz-column-rule-width: 0px;",
"-moz-column-width: auto;",
"-moz-float-edge: content-box;",
"-moz-font-feature-settings: normal;",
"-moz-font-language-override: normal;",
"-moz-force-broken-image-icon: 0;",
"-moz-hyphens: manual;",
"-moz-image-region: auto;",
"-moz-orient: horizontal;",
"-moz-outline-radius-bottomleft: 0px;",
"-moz-outline-radius-bottomright: 0px;",
"-moz-outline-radius-topleft: 0px;",
"-moz-outline-radius-topright: 0px;",
"-moz-stack-sizing: stretch-to-fit;",
"-moz-tab-size: 8;",
"-moz-text-blink: none;",
"-moz-text-decoration-color: rgb(0, 0, 0);",
"-moz-text-decoration-line: none;",
"-moz-text-decoration-style: solid;",
"-moz-transform: none;",
"-moz-transform-origin: 50% 50%;",
"-moz-transition-delay: 0s;",
"-moz-transition-duration: 0s;",
"-moz-transition-property: all;",
"-moz-transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);",
"-moz-user-focus: none;",
"-moz-user-input: auto;",
"-moz-user-modify: read-only;",
"-moz-user-select: auto;",
"-moz-window-shadow: default;",
"clip-path: none;",
"clip-rule: nonzero;",
"color-interpolation: srgb;",
"color-interpolation-filters: linearrgb;",
"dominant-baseline: auto;",
"fill: rgb(0, 0, 0);",
"fill-opacity: 1;",
"fill-rule: nonzero;",
"filter: none;",
"flood-color: rgb(0, 0, 0);",
"flood-opacity: 1;",
"image-rendering: auto;",
"lighting-color: rgb(255, 255, 255);",
"marker-end: none;",
"marker-mid: none;",
"marker-start: none;",
"mask: none;",
"shape-rendering: auto;",
"stop-color: rgb(0, 0, 0);",
"stop-opacity: 1;",
"stroke: none;",
"stroke-dasharray: none;",
"stroke-dashoffset: 0px;",
"stroke-linecap: butt;",
"stroke-linejoin: miter;",
"stroke-miterlimit: 4;",
"stroke-opacity: 1;",
"stroke-width: 1px;",
"text-anchor: start;",
"text-rendering: auto;"].join("\n");

    for (i = 0; i < style.length; i++) {
      n = style[i];
      v = style.getPropertyValue(n);
      t = n + ": " + v + ";";

      if (defaults.indexOf(t) === -1) {
        cssText.push(t);
      }
    }

    return cssText.join("\n") + "\n";
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Document);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Document", Tilt.Document);
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
var EXPORTED_SYMBOLS = ["Tilt.File"];

/*global Cc, Ci, Cu, Components, FileUtils, NetUtil */

Tilt.File = {

  /**
   * Shows a file or folder picker and returns the result.
   *
   * @param {String} message: the title for the picker
   * @param {String} type: either "file" or "folder"
   * @return {Object} the picked file if the returned OK, null otherwise
   */
  showPicker: function(message, type) {
    var fp, res, folder;

    try {
      fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      fp.init(window, message, type === "folder" ?
        Ci.nsIFilePicker.modeGetFolder :
        Ci.nsIFilePicker.modeOpen);

      if ((res = fp.show()) == Ci.nsIFilePicker.returnOK) {
        return fp.file;
      }
      else {
        return null;
      }
    }
    catch(e) {
      // running from an unprivileged environment
      Tilt.Console.error(e.message);
      return null;
    }
  },

  /**
   * Saves data into a file placed on the desktop.
   *
   * @param {String} data: the contents
   * @param {String} path: the path of the file
   * @return {Boolean} true if the save operation was succesful
   */
  save: function(data, path) {
    var file, ostream, istream, converter;

    try {
      Cu.import("resource://gre/modules/FileUtils.jsm");
      Cu.import("resource://gre/modules/NetUtil.jsm");

      file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
      file.initWithPath(path);

      ostream = FileUtils.openSafeFileOutputStream(file);

      converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
        createInstance(Ci.nsIScriptableUnicodeConverter);

      converter.charset = "UTF-8";
      istream = converter.convertToInputStream(data);

      NetUtil.asyncCopy(istream, ostream, function(status) {
        if (!Components.isSuccessCode(status)) {
          return true;
        }
        else {
          return false;
        }
      });
    }
    catch(e) {
      // running from an unprivileged environment
      Tilt.Console.error(e.message);
      return false;
    }
  },

  /**
   * Saves an image into a file placed on the desktop.
   *
   * @param {String} canvas: the contents
   * @param {String} path: the path of the file
   * @return {Boolean} true if the save operation was succesful
   */
  saveImage: function(canvas, path) {
    var file, io, source, target, persist;

    try {
      Cu.import("resource://gre/modules/FileUtils.jsm");
      Cu.import("resource://gre/modules/NetUtil.jsm");

      file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
      file.initWithPath(path);

      io = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

      source = io.newURI(canvas.toDataURL("image/png", ""), "UTF8", null);
      target = io.newFileURI(file);

      persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
        createInstance(Ci.nsIWebBrowserPersist);

      persist.persistFlags = Ci.nsIWebBrowserPersist.
        PERSIST_FLAGS_REPLACE_EXISTING_FILES;

      persist.persistFlags |= Ci.nsIWebBrowserPersist.
        PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

      persist.saveURI(source, null, null, null, null, file);
      return true;
    }
    catch(e) {
      // running from an unprivileged environment
      Tilt.Console.error(e.message);
      return false;
    }
  },

  /**
   * The file path separator, different on each platform.
   */
  separator: (function() {
    if (navigator.appVersion.indexOf("Win") !== -1) { return "\\"; }
    else if (navigator.appVersion.indexOf("Mac") !== -1) { return "/"; }
    else if (navigator.appVersion.indexOf("X11") !== -1) { return "/"; }
    else if (navigator.appVersion.indexOf("Linux") !== -1) { return "/"; }
    else { return "/"; }
  })()
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.File);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.File", Tilt.File);
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
var EXPORTED_SYMBOLS = ["Tilt.Math"];

/*global vec3, mat3, mat4, quat4 */

/**
 * Various math functions required by the engine.
 */
Tilt.Math = {

  /**
   * Helper function, converts degrees to radians.
   *
   * @param {Number} degrees: the degrees to be converted to radians
   * @return {Number} the degrees converted to radians
   */
  radians: function(degrees) {
    return degrees * 0.0174532925;
  },

  /**
   * Helper function, converts radians to degrees.
   *
   * @param {Number} radians: the radians to be converted to degrees
   * @return {Number} the radians converted to degrees
   */
  degrees: function(radians) {
    return radians * 57.2957795;
  },

  /**
   * Re-maps a number from one range to another.
   *
   * @param {Number} value: the number to map
   * @param {Number} low1: the normal lower bound of the number
   * @param {Number} high1: the normal upper bound of the number
   * @param {Number} low2: the new lower bound of the number
   * @param {Number} high2: the new upper bound of the number
   */
  map: function(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * ((value - low1) / (high1 - low1));
  },

  /**
   * Returns if number is power of two.
   *
   * @param {Number} x: the number to be verified
   * @return {Boolean} true if x is power of two
   */
  isPowerOfTwo: function(x) {
    return (x & (x - 1)) === 0;
  },

  /**
   * Returns the next closest power of two greater than a number.
   *
   * @param {Number} x: the number to be converted
   * @return {Number} the next closest power of two for x
   */
  nextPowerOfTwo: function(x) {
    var i;

    --x;
    for (i = 1; i < 32; i <<= 1) {
      x = x | x >> i;
    }
    return x + 1;
  },

  /**
   * A convenient way of limiting values to a set boundary.
   *
   * @param {Number} value: the number to be limited
   * @param {Number} min: the minimum allowed value for the number
   * @param {Number} max: the maximum allowed value for the number
   */
  clamp: function(value, min, max) {
    if (min > max) {
      var aux = min;
      min = max;
      max = aux;
    }
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Creates a rotation quaternion from axis-angle.
   * This function implies that the axis is a normalized vector.
   *
   * @param {Array} axis: an array of elements representing the [x, y, z] axis
   * @param {Number} angle: the angle of rotation
   * @param {Array} out: optional parameter, the array to write the values to
   * @return {Array} the quaternion as [x, y, z, w]
   */
  quat4fromAxis: function(axis, angle, out) {
    angle *= 0.5;

    var sin = Math.sin(angle),
        w = Math.cos(angle),
        x = (axis[0] * sin),
        y = (axis[1] * sin),
        z = (axis[2] * sin);

    if ("undefined" === typeof out) {
      return [x, y, z, w];
    }
    else {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    }
  },

  /**
   * Creates a rotation quaternion from Euler angles.
   *
   * @param {Number} yaw: the yaw angle of rotation
   * @param {Number} pitch: the pitch angle of rotation
   * @param {Number} roll: the roll angle of rotation
   * @param {Array} out: optional parameter, the array to write the values to
   * @return {Array} the quaternion as [x, y, z, w]
   */
  quat4fromEuler: function(yaw, pitch, roll, out) {
    // basically we create 3 quaternions, for pitch, yaw and roll
    // and multiply those together
    var w,
      x = pitch * 0.5,
      y = yaw   * 0.5,
      z = roll  * 0.5,

      sin = Math.sin,
      cos = Math.cos,
      sinr = sin(x),
      sinp = sin(y),
      siny = sin(z),
      cosr = cos(x),
      cosp = cos(y),
      cosy = cos(z);

    x = sinr * cosp * cosy - cosr * sinp * siny;
    y = cosr * sinp * cosy + sinr * cosp * siny;
    z = cosr * cosp * siny - sinr * sinp * cosy;
    w = cosr * cosp * cosy + sinr * sinp * siny;

    if ("undefined" === typeof out) {
      return [x, y, z, w];
    }
    else {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    }
  },

  /**
   * Projects a 3D point on a 2D plane.
   *
   * @param {Array} p: the [x, y, z] coordinates of the point to project
   * @param {Array} viewport: the viewport [x, y, width, height] coordinates
   * @param {Array} mvMatrix: the model view matrix
   * @param {Array} projMatrix: the projection matrix
   * @param {Array} out: optional parameter, the array to write the values to
   * @return {Array} the projected coordinates
   */
  project: function(p, viewport, mvMatrix, projMatrix, out) {
    var mvpMatrix, coordinates = quat4.create();

    // compute model view projection matrix
    if (projMatrix) {
      mat4.multiply(projMatrix, mvMatrix, mvpMatrix = mat4.create());
    }
    else {
      mvpMatrix = mvMatrix;
    }

    // now transform that vector into screen coordinates
    p[3] = 1; // remember the homogenous w coordinate!
    mat4.multiplyVec4(mvpMatrix, p, coordinates);

    if (projMatrix) {
      // transform the homogenous coordinates into screen space
      out[0]  =  coordinates[0] / coordinates[3];
      out[1]  =  coordinates[1] / coordinates[3];
      out[0] *=  viewport[2] * 0.5;
      out[1] *= -viewport[3] * 0.5;
      out[0] +=  viewport[2] * 0.5;
      out[1] +=  viewport[3] * 0.5;
      out[2]  =  0;
    }
    else {
      out[0] = coordinates[0];
      out[1] = coordinates[1];
      out[2] = coordinates[2];
    }

    return out;
  },

  /**
   * Port of gluUnProject.
   *
   * @param {Array} p: the [x, y, z] coordinates of the point to unproject;
   * the z value should range between 0 and 1, as the near/far clipping planes
   * @param {Array} viewport: the viewport [x, y, width, height] coordinates
   * @param {Array} mvMatrix: the model view matrix
   * @param {Array} projMatrix: the projection matrix
   * @param {Array} out: optional parameter, the array to write the values to
   * @return {Array} the unprojected coordinates
   */
  unproject: function(p, viewport, mvMatrix, projMatrix, out) {
    var mvpMatrix = mat4.create(), coordinates = out || quat4.create();

    // compute the inverse of the perspective x model view matrix
    mat4.multiply(projMatrix, mvMatrix, mvpMatrix);
    mat4.inverse(mvpMatrix);

    // transformation of normalized coordinates (-1 to 1)
    coordinates[0] = +((p[0] - viewport[0]) / viewport[2] * 2 - 1);
    coordinates[1] = -((p[1] - viewport[1]) / viewport[3] * 2 - 1);
    coordinates[2] = 2 * p[2] - 1;
    coordinates[3] = 1;

    // now transform that vector into object coordinates
    mat4.multiplyVec4(mvpMatrix, coordinates);

    // invert to normalize x, y, and z values.
    coordinates[3] = 1 / coordinates[3];
    coordinates[0] *= coordinates[3];
    coordinates[1] *= coordinates[3];
    coordinates[2] *= coordinates[3];

    return coordinates;
  },

  /**
   * Create a ray between two points using the current modelview & projection
   * matrices. This is useful when creating a ray destined for 3d picking.
   *
   * @param {Array} p0: the [x, y, z] coordinates of the first point
   * @param {Array} p1: the [x, y, z] coordinates of the second point
   * @param {Array} viewport: the viewport [x, y, width, height] coordinates
   * @param {Array} mvMatrix: the model view matrix
   * @param {Array} projMatrix: the projection matrix
   * @return {Object} a ray object containing the direction vector between
   * the two unprojected points, the position and the lookAt
   */
  createRay: function(p0, p1, viewport, mvMatrix, projMatrix) {
    // unproject the two points
    this.unproject(p0, viewport, mvMatrix, projMatrix, p0);
    this.unproject(p1, viewport, mvMatrix, projMatrix, p1);

    return {
      position: p0,
      lookAt: p1,
      direction: vec3.normalize(vec3.subtract(p1, p0))
    };
  },

  /**
   * Intersect a ray with a 3D triangle.
   *
   * @param {Array} v0: the [x, y, z] position of the first triangle point
   * @param {Array} v1: the [x, y, z] position of the second triangle point
   * @param {Array} v2: the [x, y, z] position of the third triangle point
   * @param {Object} ray: a ray, containing position and direction vectors
   * @param {Array} intersection: point to store the intersection to
   * @return {Number} -1 if the triangle is degenerate,
   *                   0 disjoint (no intersection)
   *                   1 intersects in unique point
   *                   2 the ray and the triangle are in the same plane
   */
  intersectRayTriangle: function(v0, v1, v2, ray, intersection) {
    var u = vec3.create(),
        v = vec3.create(),
        n = vec3.create(),
        w = vec3.create(),
        w0 = vec3.create(),
        pos = ray.position,
        dir = ray.direction,
        a, b, r, uu, uv, vv, wu, wv, D, s, t;

    if ("undefined" === typeof intersection) {
      intersection = vec3.create();
    }

    // get triangle edge vectors and plane normal
    vec3.subtract(v1, v0, u);
    vec3.subtract(v2, v0, v);

    // get the cross product
    vec3.cross(u, v, n);

    // check if triangle is degenerate
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) {
      return -1;
    }

    vec3.subtract(pos, v0, w0);
    a = -vec3.dot(n, w0);
    b = +vec3.dot(n, dir);

    if (Math.abs(b) < 0.0001) { // ray is parallel to triangle plane
      if (a === 0) {
        return 2; // ray lies in triangle plane
      }
      else {
        return 0; // ray disjoint from plane
      }
    }

    // get intersect point of ray with triangle plane
    r = a / b;
    if (r < 0) { // ray goes away from triangle
      return 0;  // no intersection
    }

    // intersect point of ray and plane
    vec3.add(pos, vec3.scale(dir, r), intersection);

    // check if the intersection is inside the triangle
    uu = vec3.dot(u, u);
    uv = vec3.dot(u, v);
    vv = vec3.dot(v, v);

    vec3.subtract(intersection, v0, w);
    wu = vec3.dot(w, u);
    wv = vec3.dot(w, v);

    D = uv * uv - uu * vv;

    // get and test parametric coords
    s = (uv * wv - vv * wu) / D;
    if (s < 0 || s > 1) {
      return 0; // intersection is outside the triangle
    }

    t = (uv * wu - uu * wv) / D;
    if (t < 0 || (s + t) > 1) {
      return 0; // intersection is outside the triangle
    }

    return 1; // intersection is inside the triangle
  },

  /**
   * Converts hue to rgb.
   *
   * @param {Number} p: the first argument
   * @param {Number} q: the second argument
   * @param {Number} t: the third argument
   */
  hue2rgb: function(p, q, t) {
    if (t < 0) { t += 1; }
    else if (t > 1) { t -= 1; }
    else if (t < 0.166666667) { return p + (q - p) * 6 * t; }
    else if (t < 0.5) { return q; }
    else if (t < 0.666666667) { return p + (q - p) * (2 / 3 - t) * 6; }

    return p;
  },

  /**
   * Converts an RGB color value to HSL. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * Assumes r, g, and b are contained in the set [0, 255] and
   * returns h, s, and l in the set [0, 1].
   *
   * @param {Number} r: the red color value
   * @param {Number} g: the green color value
   * @param {Number} b: the blue color value
   * @return {Array} the HSL representation
   */
  rgb2hsl: function(r, g, b) {
    r *= 0.00392156863;
    g *= 0.00392156863;
    b *= 0.00392156863;

    var max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d, h, s, l = (max + min) * 0.5;

    if (max === min) {
      h = s = 0; // achromatic
    }
    else {
      d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
      }
      else if (max === g) {
        h = (b - r) / d + 2;
      }
      else if (max === b) {
        h = (r - g) / d + 4;
      }

      h /= 6;
    }

    return [h, s, l];
  },

  /**
   * Converts an HSL color value to RGB. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * Assumes h, s, and l are contained in the set [0, 1] and
   * returns r, g, and b in the set [0, 255].
   *
   * @param {Number} h: the hue
   * @param {Number} s: the saturation
   * @param {Number} l: the lightness
   * @return {Array} the RGB representation
   */
  hsl2rgb: function(h, s, l) {
    var r, g, b, q, p;

    if (s === 0) {
      r = g = b = l; // achromatic
    }
    else {
      q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      p = 2 * l - q;

      r = this.hue2rgb(p, q, h + 0.333333333);
      g = this.hue2rgb(p, q, h);
      b = this.hue2rgb(p, q, h - 0.333333333);
    }

    return [r * 255, g * 255, b * 255];
  },

  /**
   * Converts an RGB color value to HSV. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
   * Assumes r, g, and b are contained in the set [0, 255] and
   * returns h, s, and v in the set [0, 1].
   *
   * @param {Number} r: the red color value
   * @param {Number} g: the green color value
   * @param {Number} b: the blue color value
   * @return {Array} the HSV representation
   */
  rgb2hsv: function(r, g, b) {
    r *= 0.00392156863;
    g *= 0.00392156863;
    b *= 0.00392156863;

    var max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d, h, s, v = max;

    d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0; // achromatic
    }
    else {
      if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
      }
      else if (max === g) {
        h = (b - r) / d + 2;
      }
      else if (max === b) {
        h = (r - g) / d + 4;
      }

      h /= 6;
    }

    return [h, s, v];
  },

  /**
   * Converts an HSV color value to RGB. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
   * Assumes h, s, and v are contained in the set [0, 1] and
   * returns r, g, and b in the set [0, 255].
   *
   * @param {Number} h: the hue
   * @param {Number} s: the saturation
   * @param {Number} v: the value
   * @return {Array} the RGB representation
   */
  hsv2rgb: function(h, s, v) {
    var r, g, b,
      i = Math.floor(h * 6),
      f = h * 6 - i,
      p = v * (1 - s),
      q = v * (1 - f * s),
      t = v * (1 - (1 - f) * s),
      im6 = i % 6;

    if (im6 === 0) {
      r = v; g = t; b = p;
    }
    else if (im6 === 1) {
      r = q; g = v; b = p;
    }
    else if (im6 === 2) {
      r = p; g = v; b = t;
    }
    else if (im6 === 3) {
      r = p; g = q; b = v;
    }
    else if (im6 === 4) {
      r = t; g = p; b = v;
    }
    else if (im6 === 5) {
      r = v; g = p; b = q;
    }

    return [r * 255, g * 255, b * 255];
  },

  /**
   * Converts a hex color to rgba.
   *
   * @param {String} a color expressed in hex, or using rgb() or rgba()
   * @return {Array} an array with 4 color components: red, green, blue, alpha
   * with ranges from 0..1
   */
  hex2rgba: function(color) {
    var hex = color.charAt(0) === "#" ? color.substring(1) : color,
      value, rgba, r, g, b, a, cr, cg, cb, ca;

    if ("undefined" !== typeof this[hex]) {
      return this[hex];
    }
    else {
      value = window.parseInt(hex, 16);
    }

    // e.g. "f00"
    if (hex.length === 3) {
      r = ((value & 0xf00) >> 8) * 0.062745098;
      g = ((value & 0x0f0) >> 4) * 0.062745098;
      b = ((value & 0x00f)     ) * 0.062745098;
      a = 1;

      return (this[hex] = [r, g, b, a]);
    }
    // e.g. "f008"
    else if (hex.length === 4) {
      r = ((value & 0xf000) >> 12) * 0.062745098;
      g = ((value & 0x0f00) >> 8 ) * 0.062745098;
      b = ((value & 0x00f0) >> 4 ) * 0.062745098;
      a = ((value & 0x000f)      ) * 0.062745098;

      return (this[hex] = [r, g, b, a]);
    }
    // e.g. "ff0000"
    else if (hex.length === 6) {
      r = ((value & 0xff0000) >> 16) * 0.00392156863;
      g = ((value & 0x00ff00) >> 8 ) * 0.00392156863;
      b = ((value & 0x0000ff)      ) * 0.00392156863;
      a = 1;

      return (this[hex] = [r, g, b, a]);
    }
    // e.g. "f0088"
    else if (hex.length === 5) {
      r = ((value & 0xf0000) >> 12) / 255;
      g = ((value & 0x0f000) >> 8 ) / 255;
      b = ((value & 0x00f00) >> 4 ) / 255;
      a = ((value & 0x000f0)      ) / 255;

      return (this[hex] = [r, g, b, a]);
    }
    // e.g "ff0000aa"
    else if (hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16) * 0.00392156863;
      g = parseInt(hex.substring(2, 4), 16) * 0.00392156863;
      b = parseInt(hex.substring(4, 6), 16) * 0.00392156863;
      a = parseInt(hex.substring(6, 8), 16) * 0.00392156863;

      return (this[hex] = [r, g, b, a]);
    }
    // e.g. "rgba(255, 0, 0, 128)"
    else if (hex.match("^rgba") == "rgba") {
      rgba = hex.substring(5, hex.length - 1).split(',');
      rgba[0] *= 0.00392156863;
      rgba[1] *= 0.00392156863;
      rgba[2] *= 0.00392156863;
      rgba[3] *= 0.00392156863;

      return (this[hex] = rgba);
    }
    // e.g. "rgb(255, 0, 0)"
    else if (hex.match("^rgb") == "rgb") {
      rgba = hex.substring(4, hex.length - 1).split(',');
      rgba[0] *= 0.00392156863;
      rgba[1] *= 0.00392156863;
      rgba[2] *= 0.00392156863;
      rgba[3] = 1;

      return (this[hex] = rgba);
    }
    // your argument is invalid
    else {
      return (this[hex] = [0, 0, 0, 1]);
    }
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Math);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Math", Tilt.Math);
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
var EXPORTED_SYMBOLS = ["Tilt.Random"];

Tilt.Random = {

  /**
   * The generator function, automatically created with seed 0.
   */
  $generator: null,

  /**
   * Returns a new random number between [0..1)
   */
  next: function() {
    return this.$generator();
  },

  /**
   * From http://baagoe.com/en/RandomMusings/javascript/
   * Johannes Baagøe <baagoe@baagoe.com>, 2010
   *
   * Seeds a random generator function with a set of passed arguments.
   */
  seed: function() {
    var s0 = 0,
      s1 = 0,
      s2 = 0,
      c = 1, i, random;

    if (arguments.length === 0) {
      return this.seed(+new Date());
    }
    else {
      s0 = this.mash(' ');
      s1 = this.mash(' ');
      s2 = this.mash(' ');

      for (i = 0; i < arguments.length; i++) {
        s0 -= this.mash(arguments[i]);
        if (s0 < 0) {
          s0 += 1;
        }
        s1 -= this.mash(arguments[i]);
        if (s1 < 0) {
          s1 += 1;
        }
        s2 -= this.mash(arguments[i]);
        if (s2 < 0) {
          s2 += 1;
        }
      }

      random = function() {
        var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
        s0 = s1;
        s1 = s2;

        return (s2 = t - (c = t | 0));
      };
      random.uint32 = function() {
        return random() * 0x100000000; // 2^32
      };
      random.fract53 = function() {
        return random() +
              (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
      };

      return (this.$generator = random);
    }
  },

  /**
   * From http://baagoe.com/en/RandomMusings/javascript/
   * Johannes Baagøe <baagoe@baagoe.com>, 2010
   */
  mash: function(data) {
    var i, h, n = 0xefc8249d;

    data = data.toString();
    for (i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }

    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.Random);

// automatically seed the random function with a specified value
Tilt.Random.seed(0);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.Random", Tilt.Random);
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
var EXPORTED_SYMBOLS = ["Tilt.String"];

/**
 * Helper functions for manipulating strings.
 */
Tilt.String = {

  /**
   * Trims whitespace characters from the left and right side of a string.
   *
   * @param {String} str: the string to trim
   * @return {String} the trimmed string
   */
  trim: function(str) {
    return str.replace(/^\s+|\s+$/g, "");
  },

  /**
   * Trims whitespace characters from the left side a string.
   *
   * @param {String} str: the string to trim
   * @return {String} the trimmed string
   */
  ltrim: function(str) {
    return str.replace(/^\s+/, "");
  },

  /**
   * Trims whitespace characters from the right side a string.
   *
   * @param {String} str: the string to trim
   * @return {String} the trimmed string
   */
  rtrim: function(str) {
    return str.replace(/\s+$/, "");
  }
};

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.String", Tilt.String);
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
var EXPORTED_SYMBOLS = ["Tilt.WebGL"];

/**
 * WebGL extensions
 */
Tilt.WebGL = {

  /**
   * This shim renders a content window to a canvas element, but clamps the
   * maximum width and height of the canvas to MAX_TEXTURE_SIZE.
   *
   * @param {Window} contentWindow: the window content to draw
   * @return {HTMLCanvasElement} the document image canvas
   */
  initDocumentImage: function(contentWindow) {
    var canvasgl, canvas, gl, ctx, maxSize, size, width, height;

    // use a canvas and a WebGL context to get the maximum texture size
    canvasgl = Tilt.Document.initCanvas();

    // use a custom canvas element and a 2d context to draw the window
    canvas = Tilt.Document.initCanvas();

    // create the WebGL context
    gl = Tilt.Renderer.prototype.create3DContext(canvasgl);
    maxSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0;
    maxSize /= 2;

    if (maxSize > 0) {
      // calculate the total width and height of the content page
      size = Tilt.Document.getContentWindowDimensions(contentWindow);

      // calculate the valid width and height of the content page
      width = Tilt.Math.clamp(size.width, 0, maxSize);
      height = Tilt.Math.clamp(size.height, 0, maxSize);

      canvas.width = width;
      canvas.height = height;

      // use the 2d context.drawWindow() magic
      ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawWindow(contentWindow, 0, 0, width, height, "#fff");
    }

    try {
      return canvas;
    }
    finally {
      canvasgl = null;
      canvas = null;
      gl = null;
      ctx = null;
    }
  },


  /**
   * Refreshes a sub area of a canvas with new pixel information from a
   * content window.
   *
   * @param {Window} contentWindow: the window content to draw
   * @param {HTMLCanvasElement} canvas: the canvas to refresh
   * @param {BoundingClientRect} rect: the bounding client rect
   * @param {Boolean} overwrite: true to overwrite on the same canvas
   * return {HTMLCanvasElement} the new canvas
   */
  refreshDocumentImage: function(contentWindow, canvas, rect, overwrite) {
    var ctx,
      left = rect.left,
      top = rect.top,
      width = rect.width,
      height = rect.height;

    // we can just overwrite the existing canvas with the new image data for a
    // specific rectangular region
    if (overwrite) {
      ctx = canvas.getContext("2d");
      ctx.translate(left, top);
      ctx.drawWindow(contentWindow, left, top, width, height, "#fff");
      ctx.translate(-left, -top);

      return canvas;
    }
    // or, use a new canvas with the necessary width and height and image data
    // drawn from the top left corner
    else {
      // we'll cache a canvas to avoid creating it every single time
      if (this.$canvas) {
        this.$canvas.width = width;
        this.$canvas.height = height;

        // use a 2d context to draw the window
        ctx = this.$canvas.getContext("2d");
        ctx.drawWindow(contentWindow, left, top, width, height, "#fff");

        return this.$canvas;
      }
      // if the canvas wasn't already created, create it & continue refreshing
      else if ("undefined" === typeof this.$canvas) {
        this.$canvas = Tilt.Document.initCanvas();
        return this.refreshDocumentImage(contentWindow, canvas, rect);
      }
      // something went horribly wrong, clean up the mess if there was any
      else {
        this.$canvas = null;
        delete this.$canvas;
      }
    }

    return null;
  }
};

// bind the owner object to the necessary functions
Tilt.bindObjectFunc(Tilt.WebGL);

// intercept this object using a profiler when building in debug mode
Tilt.Profiler.intercept("Tilt.WebGL", Tilt.WebGL);
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
