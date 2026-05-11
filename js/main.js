import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createGlobe, createAtmosphere } from './globe.js';
import { generatePickingTexture, createPickSphere, identifyCountry } from './picking.js';
import { loadCountriesData, getCountryInfo } from './countries.js';
import { initUI, showInfoPanel, hideInfoPanel, togglePin, setCountriesDataRef } from './ui.js';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('globe-container').appendChild(renderer.domElement);

// Controls
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

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// Globe
const earthTextureUrl = 'assets/textures/earth_2048.jpg';
const globe = createGlobe(scene, earthTextureUrl);
createAtmosphere(scene);

// Raycaster
const raycaster = new THREE.Raycaster();
let hoveredCountry = null;

// Auto-rotate pause on interaction
let userInteracting = false;
let rotateTimeout = null;

function pauseAutoRotate() {
  userInteracting = true;
  controls.autoRotate = false;
  if (rotateTimeout) clearTimeout(rotateTimeout);
}

function resumeAutoRotateDelayed() {
  userInteracting = false;
  if (rotateTimeout) clearTimeout(rotateTimeout);
  rotateTimeout = setTimeout(() => {
    if (!userInteracting) {
      controls.autoRotate = true;
    }
  }, 3000);
}

renderer.domElement.addEventListener('pointerdown', pauseAutoRotate);
renderer.domElement.addEventListener('pointerup', resumeAutoRotateDelayed);

// Mouse move for hover
renderer.domElement.addEventListener('mousemove', (event) => {
  const country = identifyCountry(event, camera, raycaster);
  if (country !== hoveredCountry) {
    hoveredCountry = country;
    renderer.domElement.style.cursor = country ? 'pointer' : 'default';
    if (country) {
      showInfoPanel(country);
    } else {
      hideInfoPanel();
    }
  }
});

// Click for pin
renderer.domElement.addEventListener('click', (event) => {
  const country = identifyCountry(event, camera, raycaster);
  if (country) {
    togglePin();
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Init: load data and generate picking texture
async function init() {
  try {
    await loadCountriesData('assets/data/countries-info.json');
    const { countryIndexMap } = await generatePickingTexture('assets/data/countries.geojson');
    createPickSphere(scene);

    // Merge: countries-info data + centroid from picking
    // Build a ref keyed by ISO_A2 for search fly-to
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
        };
      }
    }
    setCountriesDataRef(countriesDataRef);

    initUI(camera, controls);

    // Hide loading screen
    document.getElementById('loading-screen').classList.add('fade-out');
  } catch (err) {
    console.error('Init failed:', err);
    document.querySelector('#loading-screen p').textContent = '加载失败，请刷新重试';
  }
}

init();
