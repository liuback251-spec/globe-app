import { getCountryInfo, getAllCountryNames } from './countries.js';
import { flyToCountry } from './camera-controls.js';

let cameraRef = null;
let controlsRef = null;
let countriesDataGlobal = {};

export function initUI(camera, controls) {
  cameraRef = camera;
  controlsRef = controls;

  document.getElementById('detail-close').addEventListener('click', hideDetailPanel);

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
        searchInput.blur();
      });
      searchResults.appendChild(div);
    }
  });

  // Enter key triggers first result
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstResult = searchResults.querySelector('.search-result-item');
      if (firstResult) {
        firstResult.click();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-box')) {
      searchResults.classList.add('hidden');
    }
  });
}

async function selectCountry(iso) {
  const info = countriesDataGlobal[iso];
  if (!info) return;
  if (info._centroid) {
    await flyToCountry(cameraRef, controlsRef, info._centroid.lon, info._centroid.lat);
  }
  showDetailPanel(info);
}

export function setCountriesDataRef(data) {
  countriesDataGlobal = data;
}

// --- Hover Card ---

export function showHoverCard(geoProperties) {
  const info = getCountryInfo(geoProperties.iso2, geoProperties.iso3);
  const card = document.getElementById('hover-card');

  const name = (info && info.name) || geoProperties.name || '未知';
  const nameEn = (info && info.nameEn) || geoProperties.nameEn || '';
  const flag = (info && info.flag) || '';
  const capital = (info && info.capital) || '数据暂无';
  const photo = (info && info.capitalPhoto) || '';

  document.getElementById('hover-flag').textContent = flag;
  document.getElementById('hover-name-zh').textContent = name;
  document.getElementById('hover-name-en').textContent = nameEn;
  document.getElementById('hover-capital-row').querySelector('#hover-capital').textContent = capital;

  const photoEl = document.getElementById('hover-photo');
  if (photo) {
    photoEl.src = photo;
    photoEl.style.display = 'block';
  } else {
    photoEl.src = '';
    photoEl.style.display = 'none';
  }

  card.classList.remove('hidden');
  card.classList.add('visible');
}

export function hideHoverCard() {
  const card = document.getElementById('hover-card');
  card.classList.remove('visible');
  card.classList.add('hidden');
}

// --- Detail Panel ---

export function showDetailPanel(geoProperties) {
  const info = (geoProperties.iso2 || geoProperties.iso3)
    ? getCountryInfo(geoProperties.iso2, geoProperties.iso3)
    : geoProperties;

  const panel = document.getElementById('detail-panel');

  const name = (info && info.name) || geoProperties.name || '未知';
  const nameEn = (info && info.nameEn) || geoProperties.nameEn || '';
  const flag = (info && info.flag) || '';

  document.getElementById('detail-flag').textContent = flag;
  document.getElementById('detail-name-zh').textContent = name;
  document.getElementById('detail-name-en').textContent = nameEn;

  const photo = (info && info.capitalPhoto) || '';
  const photoEl = document.getElementById('detail-photo-1');
  if (photo) {
    photoEl.src = photo;
    photoEl.style.display = 'block';
  } else {
    photoEl.src = '';
    photoEl.style.display = 'none';
  }

  document.getElementById('detail-capital').textContent = (info && info.capital) || '数据暂无';
  document.getElementById('detail-population').textContent = (info && info.population) || '数据暂无';
  document.getElementById('detail-area').textContent = (info && info.area) || '数据暂无';
  document.getElementById('detail-language').textContent = (info && info.language) || '数据暂无';
  document.getElementById('detail-coordinates').textContent = (info && info.coordinates) || '数据暂无';
  document.getElementById('detail-timezone').textContent = (info && info.timezone) || '数据暂无';
  document.getElementById('detail-climate').textContent = (info && info.climate) || '数据暂无';
  document.getElementById('detail-terrain').textContent = (info && info.terrain) || '数据暂无';
  document.getElementById('detail-gdp').textContent = (info && info.gdp) || '数据暂无';
  document.getElementById('detail-currency').textContent = (info && info.currency) || '数据暂无';
  document.getElementById('detail-culture').textContent = (info && info.culturalFeatures) || '数据暂无';

  panel.classList.remove('hidden');
  panel.classList.add('visible');
  hideHoverCard();
}

export function hideDetailPanel() {
  const panel = document.getElementById('detail-panel');
  panel.classList.remove('visible');
  panel.classList.add('hidden');
}
