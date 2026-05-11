export const CANVAS_WIDTH = 2048;
export const CANVAS_HEIGHT = 1024;

export function geoToCanvas(lon, lat, width, height) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

export function traceRing(ctx, coords, width, height) {
  if (coords.length < 3) return;
  ctx.beginPath();
  const f = geoToCanvas(coords[0][0], coords[0][1], width, height);
  ctx.moveTo(f.x, f.y);
  for (let i = 1; i < coords.length; i++) {
    const p = geoToCanvas(coords[i][0], coords[i][1], width, height);
    ctx.lineTo(p.x, p.y);
  }
}

export function fillGeometry(ctx, geometry, width, height) {
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) traceRing(ctx, ring, width, height);
    ctx.fill();
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      ctx.beginPath();
      for (const ring of poly) traceRing(ctx, ring, width, height);
      ctx.fill();
    }
  }
}

export function strokeGeometry(ctx, geometry, width, height) {
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      traceRing(ctx, ring, width, height);
      ctx.stroke();
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) {
        traceRing(ctx, ring, width, height);
        ctx.stroke();
      }
    }
  }
}

export function decodeArcs(topo) {
  const { arcs, transform } = topo;
  const [sx, sy] = transform.scale;
  const [tx, ty] = transform.translate;
  return arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
  });
}

export function resolveArc(idx, arcs) {
  return idx >= 0 ? arcs[idx] : arcs[~idx].slice().reverse();
}

export function resolveRing(indices, arcs) {
  const coords = [];
  for (const ai of indices) {
    const arc = resolveArc(ai, arcs);
    for (let i = (coords.length > 0 ? 1 : 0); i < arc.length; i++) coords.push(arc[i]);
  }
  return coords;
}

export function topoGeometryToGeoJSON(geometry, arcs) {
  if (geometry.type === 'Polygon') return { type: 'Polygon', coordinates: geometry.arcs.map(r => resolveRing(r, arcs)) };
  if (geometry.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: geometry.arcs.map(p => p.map(r => resolveRing(r, arcs))) };
  return null;
}

// Fetch and decode TopoJSON once, return { arcs, features }
export async function loadTopoJSON(url) {
  const response = await fetch(url);
  const topo = await response.json();
  const arcs = decodeArcs(topo);
  const features = topo.objects.countries.geometries;
  return { arcs, features };
}
