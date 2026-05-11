import { getCountryInfo, getAllCountryNames } from './countries.js';
import { flyToCountry } from './camera-controls.js';

let isPinned = false;
let cameraRef = null;
let controlsRef = null;

export function initUI(camera, controls) {
  cameraRef = camera;
  controlsRef = controls;

  document.getElementById('info-close').addEventListener('click', closeInfoPanel);

  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length === 0) {
      searchResults.classList.add('hidden');
      return;
    }

    const allCountries = getAllCountryNames();
    const matches = allCountries.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.nameEn.toLowerCase().includes(query)
    ).slice(0, 8);

    if (matches.length === 0) {
      searchResults.classList.add('hidden');
      return;
    }

    searchResults.innerHTML = '';
    searchResults.classList.remove('hidden');

    for (const match of matches) {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `<span class="result-zh">${match.name}</span><span class="result-en">${match.nameEn}</span>`;
      div.addEventListener('click', () => {
        selectCountry(match.iso);
        searchResults.classList.add('hidden');
        searchInput.value = match.name;
      });
      searchResults.appendChild(div);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-box')) {
      searchResults.classList.add('hidden');
    }
  });
}

function selectCountry(iso) {
  const info = countriesDataGlobal[iso];
  if (!info || !info._centroid) return;
  flyToCountry(cameraRef, controlsRef, info._centroid.lon, info._centroid.lat);
  if (info) showInfoPanelFromData(info);
}

let countriesDataGlobal = {};

export function setCountriesDataRef(data) {
  countriesDataGlobal = data;
}

export function showInfoPanel(geoProperties) {
  const info = getCountryInfo(geoProperties.iso2, geoProperties.iso3);
  const panel = document.getElementById('info-panel');

  if (!info) {
    document.getElementById('info-name-zh').textContent = geoProperties.name || '未知';
    document.getElementById('info-name-en').textContent = geoProperties.nameEn || '';
    document.getElementById('info-flag').textContent = '';
    document.getElementById('info-capital').textContent = '数据暂无';
    document.getElementById('info-population').textContent = '数据暂无';
    document.getElementById('info-area').textContent = '数据暂无';
    document.getElementById('info-language').textContent = '数据暂无';
    document.getElementById('info-coordinates').textContent = geoProperties._centroid
      ? `${geoProperties._centroid.lat.toFixed(2)}°, ${geoProperties._centroid.lon.toFixed(2)}°`
      : '数据暂无';
    document.getElementById('info-timezone').textContent = '数据暂无';
    document.getElementById('info-climate').textContent = '数据暂无';
    document.getElementById('info-terrain').textContent = '数据暂无';
    document.getElementById('info-gdp').textContent = '数据暂无';
    document.getElementById('info-currency').textContent = '数据暂无';
    document.getElementById('info-culture').textContent = '数据暂无';
  } else {
    showInfoPanelFromData(info, geoProperties._centroid);
  }

  panel.classList.remove('hidden');
  panel.classList.add('visible');
}

function showInfoPanelFromData(info, centroid) {
  document.getElementById('info-flag').textContent = info.flag || '';
  document.getElementById('info-name-zh').textContent = info.name;
  document.getElementById('info-name-en').textContent = info.nameEn;
  document.getElementById('info-capital').textContent = info.capital || '数据暂无';
  document.getElementById('info-population').textContent = info.population || '数据暂无';
  document.getElementById('info-area').textContent = info.area || '数据暂无';
  document.getElementById('info-language').textContent = info.language || '数据暂无';
  document.getElementById('info-coordinates').textContent = info.coordinates || '数据暂无';
  document.getElementById('info-timezone').textContent = info.timezone || '数据暂无';
  document.getElementById('info-climate').textContent = info.climate || '数据暂无';
  document.getElementById('info-terrain').textContent = info.terrain || '数据暂无';
  document.getElementById('info-gdp').textContent = info.gdp || '数据暂无';
  document.getElementById('info-currency').textContent = info.currency || '数据暂无';
  document.getElementById('info-culture').textContent = info.culturalFeatures || '数据暂无';

  const panel = document.getElementById('info-panel');
  panel.classList.remove('hidden');
  panel.classList.add('visible');
}

export function hideInfoPanel() {
  if (isPinned) return;
  const panel = document.getElementById('info-panel');
  panel.classList.remove('visible');
  panel.classList.add('hidden');
}

export function togglePin() {
  isPinned = !isPinned;
  const panel = document.getElementById('info-panel');
  if (isPinned) {
    panel.classList.add('pinned');
  } else {
    panel.classList.remove('pinned');
  }
}

export function closeInfoPanel() {
  isPinned = false;
  const panel = document.getElementById('info-panel');
  panel.classList.remove('visible', 'pinned');
  panel.classList.add('hidden');
}

export function getIsPinned() {
  return isPinned;
}
