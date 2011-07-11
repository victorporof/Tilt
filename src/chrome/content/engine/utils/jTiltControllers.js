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

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.Arcball"];

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
	 * Values retaining the current horizontal and vertical mouse coordinates.
	 */
	this.mouseX = 0;
	this.mouseY = 0;
	this.mouseDragX = 0;
	this.mouseDragY = 0;

	/**
	 * Additionally, this implementation also handles zoom.
	 */
	this.scrollValue = 0;

	/**
	 * The vectors representing the mouse coordinates mapped on the arcball
	 * and their perpendicular converted from (x, y) to (x, y, z) at specific 
	 * events like mousePressed and mouseDragged.
	 */
	this.startVec = vec3.create();
	this.endVec = vec3.create();
	this.pVec = vec3.create();

	/**
	 * The corresponding rotation quaternions created using the mouse vectors.
	 */
	this.lastRot = quat4.create([0, 0, 0, 1]);
	this.deltaRot = quat4.create([0, 0, 0, 1]);
	this.currentRot = quat4.create([0, 0, 0, 1]);

	/**
	 * The zoom, calculated using mouse scroll deltas.
	 */
	this.currentZoom = 0;

	/**
	 * Set the current dimensions of the arcball.
	 */
	this.resize(width, height, radius);
};

Tilt.Arcball.prototype = {

	/**
	 * Call this function whenever you need the updated rotation quaternion
	 * and the zoom amount. These values will be returned as "rotation" & "zoom"
	 * properties inside an object.
	 *
	 * @param {number} frameDelta: optional, pass deltas for smooth animations
	 * @return {object} the rotation quaternion and the zoom amount
	 */
	loop: function(frameDelta) {
		if ("undefined" === typeof frameDelta) {
			frameDelta = 0.25;
		} else {
			// this should be in the (0..1) interval
			frameDelta = Tilt.Math.clamp(frameDelta / 100, 0.01, 0.99);
		}

		// update the zoom based on the mouse scroll
		this.currentZoom += (this.scrollValue - this.currentZoom) * frameDelta;

		// update the mouse coordinates
		this.mouseX += (this.mouseDragX - this.mouseX) * frameDelta;
		this.mouseY += (this.mouseDragY - this.mouseY) * frameDelta;

		var radius = this.radius,
			width = this.width,
			height = this.height,
			mouseX = this.mouseX,
			mouseY = this.mouseY;

		// find the sphere coordinates of the mouse positions
		this.pointToSphere(mouseX, mouseY, width, height, radius, this.endVec);

		// compute the vector perpendicular to the start & end vectors
		vec3.cross(this.startVec, this.endVec, this.pVec);

		// if the begin and end vectors don't coincide
		if (vec3.length(this.pVec) > 0) {
			this.deltaRot[0] = this.pVec[0];
			this.deltaRot[1] = this.pVec[1];
			this.deltaRot[2] = this.pVec[2];

			// in the quaternion values, w is cosine (theta / 2),
			// where theta is the rotation angle
			this.deltaRot[3] = -vec3.dot(this.startVec, this.endVec);
		} else {
			// return an identity rotation quaternion
			this.deltaRot[0] = 0;
			this.deltaRot[1] = 0;
			this.deltaRot[2] = 0;
			this.deltaRot[3] = 1;
		}

		// calculate the current rotation using the delta quaternion
		return {
			rotation: quat4.multiply(this.lastRot, this.deltaRot, this.currentRot),
			zoom: this.currentZoom
		};
	},

	/**
	 * Function handling the mousePressed event.
	 * Call this when the mouse was pressed.
	 *
	 * @param {number} x: the current horizontal coordinate of the mouse
	 * @param {number} y: the current vertical coordinate of the mouse
	 */
	mousePressed: function(x, y) {
		this.mouseX = x;
		this.mouseY = y;

		var radius = this.radius,
			width = this.width,
			height = this.height,
			mouseX = this.mouseX,
			mouseY = this.mouseY;

		this.pointToSphere(mouseX, mouseY, width, height, radius, this.startVec);
		quat4.set(this.currentRot, this.lastRot);
	},

	/**
	 * Function handling the mouseDragged event.
	 * Call this when the mouse was dragged.
	 *
	 * @param {number} x: the current horizontal coordinate of the mouse
	 * @param {number} y: the current vertical coordinate of the mouse
	 */
	mouseDragged: function(x, y) {
		this.mouseDragX = x;
		this.mouseDragY = y;
	},

	/**
	 * Function handling the mouseScroll event.
	 * Call this when the mouse wheel was scrolled.
	 *
	 * @param {number} scroll: the mouse wheel direction and speed
	 */
	mouseScroll: function(scroll) {
		this.scrollValue -= scroll * 10;
	},

	/**
	 * Maps the 2d coordinates of the mouse location to a 3d point on a sphere.
	 *
	 * @param {number} x: the current horizontal coordinate of the mouse
	 * @param {number} y: the current vertical coordinate of the mouse
	 * @param {number} width: the width of canvas
	 * @param {number} height: the height of canvas
	 * @param {number} radius: optional, the radius of the arcball
	 * @param {array} sphereVec: a 3d vector to store the sphere coordinates
	 */
	pointToSphere: function(x, y, width, height, radius, sphereVec) {
		// adjust point coords and scale down to range of [-1..1]
		x = (x - width / 2) / radius;
		y = (y - height / 2) / radius;

		// compute the square length of the vector to the point from the center
		var sqlength = x * x + y * y,
			normal = 0;

		// if the point is mapped outside of the sphere  
		if (sqlength > 1) {
			// calculate the normalization factor
			normal = 1 / Math.sqrt(sqlength);

			// set the normalized vector (a point on the sphere)
			sphereVec[0] = x * normal;
			sphereVec[1] = y * normal;
			sphereVec[2] = 0;
		} else {
			// set the vector to a point mapped inside the sphere
			sphereVec[0] = x;
			sphereVec[1] = y;
			sphereVec[2] = Math.sqrt(1 - sqlength);
		}
	},

	/**
	 * Resize this implementation to use different bounds.
	 * This function is automatically called when the arcball is created.
	 *
	 * @param {number} width: the width of canvas
	 * @param {number} height: the height of canvas
	 * @param {number} radius: optional, the radius of the arcball
	 */
	resize: function(newWidth, newHeight, newRadius) {
		// set the new width, height and radius dimensions
		this.width = newWidth;
		this.height = newHeight;
		this.radius = "undefined" !== typeof newRadius ? newRadius : newHeight;

		var radius = this.radius,
			width = this.width,
			height = this.height,
			mouseX = this.mouseX,
			mouseY = this.mouseY;

		this.pointToSphere(mouseX, mouseY, width, height, radius, this.startVec);
		quat4.set(this.currentRot, this.lastRot);
	},

	/**
	 * Destroys this object and sets all members to null.
	 */
	destroy: function() {
		for (var i in this) {
		  if ("function" === typeof this[i].destroy) {
		    this[i].destroy();
		  }
			this[i] = null;
		}
	}
};
