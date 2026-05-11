import * as THREE from 'three';
import { CANVAS_WIDTH, CANVAS_HEIGHT, fillGeometry, strokeGeometry, topoGeometryToGeoJSON } from './topo-utils.js';

const OCEAN_COLOR = '#0a1628';
const LAND_COLOR = '#1a3a2a';
const LAND_ALT_COLOR = '#1e3e2e';
const BORDER_COLOR = 'rgba(100, 180, 160, 0.25)';

export function generateEarthTexture(arcs, features) {
  const W = CANVAS_WIDTH, H = CANVAS_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Pre-resolve all geometries once
  const resolved = [];
  for (const geom of features) {
    if (geom.id == null) continue;
    const geojson = topoGeometryToGeoJSON(geom, arcs);
    if (geojson) resolved.push(geojson);
  }

  // Fill land
  let toggle = false;
  for (const geojson of resolved) {
    ctx.fillStyle = toggle ? LAND_ALT_COLOR : LAND_COLOR;
    fillGeometry(ctx, geojson, W, H);
    toggle = !toggle;
  }

  // Borders
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 0.8;
  for (const geojson of resolved) {
    strokeGeometry(ctx, geojson, W, H);
  }

  // Graticule
  ctx.strokeStyle = 'rgba(100, 180, 160, 0.08)';
  ctx.lineWidth = 0.5;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
