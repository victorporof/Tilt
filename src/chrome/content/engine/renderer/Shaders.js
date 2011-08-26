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
