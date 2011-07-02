/*
 * jTiltControllers.js - Easy to use camera controllers for Tilt
 * version 0.1
 *
 * Copyright (c) 2011 Victor Porof
 *
 * This software is provided "as-is", without any express or implied
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

if ("undefined" == typeof(Tilt)) {
  var Tilt = {};
};

/**
 * This is a general purpose 3D rotation controller described by Ken Shoemake
 * in the Graphics Interface ’92 Proceedings. It features good behavior
 * easy implementation, cheap execution, & optional axis constrain.
 *
 * @param {number} width: the width of canvas
 * @param {number} height: the height of canvas
 * @param {number} radius: optional, the radius of the arcball
 * @return {object} the created object
 */
Tilt.Arcball = function(width, height, radius) {
  
  /**
   * By convention, we make a private "that" variable.
   */
  var that = this;
  
  /**
   * Values retaining the current horizontal and vertical mouse coordinates.
   */
  var mouseX = 0;
  var mouseY = 0;
  var mouseDragX = 0;
  var mouseDragY = 0;
  var mouseScroll = 0; // additionally, this implementation also handles zoom
  
  /**
   * The vectors representing the mouse coordinates mapped on the arcball
   * and their perpendicular converted from (x, y) to (x, y, z) at specific 
   * events like mousePressed and mouseDragged.
   */
  var startVec = vec3.create();
  var endVec = vec3.create();
  var pVec = vec3.create();
  
  /**
   * The corresponding rotation quaternions created using the mouse vectors.
   */
  var lastRot = quat4.create([0, 0, 0, 1]);
  var deltaRot = quat4.create([0, 0, 0, 1]);
  var currentRot = quat4.create([0, 0, 0, 1]);
  
  /**
   * The zoom, calculated using mouse scroll deltas.
   */
  var currentZoom = 0;
  
  /**
   * Call this function whenever you need the updated rotation quaternion
   * and the zoom amount. These values will be returned as "rotation" & "zoom"
   * properties inside an object.
   *
   * @param {number} frameDelta: optional, pass deltas for smooth animations
   * @return {object} the rotation quaternion and the zoom amount
   */
  this.loop = function(frameDelta) {
    if ("undefined" === typeof(frameDelta)) {
      frameDelta = 0.25;
    }
    else {
      // this should be in the (0..1) interval
      frameDelta = Tilt.Math.clamp(frameDelta / 100, 0.01, 0.99);
    }
    
	  // update the zoom based on the mouse scroll
    currentZoom += (mouseScroll - currentZoom) * frameDelta;
    
    // update the mouse coordinates
    mouseX += (mouseDragX - mouseX) * frameDelta;
    mouseY += (mouseDragY - mouseY) * frameDelta;
    that.pointToSphere(mouseX, mouseY, endVec);
    
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
	  
	  // calculate the current rotation using the delta quaternion
    return {
      rotation: quat4.multiply(lastRot, deltaRot, currentRot),
      zoom: currentZoom
    };
  };
  
  /**
   * Function handling the mousePressed event.
   * Call this when the mouse was pressed.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  this.mousePressed = function(x, y) {
    mouseX = x;
    mouseY = y;
    
    that.pointToSphere(mouseX, mouseY, startVec);
    quat4.set(currentRot, lastRot);
  };
  
  /**
   * Function handling the mouseDragged event.
   * Call this when the mouse was dragged.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   */
  this.mouseDragged = function(x, y) {
    mouseDragX = x;
    mouseDragY = y;
  };
  
  /**
   * Function handling the mouseScroll event.
   * Call this when the mouse wheel was scrolled.
   *
   * @param {number} scroll: the mouse wheel direction and speed
   */
  this.mouseScroll = function(scroll) {
    mouseScroll -= scroll * 10;
  };
  
  /**
   * Maps the 2d coordinates of the mouse location to a 3d point on a sphere.
   *
   * @param {number} x: the current horizontal coordinate of the mouse
   * @param {number} y: the current vertical coordinate of the mouse
   * @param {array} sphereVec: a 3d vector to store the sphere coordinates
   */
  this.pointToSphere = function(x, y, sphereVec) {
    // adjust point coords and scale down to range of [-1..1]
    x = (x - this.width / 2) / this.radius;
    y = (y - this.height / 2) / this.radius;
    
    // compute the square length of the vector to the point from the center
    var length = x * x + y * y;
    
    // if the point is mapped outside of the sphere  
    if (length > 1) {    
      // calculate the normalization factor
      var normal = 1 / Math.sqrt(length);
      
      // set the normalized vector (a point on the sphere)
      sphereVec[0] = x * normal;
      sphereVec[1] = y * normal;
      sphereVec[2] = 0;
    }
    else {
      // set the vector to a point mapped inside the sphere
      sphereVec[0] = x;
      sphereVec[1] = y;
      sphereVec[2] = Math.sqrt(1 - length);
    }
  };
  
  /**
   * Resize this implementation to use different bounds.
   * This function is automatically called when the arcball is created.
   *
   * @param {number} width: the width of canvas
   * @param {number} height: the height of canvas
   * @param {number} radius: optional, the radius of the arcball
   */
  (this.resize = function(width, height, radius) {
    // set the new width, height and radius dimensions
    that.width = width;
    that.height = height;
    that.radius = "undefined" !== typeof(radius) ? radius : height;
    
    that.pointToSphere(mouseX, mouseY, startVec);
    quat4.set(currentRot, lastRot);
    
    // automatically call this function
  })(width, height, radius);
  
  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function() {
    for (var i in that) {
      that[i] = null;
    }
    
    startVec = null;
    endVec = null;
    pVec = null;
    
    lastRot = null;
    deltaRot = null;
    currentRot = null;
    
    that = null;
  };
};