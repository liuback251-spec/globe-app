import * as THREE from 'three';
import { CANVAS_WIDTH, CANVAS_HEIGHT, fillGeometry, topoGeometryToGeoJSON } from './topo-utils.js';

let pickingCanvas = null;
let pickingTexture = null;
let pickSphere = null;
let countryIndexMap = {};
let _pickingData = null;
const _mouse = new THREE.Vector2();

const NUMERIC_TO_ISO2 = {
  "004":"AF","008":"AL","012":"DZ","020":"AD","024":"AO","032":"AR","036":"AU","040":"AT",
  "044":"BS","048":"BH","050":"BD","052":"BB","056":"BE","064":"BT","068":"BO","070":"BA",
  "072":"BW","076":"BR","084":"BZ","096":"BN","100":"BG","104":"MM","108":"BI","112":"BY",
  "116":"KH","120":"CM","124":"CA","140":"CF","144":"LK","148":"TD","152":"CL","156":"CN",
  "170":"CO","178":"CG","180":"CD","188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ",
  "204":"BJ","208":"DK","214":"DO","218":"EC","818":"EG","222":"SV","226":"GQ","232":"ER",
  "233":"EE","231":"ET","242":"FJ","246":"FI","250":"FR","258":"PF","266":"GA","270":"GM",
  "268":"GE","276":"DE","288":"GH","300":"GR","304":"GL","320":"GT","324":"GN","328":"GY",
  "332":"HT","340":"HN","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ",
  "372":"IE","376":"IL","380":"IT","384":"CI","388":"JM","392":"JP","400":"JO","398":"KZ",
  "404":"KE","408":"KP","410":"KR","414":"KW","417":"KG","418":"LA","422":"LB","426":"LS",
  "430":"LR","434":"LY","438":"LI","440":"LT","442":"LU","450":"MG","454":"MW","458":"MY",
  "462":"MV","466":"ML","470":"MT","478":"MR","480":"MU","484":"MX","496":"MN","498":"MD",
  "499":"ME","504":"MA","508":"MZ","512":"OM","516":"NA","520":"NR","524":"NP","528":"NL",
  "540":"NC","548":"VU","554":"NZ","558":"NI","562":"NE","566":"NG","578":"NO","586":"PK",
  "591":"PA","598":"PG","600":"PY","604":"PE","608":"PH","616":"PL","620":"PT","624":"GW",
  "626":"TL","630":"PR","634":"QA","642":"RO","643":"RU","646":"RW","682":"SA","686":"SN",
  "688":"RS","694":"SL","702":"SG","703":"SK","704":"VN","705":"SI","706":"SO","710":"ZA",
  "716":"ZW","724":"ES","728":"SS","729":"SD","740":"SR","748":"SZ","752":"SE","756":"CH",
  "760":"SY","762":"TJ","764":"TH","768":"TG","780":"TT","784":"AE","788":"TN","792":"TR",
  "795":"TM","800":"UG","804":"UA","826":"GB","834":"TZ","840":"US","854":"BF","858":"UY",
  "860":"UZ","862":"VE","887":"YE","894":"ZM","010":"AQ"
};

function indexToColor(index) {
  return `rgb(${(index >> 16) & 0xff},${(index >> 8) & 0xff},${index & 0xff})`;
}

function colorToIndex(r, g, b) {
  return (r << 16) | (g << 8) | b;
}

function computeCentroid(geometry) {
  let allCoords = [];
  if (geometry.type === 'Polygon') allCoords = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') {
    let maxLen = 0;
    for (const poly of geometry.coordinates) {
      if (poly[0].length > maxLen) { maxLen = poly[0].length; allCoords = poly[0]; }
    }
  }
  if (allCoords.length === 0) return { lon: 0, lat: 0 };
  let sumLon = 0, sumLat = 0;
  for (const c of allCoords) { sumLon += c[0]; sumLat += c[1]; }
  return { lon: sumLon / allCoords.length, lat: sumLat / allCoords.length };
}

export function generatePickingTexture(arcs, features) {
  pickingCanvas = document.createElement('canvas');
  pickingCanvas.width = CANVAS_WIDTH;
  pickingCanvas.height = CANVAS_HEIGHT;
  const ctx = pickingCanvas.getContext('2d');

  ctx.fillStyle = 'rgb(0,0,0)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  countryIndexMap = {};
  let index = 1;

  for (const geom of features) {
    const geojson = topoGeometryToGeoJSON(geom, arcs);
    if (!geojson) continue;
    if (geom.id == null) continue;

    ctx.fillStyle = indexToColor(index);
    fillGeometry(ctx, geojson, CANVAS_WIDTH, CANVAS_HEIGHT);

    const numericId = String(geom.id);
    const iso2 = NUMERIC_TO_ISO2[numericId] || null;
    const name = geom.properties && geom.properties.name ? geom.properties.name : '';

    countryIndexMap[index] = {
      name, nameEn: name, iso2, numericId,
      _centroid: computeCentroid(geojson),
    };
    index++;
  }

  _pickingData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
  pickingTexture = new THREE.CanvasTexture(pickingCanvas);
  pickingTexture.flipY = false;

  return { countryIndexMap };
}

export function createPickSphere(scene) {
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const material = new THREE.MeshBasicMaterial({ map: pickingTexture, visible: false });
  pickSphere = new THREE.Mesh(geometry, material);
  pickSphere.visible = false;
  scene.add(pickSphere);
  return pickSphere;
}

export function identifyCountry(event, camera, raycaster) {
  if (!pickSphere || !_pickingData) return null;

  const rect = event.target.getBoundingClientRect();
  _mouse.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(_mouse, camera);
  const intersects = raycaster.intersectObject(pickSphere);
  if (intersects.length === 0) return null;

  const uv = intersects[0].uv;
  if (!uv) return null;

  const pixelX = Math.floor(uv.x * CANVAS_WIDTH);
  const pixelY = Math.floor((1 - uv.y) * CANVAS_HEIGHT);
  const offset = (pixelY * CANVAS_WIDTH + pixelX) * 4;
  const r = _pickingData[offset], g = _pickingData[offset + 1], b = _pickingData[offset + 2];

  if (r === 0 && g === 0 && b === 0) return null;
  return countryIndexMap[colorToIndex(r, g, b)] || null;
}
