#ifdef GL_ES
precision highp float;
#endif

uniform vec4 color;
uniform sampler2D sampler;

varying vec2 texCoord;

void main(void) {
    gl_FragColor = color * texture2D(sampler, vec2(texCoord.s, texCoord.t));
}