import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createGlobe, createAtmosphere } from './globe.js';
import { createStarfield } from './stars.js';
import { createOceanLabels } from './ocean-labels.js';
import { createCountryLabels } from './country-labels.js';
import { loadTopoJSON } from './topo-utils.js';
import { generateEarthTexture } from './earth-texture.js';
import { generatePickingTexture, createPickSphere, identifyCountry } from './picking.js';
import { loadCountriesData, getCountryInfo } from './countries.js';
import { initUI, showHoverCard, hideHoverCard, showDetailPanel, setCountriesDataRef } from './ui.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000510);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('globe-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.8;
controls.minDistance = 1.5;
controls.maxDistance = 5;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

const atmosphere = createAtmosphere(scene);
createStarfield(scene);

const updateOceanLabels = createOceanLabels(
  document.getElementById('globe-container')
);

let updateCountryLabels = null;
let globe = null;

const raycaster = new THREE.Raycaster();
let hoveredCountry = null;
let rotateTimeout = null;
let isDragging = false;
let pointerDownPos = { x: 0, y: 0 };

function pauseAutoRotate() {
  controls.autoRotate = false;
  if (rotateTimeout) clearTimeout(rotateTimeout);
}

function resumeAutoRotateDelayed() {
  if (rotateTimeout) clearTimeout(rotateTimeout);
  rotateTimeout = setTimeout(() => { controls.autoRotate = true; }, 3000);
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  isDragging = false;
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
  pauseAutoRotate();
});

renderer.domElement.addEventListener('pointermove', (e) => {
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  if (Math.sqrt(dx * dx + dy * dy) > 5) isDragging = true;
});

renderer.domElement.addEventListener('pointerup', () => {
  resumeAutoRotateDelayed();
});

renderer.domElement.addEventListener('mousemove', (event) => {
  const country = identifyCountry(event, camera, raycaster);
  if (country !== hoveredCountry) {
    hoveredCountry = country;
    renderer.domElement.style.cursor = country ? 'pointer' : 'default';
    if (country) {
      pauseAutoRotate();
      showHoverCard(country);
    } else {
      hideHoverCard();
      resumeAutoRotateDelayed();
    }
  }
});

renderer.domElement.addEventListener('click', () => {
  if (isDragging) return;
  if (hoveredCountry) showDetailPanel(hoveredCountry);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  atmosphere.material.uniforms.uCameraPosition.value.copy(camera.position);
  updateOceanLabels(camera, globe);
  if (updateCountryLabels) updateCountryLabels(camera, globe);
  renderer.render(scene, camera);
}
animate();

async function init() {
  try {
    const topoUrl = 'assets/data/countries.geojson';

    // Fetch TopoJSON once, load country data in parallel
    const [{ arcs, features }] = await Promise.all([
      loadTopoJSON(topoUrl),
      loadCountriesData('assets/data/countries-info.json'),
    ]);

    // Generate textures and picking data in parallel
    const [earthTexture, { countryIndexMap }] = await Promise.all([
      Promise.resolve(generateEarthTexture(arcs, features)),
      Promise.resolve(generatePickingTexture(arcs, features)),
    ]);

    globe = createGlobe(scene, earthTexture);
    createPickSphere(scene);

    // Merge country data with centroids
    const countriesDataRef = {};
    for (const [idx, country] of Object.entries(countryIndexMap)) {
      const iso = country.iso2;
      if (iso) {
        const info = getCountryInfo(iso, null);
        countriesDataRef[iso] = {
          ...(info || {}),
          name: (info && info.name) || country.name,
          nameEn: (info && info.nameEn) || country.nameEn,
          _centroid: country._centroid,
          iso2: iso,
        };
      }
    }
    setCountriesDataRef(countriesDataRef);

    updateCountryLabels = createCountryLabels(
      document.getElementById('globe-container'), countriesDataRef
    );

    initUI(camera, controls);
    document.getElementById('loading-screen').classList.add('fade-out');
  } catch (err) {
    console.error('Init failed:', err);
    document.querySelector('#loading-screen p').textContent = '加载失败，请刷新重试';
  }
}

init();
