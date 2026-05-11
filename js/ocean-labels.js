import * as THREE from 'three';

const OCEANS = [
  { name: 'Pacific Ocean', lon: -160, lat: 0 },
  { name: 'Atlantic Ocean', lon: -30, lat: 0 },
  { name: 'Indian Ocean', lon: 75, lat: -20 },
  { name: 'Arctic Ocean', lon: 0, lat: 80 },
  { name: 'Southern Ocean', lon: 0, lat: -65 },
];

export function createOceanLabels(container, camera, renderer) {
  const labels = [];

  for (const ocean of OCEANS) {
    const el = document.createElement('div');
    el.className = 'ocean-label';
    el.textContent = ocean.name;
    container.appendChild(el);

    const phi = THREE.MathUtils.degToRad(90 - ocean.lat);
    const theta = THREE.MathUtils.degToRad(-ocean.lon);
    const pos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1.02, phi, theta));

    labels.push({ el, pos });
  }

  return function updateLabels(camera, globe) {
    const cameraDir = camera.position.clone().normalize();

    for (const label of labels) {
      const worldPos = label.pos.clone().applyMatrix4(globe.matrixWorld);
      const labelDir = worldPos.clone().normalize();
      const dot = cameraDir.dot(labelDir);

      if (dot > 0.15) {
        const projected = worldPos.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const y = (-projected.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
        label.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        label.el.style.opacity = Math.min(0.7, (dot - 0.15) * 1.5);
        label.el.style.display = 'block';
      } else {
        label.el.style.display = 'none';
      }
    }
  };
}
