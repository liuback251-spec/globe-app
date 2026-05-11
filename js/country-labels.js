import * as THREE from 'three';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

const MAJOR_COUNTRIES = new Set([
  'CN', 'US', 'RU', 'CA', 'BR', 'AU', 'IN', 'AR', 'KZ', 'DZ',
  'CD', 'SA', 'MX', 'ID', 'LY', 'IR', 'MN', 'PE', 'TD', 'NE',
  'AO', 'ML', 'ZA', 'CO', 'ET', 'BO', 'MR', 'EG', 'TZ', 'NG',
  'VE', 'PK', 'MZ', 'TR', 'CL', 'ZM', 'MM', 'AF', 'SO', 'CF',
  'UA', 'MG', 'BW', 'KE', 'FR', 'DE', 'ES', 'SE', 'FI', 'NO',
  'PL', 'IT', 'GB', 'JP', 'KR', 'TH', 'VN', 'MY', 'PH',
  'SD', 'CM', 'IQ', 'EC', 'PY', 'ZW', 'SN', 'GN', 'UG',
]);

export function createCountryLabels(container, countriesDataRef) {
  const labels = [];

  for (const [iso, data] of Object.entries(countriesDataRef)) {
    if (!data._centroid || !data.name) continue;
    if (!MAJOR_COUNTRIES.has(iso)) continue;

    const el = document.createElement('div');
    el.className = 'country-label';
    el.textContent = data.name;
    container.appendChild(el);

    const phi = THREE.MathUtils.degToRad(90 - data._centroid.lat);
    const theta = THREE.MathUtils.degToRad(-data._centroid.lon);
    const pos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1.005, phi, theta));

    labels.push({ el, pos, lastX: -1, lastY: -1, lastOpacity: -1 });
  }

  return function updateLabels(camera, globe) {
    _v1.copy(camera.position).normalize();

    for (const label of labels) {
      _v2.copy(label.pos).applyMatrix4(globe.matrixWorld);
      _v3.copy(_v2).normalize();
      const dot = _v1.dot(_v3);

      if (dot > 0.2) {
        _v3.copy(_v2).project(camera);
        const x = Math.round((_v3.x * 0.5 + 0.5) * window.innerWidth);
        const y = Math.round((-_v3.y * 0.5 + 0.5) * window.innerHeight);
        const opacity = Math.min(0.8, (dot - 0.2) * 1.5);

        if (x !== label.lastX || y !== label.lastY || Math.abs(opacity - label.lastOpacity) > 0.03) {
          label.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
          label.el.style.opacity = opacity;
          label.lastX = x;
          label.lastY = y;
          label.lastOpacity = opacity;
        }
        label.el.style.display = 'block';
      } else {
        if (label.el.style.display !== 'none') label.el.style.display = 'none';
      }
    }
  };
}
