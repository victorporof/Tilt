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
