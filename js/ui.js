import { getCountryInfo, getAllCountryNames } from './countries.js';
import { flyToCountry } from './camera-controls.js';

let cameraRef = null;
let controlsRef = null;
let countriesDataGlobal = {};

function setVisible(el, visible) {
  el.classList.toggle('visible', visible);
  el.classList.toggle('hidden', !visible);
}

function generatePlaceholder(flag, name) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 400, 200);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(1, '#162840');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 200);

  ctx.font = '64px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flag || '', 200, 85);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
  ctx.fillText(name || '', 200, 150);

  return canvas.toDataURL();
}

function setPhotoSrc(el, flag, name) {
  el.src = generatePlaceholder(flag, name);
  el.style.display = 'block';
}

function resolveInfo(geoProperties) {
  if (geoProperties.iso2) {
    return getCountryInfo(geoProperties.iso2, geoProperties.numericId) || geoProperties;
  }
  return geoProperties;
}

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
      c.name.toLowerCase().includes(query) || c.nameEn.toLowerCase().includes(query)
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

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstResult = searchResults.querySelector('.search-result-item');
      if (firstResult) firstResult.click();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-box')) searchResults.classList.add('hidden');
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

export function showHoverCard(geoProperties) {
  const info = resolveInfo(geoProperties);
  const name = info.name || geoProperties.name || '未知';
  const nameEn = info.nameEn || geoProperties.nameEn || '';

  document.getElementById('hover-flag').textContent = info.flag || '';
  document.getElementById('hover-name-zh').textContent = name;
  document.getElementById('hover-name-en').textContent = nameEn;
  document.getElementById('hover-capital').textContent = info.capital || '数据暂无';
  setPhotoSrc(document.getElementById('hover-photo'), info.flag, name);

  setVisible(document.getElementById('hover-card'), true);
}

export function hideHoverCard() {
  setVisible(document.getElementById('hover-card'), false);
}

export function showDetailPanel(geoProperties) {
  const info = resolveInfo(geoProperties);

  document.getElementById('detail-flag').textContent = info.flag || '';
  document.getElementById('detail-name-zh').textContent = info.name || '未知';
  document.getElementById('detail-name-en').textContent = info.nameEn || '';
  setPhotoSrc(document.getElementById('detail-photo-1'), info.flag, info.name || '');

  const val = (key) => info[key] || '数据暂无';
  document.getElementById('detail-capital').textContent = val('capital');
  document.getElementById('detail-population').textContent = val('population');
  document.getElementById('detail-area').textContent = val('area');
  document.getElementById('detail-language').textContent = val('language');
  document.getElementById('detail-coordinates').textContent = info.coordinates || (info._centroid ? `${info._centroid.lat.toFixed(1)}°, ${info._centroid.lon.toFixed(1)}°` : '数据暂无');
  document.getElementById('detail-timezone').textContent = val('timezone');
  document.getElementById('detail-climate').textContent = val('climate');
  document.getElementById('detail-terrain').textContent = val('terrain');
  document.getElementById('detail-gdp').textContent = val('gdp');
  document.getElementById('detail-currency').textContent = val('currency');
  document.getElementById('detail-culture').textContent = info.culturalFeatures || '数据暂无';

  setVisible(document.getElementById('detail-panel'), true);
  hideHoverCard();
}

export function hideDetailPanel() {
  setVisible(document.getElementById('detail-panel'), false);
}
