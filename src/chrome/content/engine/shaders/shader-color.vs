attribute vec3 vertexPosition;

uniform mat4 mvMatrix;
uniform mat4 projMatrix;

void main(void) {
    gl_Position = projMatrix * mvMatrix * vec4(vertexPosition, 1.0);
}