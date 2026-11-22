import { useMemo } from 'react';
import { BackSide, Color, Vector3 } from 'three';

/** A gradient dome with a soft sun: cream at the horizon, blue overhead. Matches the page's sky tokens. */

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  uniform vec3 uSun;
  uniform vec3 uSunDirection;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    float height = direction.y;
    vec3 colour = mix(uLow, uMid, smoothstep(-0.01, 0.1, height));
    colour = mix(colour, uTop, smoothstep(0.07, 0.34, height));

    float towardsSun = max(dot(direction, uSunDirection), 0.0);
    colour = mix(colour, uSun, smoothstep(0.99935, 0.9996, towardsSun));
    colour += uSun * (pow(towardsSun, 60.0) * 0.22 + pow(towardsSun, 600.0) * 0.35);

    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Sky() {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new Color('#6dbdea') },
      uMid: { value: new Color('#b4e0f5') },
      uLow: { value: new Color('#fdecc8') },
      uSun: { value: new Color('#ffe27a') },
      // Low in the morning sky, a little left of straight ahead.
      uSunDirection: { value: new Vector3(-0.2, 0.075, -0.98).normalize() },
    }),
    [],
  );
  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[300, 32, 16]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
