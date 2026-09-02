// Precomputes Globe.jsx's land-dot field offline instead of at runtime.
// Globe used to rasterize ne-110m-land.json to a 2048x1024 canvas and read
// back ~2M pixels on every page load just to answer "is this grid cell
// land?" — expensive, and always the same answer since the source data
// never changes per-visitor. This does that same land test once, here, via
// direct point-in-polygon (fine at build time even though it doesn't scale
// to a runtime per-frame cost), and writes the resulting dot positions to a
// small binary file the browser just loads.
//
// Rerun with `npm run build:globe-dots` if DOT_STEP_DEG or the source
// GeoJSON ever changes — Globe.jsx does not regenerate this itself.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = join(__dirname, '../src/assets/ne-110m-land.json')
const OUTPUT_PATH = join(__dirname, '../src/assets/globe-dots.bin')

// Must match Globe.jsx's DOT_STEP_DEG/GLOBE_RADIUS — kept in sync by hand
// since one is a build-time-only script and the other a browser module.
const DOT_STEP_DEG = 1.4
const GLOBE_RADIUS = 1

const landGeoJson = JSON.parse(readFileSync(SOURCE_PATH, 'utf-8'))

// Ray-casting against every ring of a polygon at once — replicates the
// canvas 'evenodd' fill Globe.jsx used to rely on (an odd total crossing
// count is inside), so holes like the Caspian punch through with no special
// casing needed.
function pointInPolygon(lng, lat, rings) {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (crosses) inside = !inside
    }
  }
  return inside
}

function isLand(lng, lat) {
  for (const feature of landGeoJson.features) {
    const { type, coordinates } = feature.geometry
    // ne_110m_land is all Polygon today, but the 50m tier mixes in
    // MultiPolygon — normalising here keeps a data swap from breaking this.
    const polygons = type === 'Polygon' ? [coordinates] : coordinates
    for (const rings of polygons) {
      if (pointInPolygon(lng, lat, rings)) return true
    }
  }
  return false
}

const toVec = (lng, lat) => {
  const phi = (lat * Math.PI) / 180
  const lam = (lng * Math.PI) / 180
  return [Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)]
}

const positions = []
const randoms = []

for (let lat = -90 + DOT_STEP_DEG / 2; lat < 90; lat += DOT_STEP_DEG) {
  for (let lng = -180; lng < 180; lng += DOT_STEP_DEG) {
    if (!isLand(lng, lat)) continue
    const [x, y, z] = toVec(lng, lat)
    positions.push(x * GLOBE_RADIUS, y * GLOBE_RADIUS, z * GLOBE_RADIUS)
    randoms.push(Math.random())
  }
}

const count = randoms.length

// Packed as [count: uint32][positions: count*3 float32][randoms: count float32],
// all little-endian — matches Float32Array's native layout on every
// browser/OS this site targets, so Globe.jsx can view the fetched buffer
// directly with no per-element parsing.
const buffer = new ArrayBuffer(4 + count * 3 * 4 + count * 4)
const view = new DataView(buffer)
view.setUint32(0, count, true)

let offset = 4
for (let i = 0; i < count * 3; i++, offset += 4) view.setFloat32(offset, positions[i], true)
for (let i = 0; i < count; i++, offset += 4) view.setFloat32(offset, randoms[i], true)

writeFileSync(OUTPUT_PATH, Buffer.from(buffer))
console.log(`Wrote ${count} dots to ${OUTPUT_PATH} (${(buffer.byteLength / 1024).toFixed(1)} KB)`)
