import * as THREE from 'three';

let pickingCanvas = null;
let pickingTexture = null;
let pickSphere = null;
let countryIndexMap = {};
let centroidsMap = {};
let _decodedArcs = null;
let _features = null;

const CANVAS_WIDTH = 2048;
const CANVAS_HEIGHT = 1024;

// ISO 3166-1 numeric -> ISO 3166-1 alpha-2 mapping
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
  const r = (index >> 16) & 0xff;
  const g = (index >> 8) & 0xff;
  const b = index & 0xff;
  return `rgb(${r},${g},${b})`;
}

function colorToIndex(r, g, b) {
  return (r << 16) | (g << 8) | b;
}

function geoToCanvas(lon, lat, width, height) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

function renderRing(ctx, coordinates, width, height) {
  if (coordinates.length < 3) return;
  ctx.beginPath();
  const first = geoToCanvas(coordinates[0][0], coordinates[0][1], width, height);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < coordinates.length; i++) {
    const pt = geoToCanvas(coordinates[i][0], coordinates[i][1], width, height);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
}

function renderGeometry(ctx, geometry, width, height) {
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      renderRing(ctx, ring, width, height);
    }
    ctx.fill();
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      ctx.beginPath();
      for (const ring of polygon) {
        renderRing(ctx, ring, width, height);
      }
      ctx.fill();
    }
  }
}

function computeCentroid(geometry) {
  let allCoords = [];
  if (geometry.type === 'Polygon') {
    allCoords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    let maxLen = 0;
    for (const poly of geometry.coordinates) {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        allCoords = poly[0];
      }
    }
  }
  if (allCoords.length === 0) return { lon: 0, lat: 0 };

  let sumLon = 0, sumLat = 0;
  for (const coord of allCoords) {
    sumLon += coord[0];
    sumLat += coord[1];
  }
  return {
    lon: sumLon / allCoords.length,
    lat: sumLat / allCoords.length,
  };
}

// TopoJSON decoder
function decodeArcs(topo) {
  const { arcs, transform } = topo;
  const [sx, sy] = transform.scale;
  const [tx, ty] = transform.translate;

  return arcs.map(arc => {
    let x = 0, y = 0;
    const decoded = [];
    for (const [dx, dy] of arc) {
      x += dx;
      y += dy;
      decoded.push([x * sx + tx, y * sy + ty]);
    }
    return decoded;
  });
}

function resolveArc(arcIndex, decodedArcs) {
  if (arcIndex >= 0) {
    return decodedArcs[arcIndex];
  } else {
    return decodedArcs[~arcIndex].slice().reverse();
  }
}

function resolveRing(arcIndices, decodedArcs) {
  const coords = [];
  for (const ai of arcIndices) {
    const arc = resolveArc(ai, decodedArcs);
    for (let i = (coords.length > 0 ? 1 : 0); i < arc.length; i++) {
      coords.push(arc[i]);
    }
  }
  return coords;
}

function topoGeometryToGeoJSON(geometry, decodedArcs) {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.arcs.map(ring => resolveRing(ring, decodedArcs)),
    };
  } else if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.arcs.map(polygon =>
        polygon.map(ring => resolveRing(ring, decodedArcs))
      ),
    };
  }
  return null;
}

export async function generatePickingTexture(topoJsonUrl) {
  const response = await fetch(topoJsonUrl);
  const topo = await response.json();

  const decodedArcs = decodeArcs(topo);
  const features = topo.objects.countries.geometries;
  _decodedArcs = decodedArcs;
  _features = features;

  pickingCanvas = document.createElement('canvas');
  pickingCanvas.width = CANVAS_WIDTH;
  pickingCanvas.height = CANVAS_HEIGHT;
  const ctx = pickingCanvas.getContext('2d');

  ctx.fillStyle = 'rgb(0,0,0)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  countryIndexMap = {};
  centroidsMap = {};
  let index = 1;

  for (const geom of features) {
    const geojson = topoGeometryToGeoJSON(geom, decodedArcs);
    if (!geojson) continue;
    if (geom.id == null) continue;

    const color = indexToColor(index);
    ctx.fillStyle = color;
    renderGeometry(ctx, geojson, CANVAS_WIDTH, CANVAS_HEIGHT);

    const numericId = String(geom.id);
    const iso2 = NUMERIC_TO_ISO2[numericId] || numericId;
    const name = geom.properties && geom.properties.name ? geom.properties.name : '';

    countryIndexMap[index] = {
      name,
      nameEn: name,
      iso2,
      iso3: numericId,
    };

    const centroid = computeCentroid(geojson);
    centroidsMap[index] = centroid;

    index++;
  }

  pickingTexture = new THREE.CanvasTexture(pickingCanvas);
  pickingTexture.flipY = false;

  return { canvas: pickingCanvas, countryIndexMap, centroidsMap };
}

export function createPickSphere(scene) {
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    map: pickingTexture,
    visible: false,
  });
  pickSphere = new THREE.Mesh(geometry, material);
  pickSphere.visible = false;
  scene.add(pickSphere);
  return pickSphere;
}

export function identifyCountry(event, camera, raycaster) {
  if (!pickSphere || !pickingCanvas) return null;

  const rect = event.target.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(pickSphere);

  if (intersects.length === 0) return null;

  const uv = intersects[0].uv;
  if (!uv) return null;

  const pixelX = Math.floor(uv.x * CANVAS_WIDTH);
  const pixelY = Math.floor((1 - uv.y) * CANVAS_HEIGHT);

  const ctx = pickingCanvas.getContext('2d');
  const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
  const [r, g, b] = pixel;

  if (r === 0 && g === 0 && b === 0) return null;

  const idx = colorToIndex(r, g, b);
  const country = countryIndexMap[idx] || null;
  if (country) {
    country._centroid = centroidsMap[idx];
    country._index = idx;
  }
  return country;
}

function drawRingBorder(ctx, coordinates, width, height) {
  if (coordinates.length < 3) return;
  ctx.beginPath();
  const first = geoToCanvas(coordinates[0][0], coordinates[0][1], width, height);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < coordinates.length; i++) {
    const pt = geoToCanvas(coordinates[i][0], coordinates[i][1], width, height);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
}

function drawGeometryBorders(ctx, geometry, width, height) {
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      drawRingBorder(ctx, ring, width, height);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        drawRingBorder(ctx, ring, width, height);
      }
    }
  }
}

export function generateBorderTexture() {
  if (!_decodedArcs || !_features) return null;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;

  for (const geom of _features) {
    if (geom.id == null) continue;
    const geojson = topoGeometryToGeoJSON(geom, _decodedArcs);
    if (!geojson) continue;
    drawGeometryBorders(ctx, geojson, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  return texture;
}
