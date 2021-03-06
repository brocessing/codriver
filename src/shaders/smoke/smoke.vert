#pragma glslify: when_eq = require(glsl-conditionals/when_eq)

varying float vY;
varying float vLife;
varying float vType;
varying vec2 vRotation;

attribute float life;
attribute float scale;
attribute vec3 bornData;

void main() {
  vType = bornData.x;
  vLife = life;
  vY = (modelMatrix * vec4(position, 1.0)).y;

  float l = vLife * bornData.z;
  float rscale = (
    when_eq(vType, 1.) * 1. * (1. - (max(0.1, abs(vLife - 0.5)) - 0.1) / 0.4)
    + when_eq(vType, 2.) * 2.0 * vLife
    + when_eq(vType, 3.) * 0.01 * l
    + when_eq(vType, 4.) * 0.6 * (1. - (max(0.05, abs(vLife - 0.5)) - 0.05) / 0.45) + 0.2
  );

  if (vType == 0.) {
    rscale = 2. * (1. - (max(0.05, abs(vLife - 0.5)) - 0.05) / 0.45) + 0.2;
  }

  if (vLife > 0.) {
    vRotation = vec2( cos(l + bornData.z), sin(l + bornData.z) );
  }

  float attenuate = 0.0005;
  float spread = 20.;

  vec4 wpos = modelMatrix * vec4( position, 1.0 );
	vec3 vPos = wpos.xyz;
  vec3 cpos = cameraPosition.xyz;

  float dx = wpos.x - cpos.x;
  float dz = wpos.z - cpos.z;
  float p = (dx * dx + dz * dz);

  float distz = max(0., abs(attenuate - p) - spread);
  wpos.y -= distz * distz * attenuate;



  vec4 mvPosition = viewMatrix * wpos;
  gl_PointSize = scale * rscale * ( 100.0 / -mvPosition.z );
  gl_Position = projectionMatrix * mvPosition;
}