/*
 * Cache.js - The cached variables from the engine
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
var EXPORTED_SYMBOLS = ["Tilt.activeShader", "Tilt.enabledAttributes"];

/* All cached variables begin with the $ sign, for easy spotting
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
  Tilt.$gl = null;
  Tilt.$renderer = null;
  Tilt.$activeShader = -1;
  Tilt.$enabledAttributes = -1;
  Tilt.$loadedTextures = {};

  Tilt.GLSL.$count = 0;
  Tilt.TextureUtils.$count = 0;
};

/**
 * Destroys an object and deletes all members.
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
      delete scope[i];
    }
  }
}
