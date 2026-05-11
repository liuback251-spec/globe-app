import * as THREE from 'three';

export function createGlobe(scene, canvasTexture) {
  const geometry = new THREE.SphereGeometry(1, 128, 128);
  const material = new THREE.MeshBasicMaterial({
    map: canvasTexture,
  });
  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);
  return globe;
}

export function createAtmosphere(scene) {
  const geometry = new THREE.SphereGeometry(1.2, 64, 64);
  const material = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uCameraPosition;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float rim = 1.0 - max(0.0, dot(vWorldNormal, viewDir));
        float intensity = pow(rim, 2.5) * 0.7;
        vec3 color = mix(vec3(0.3, 0.6, 1.0), vec3(0.5, 0.8, 1.0), rim);
        gl_FragColor = vec4(color, intensity);
      }
    `,
    uniforms: {
      uCameraPosition: { value: new THREE.Vector3(0, 0, 3) },
    },
    blending: THREE.NormalBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  const atmosphere = new THREE.Mesh(geometry, material);
  scene.add(atmosphere);
  return atmosphere;
}
