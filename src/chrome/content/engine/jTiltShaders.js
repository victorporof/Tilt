/* 
 * jTiltShaders.js - Various simple shaders used internally by Tilt
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
if ("undefined" === typeof(TiltShaders)) {
  var TiltShaders = {};
}

/**
 * A color shader. The only useful thing it does is set the gl_FragColor.
 *
 * @param {attribute} vertexPosition: the vertex position
 * @param {uniform} mvMatrix: the model view matrix
 * @param {uniform} projMatrix: the projection matrix
 * @param {uniform} color: the color to set the gl_FragColor to
 */  
TiltShaders.Color = {

  vs: [
"attribute vec3 vertexPosition;",

"uniform mat4 mvMatrix;",
"uniform mat4 projMatrix;",

"void main(void) {",
"    gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);",
"}"
].join("\n"),

  fs: [
"#ifdef GL_ES",
"precision highp float;",
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
 * @param {attribute} vertexPosition: the vertex position
 * @param {attribute} vertexTexCoord: texture coordinates used by the sampler
 * @param {uniform} mvMatrix: the model view matrix
 * @param {uniform} projMatrix: the projection matrix
 * @param {uniform} color: the color to multiply the sampled pixel with
 */
TiltShaders.Texture = {

  vs: [
"attribute vec3 vertexPosition;",
"attribute vec2 vertexTexCoord;",

"uniform mat4 mvMatrix;",
"uniform mat4 projMatrix;",

"varying vec2 texCoord;",

"void main(void) {",
"    gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);",
"    texCoord = vertexTexCoord;",
"}"
].join("\n"),

  fs: [
"#ifdef GL_ES",
"precision highp float;",
"#endif",

"uniform vec4 color;",
"uniform sampler2D sampler;",

"varying vec2 texCoord;",

"void main(void) {",
"    vec4 tex = texture2D(sampler, vec2(texCoord.s, texCoord.t));",
"    gl_FragColor = color * tex;",
"}"
].join("\n")
};