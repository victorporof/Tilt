attribute vec3 vertexPosition;
attribute vec2 vertexTexCoord;

uniform mat4 mvMatrix;
uniform mat4 projMatrix;

varying vec2 texCoord;

void main(void) {
    gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);
    texCoord = vertexTexCoord;
}