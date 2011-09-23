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
