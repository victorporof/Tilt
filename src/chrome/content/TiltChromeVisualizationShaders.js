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

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.Shaders"];

TiltChrome.Shaders = {};

/**
 * A custom visualization shader.
 *
 * @param {Attribute} vertexPosition: the vertex position
 * @param {Attribute} vertexTexCoord: texture coordinates used by the sampler
 * @param {Attribute} vertexColor: specific [r, g, b] color for each vertex
 * @param {Uniform} mvMatrix: the model view matrix
 * @param {Uniform} projMatrix: the projection matrix
 * @param {Uniform} tint: the color to multiply the sampled pixel with
 * @param {Uniform} alpha: the texture alpha color, blended with the tint
 * @param {Uniform} sampler: the texture sampler to fetch the pixels from
 */
TiltChrome.Shaders.Visualization = {

  /**
   * Vertex shader.
   */
  vs: [
"attribute vec3 vertexPosition;",
"attribute vec2 vertexTexCoord;",
"attribute vec3 vertexColor;",

"uniform mat4 mvMatrix;",
"uniform mat4 projMatrix;",

"varying vec2 texCoord;",
"varying vec3 color;",

"void main(void) {",
"  gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);",
"  texCoord = vertexTexCoord;",
"  color = vertexColor;",
"}"
].join("\n"),

  /**
   * Fragment shader.
   */
  fs: [
"#ifdef GL_ES",
"precision lowp float;",
"#endif",

"uniform vec4 tint;",
"uniform float alpha;",
"uniform sampler2D sampler;",

"varying vec2 texCoord;",
"varying vec3 color;",

"void main(void) {",
"  if (texCoord.x < 0.0) {",
"    gl_FragColor = vec4(color.r, color.g, color.b, tint.a);",
"  }",
"  else {",
"    vec3 texture = texture2D(sampler, texCoord).rgb;",
"    gl_FragColor = tint * alpha * vec4(texture, 1.0) + tint * (1.0 - alpha);",
"  }",
"}"
].join("\n")
};
