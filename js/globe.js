import * as THREE from 'three';

export function createGlobe(scene, config) {
  const geometry = new THREE.SphereGeometry(1, 128, 128);
  const loader = new THREE.TextureLoader();

  const diffuse = loader.load(config.diffuse);
  diffuse.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshPhongMaterial({
    map: diffuse,
  });

  if (config.bump) {
    const bumpMap = loader.load(config.bump);
    material.bumpMap = bumpMap;
    material.bumpScale = 0.03;
  }

  if (config.specular) {
    const specularMap = loader.load(config.specular);
    material.specularMap = specularMap;
    material.specular = new THREE.Color(0x333333);
    material.shininess = 15;
  }

  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);
  return globe;
}

export function createAtmosphere(scene) {
  const geometry = new THREE.SphereGeometry(1.15, 64, 64);
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
        float intensity = pow(0.65 - dot(vWorldNormal, viewDir), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
      }
    `,
    uniforms: {
      uCameraPosition: { value: new THREE.Vector3(0, 0, 3) },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  });

  const atmosphere = new THREE.Mesh(geometry, material);
  scene.add(atmosphere);
  return atmosphere;
}

export function createBorderOverlay(scene, borderTexture) {
  const geometry = new THREE.SphereGeometry(1.001, 128, 128);
  const material = new THREE.MeshBasicMaterial({
    map: borderTexture,
    transparent: true,
    depthWrite: false,
  });
  const overlay = new THREE.Mesh(geometry, material);
  scene.add(overlay);
  return overlay;
}
