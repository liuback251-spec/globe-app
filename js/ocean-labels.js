import * as THREE from 'three';

const OCEANS = [
  { name: 'Pacific Ocean', lon: -160, lat: 0 },
  { name: 'Atlantic Ocean', lon: -30, lat: 0 },
  { name: 'Indian Ocean', lon: 75, lat: -20 },
  { name: 'Arctic Ocean', lon: 0, lat: 80 },
  { name: 'Southern Ocean', lon: 0, lat: -65 },
];

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export function createOceanLabels(container) {
  const labels = OCEANS.map(ocean => {
    const el = document.createElement('div');
    el.className = 'ocean-label';
    el.textContent = ocean.name;
    container.appendChild(el);

    const phi = THREE.MathUtils.degToRad(90 - ocean.lat);
    const theta = THREE.MathUtils.degToRad(-ocean.lon);
    const pos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1.02, phi, theta));

    return { el, pos, lastX: -1, lastY: -1, lastOpacity: -1 };
  });

  return function updateLabels(camera, globe) {
    _v1.copy(camera.position).normalize();

    for (const label of labels) {
      _v2.copy(label.pos).applyMatrix4(globe.matrixWorld);
      const dot = _v1.dot(_v2.normalize());

      if (dot > 0.15) {
        _v2.copy(label.pos).applyMatrix4(globe.matrixWorld).project(camera);
        const x = Math.round((_v2.x * 0.5 + 0.5) * window.innerWidth);
        const y = Math.round((-_v2.y * 0.5 + 0.5) * window.innerHeight);
        const opacity = Math.min(0.7, (dot - 0.15) * 1.5);

        if (x !== label.lastX || y !== label.lastY || Math.abs(opacity - label.lastOpacity) > 0.02) {
          label.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
          label.el.style.opacity = opacity;
          label.lastX = x;
          label.lastY = y;
          label.lastOpacity = opacity;
        }
        label.el.style.display = 'block';
      } else {
        if (label.el.style.display !== 'none') {
          label.el.style.display = 'none';
        }
      }
    }
  };
}
