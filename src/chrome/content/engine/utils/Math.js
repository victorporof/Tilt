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
