import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import landGeoJson from '../../assets/ne-110m-land.json'
import styles from './Globe.module.scss'

// Square backing store matching .visual's $visual-size in Geography.module.scss —
// if that token moves, this must move with it. Like Coins3D, the canvas is sized
// in CSS px and setPixelRatio handles the device scaling, so linewidths and dot
// sizes below are all authored in CSS px.
const CANVAS_SIZE = 1150

// The globe lives at radius 1; every other distance is expressed as a multiple
// of it. Camera distance and FOV are chosen together so the visible half-height
// at the origin is ~1.35 — the sphere fills ~74% of the frame, leaving room for
// arcs (apex 1.3) to swing outside the silhouette without touching the
// canvas edge, which would clip them dead.
const GLOBE_RADIUS = 1
const CAMERA_DISTANCE = 4.75
const CAMERA_FOV = 33

// Body sits just inside the dot shell so it occludes far-side dots via the depth
// buffer instead of a per-dot facing test in JS. Too far in and dots near the
// limb poke through; 0.995 is the largest gap that still hides them cleanly.
const BODY_RADIUS = GLOBE_RADIUS * 0.995

// Graticule spacing. 1.4deg gives ~33k candidate cells, ~9.5k of them land —
// dense enough to resolve the Great Lakes and the UK/Ireland split, which is
// what separates this from the 7 hand-drawn polygons it replaces. Dropping to
// 1.0 roughly doubles the dot count; the GPU copes, but the grid stops reading
// as a grid and turns into a solid mass.
const DOT_STEP_DEG = 1.4
const DOT_PIXELS = 3.2

// Equirectangular land mask resolution. 2048x1024 is ~5.5px per graticule cell
// at DOT_STEP_DEG, so coastline cells resolve without aliasing into the sea.
const MASK_WIDTH = 2048

// Lighting direction, in world space. The camera never moves, so this doubles
// as the view-space direction and needs no per-frame transform. Up-and-left to
// match the reference's lit face.
const LIGHT_DIR = new THREE.Vector3(-0.6, 0.55, 0.58).normalize()

// Axial pose of the whole globe. The spin happens on a child group, so these
// stay fixed while longitude rotates underneath them.
//
// ROLL leans the axis left/right within the screen plane — 0 is what keeps the
// poles pointing straight up and down. TILT is only the viewing height: it tips
// the pole toward (+) or away from (-) the camera without leaning it sideways.
// At exactly 0 the camera sits in the equatorial plane, so every latitude row
// projects to a dead-straight horizontal line; a few degrees of TILT bends them
// back into arcs and reads as a sphere rather than a disc.
const degToRad = (deg) => (deg * Math.PI) / 180
const TILT_RAD = degToRad(25)
const ROLL_RAD = degToRad(10)
const SPIN_SECONDS = 45

// Scales the whole dot field, holding the lit/dim balance fixed — the one
// number to touch when the earth as a whole is too bright or too dim (the role
// BRIGHTNESS plays in Coins3D). Lower to push it further toward the reference's
// near-black sphere; adjust the two colours below only to shift the lit face
// against the unlit one.
const DOT_BRIGHTNESS = 0.6

// The particle field is white first: the globe should read as a white dotted
// earth, with colour arriving as illumination on top rather than as the base
// tone.
const COLOR_DOT_BASE = 0xc8d4ec

// Soft radial colour fields sitting just inside the globe. Each tints the
// particles nearest it and falls off with distance, so blue and violet read as
// localised light washing across groups of dots — not a colour assigned per
// country. They live in the globe's local space, so a region keeps its tint as
// the earth turns under it.
//
// `reach` is the world-space radius the influence dies out over and `strength`
// how far toward the field colour a particle at the centre travels. Strength is
// deliberately below 1: even at the core the particle is a mix with white,
// which is what keeps this off neon.
const COLOR_FIELD_DEPTH = 0.85
const COLOR_FIELDS = [
  { lng: 12, lat: 28, color: 0x4891ff, reach: 1.3, strength: 1 },
  { lng: 104, lat: 22, color: 0x7949ff, reach: 1.2, strength: 1 },
  { lng: -88, lat: 18, color: 0x5b8cff, reach: 1.15, strength: 1 },
  { lng: -52, lat: -24, color: 0x8b5cf6, reach: 1.5, strength: 1 },
]

// Arcs spill a little of their colour onto the particles they pass over. Kept
// low and tight — this is a secondary accent, and the regional fields above are
// what must carry the colour variation on their own.
const ARC_GLOW_REACH = 0.42
const ARC_GLOW_STRENGTH = 0.3
const COLOR_BODY = 0x121a2d
const ARC_COLORS = [0x4891ff, 0x7949ff, 0xff9a01]

// Atmosphere rim: a real spherical shell just outside the body, not a flat 2D
// ring — a shell's fresnel falloff traces the sphere's exact curvature at any
// scale for free, where a flat circle needs its radius hand-solved to match
// (see the trig this replaced). SCALE is how far outside the body it sits;
// kept tight so it reads as a rim, not a halo. INTENSITY is the one number to
// touch if it reads as too much or too little glow.
const COLOR_RIM_BLUE = 0x9fc2ff
const COLOR_RIM_VIOLET = 0xb69cff
const COLOR_RIM_WHITE = 0xeaf1ff
const RIM_SCALE = 1.016
const RIM_INTENSITY = 0.4

// Arc apex reaches 1.3x the globe radius so arcs visibly leave the silhouette
// and travel through space, rather than hugging the surface.
const ARC_LIFT = 0.3
const ARC_SEGMENTS = 48
const ARC_WIDTH = 2.4
// Fraction of the flight the visible streak spans, as a share of total progress.
const ARC_TAIL = 0.38
const ARC_MIN_MS = 2200
const ARC_EXTRA_MS = 1000
const PULSE_MS = 1200

// Cities the arcs fly between. Unlike the previous 2D version these are used at
// their true coordinates — that code snapped each city to the nearest rendered
// dot because its sparse Fibonacci field might not have one nearby, which cost
// an O(cities x dots) scan at init. At 1.4deg spacing there is always a dot
// within half a degree, so the snap is unnecessary.
const CITY_LNG_LAT = [
  [-74, 40.7], [-87.6, 41.9], [-118.2, 34.1], [-79.4, 43.7], [-99.1, 19.4], [-84.4, 33.7],
  [-46.6, -23.5], [-58.4, -34.6], [-74.1, 4.7], [-70.7, -33.4], [-77, -12],
  [0, 51.5], [2.35, 48.9], [13.4, 52.5], [19, 47.5], [12.5, 41.9], [-3.7, 40.4], [37.6, 55.8], [30.5, 50.5],
  [3.4, 6.5], [31.2, 30], [36.8, -1.3], [18.4, -33.9], [7.5, 9.1], [-7.6, 33.6],
  [55.3, 25.2], [35.2, 31.8], [29, 41], [46.7, 24.7],
  [77.2, 28.6], [72.9, 19.1], [103.8, 1.35], [100.5, 13.8], [106.8, -6.2], [121, 14.6],
  [139.7, 35.7], [126.98, 37.6], [116.4, 39.9], [121.5, 31.2], [105.8, 21],
  [151.2, -33.9], [144.96, -37.8], [174.8, -36.9],
  [-149.9, 61.2], [-135, 60], [-123.1, 49.3], [-122.3, 47.6], [158, 53], [132, 43.1], [142.4, 43.1], [83, 55],
]

const toVec = (lng, lat) => {
  const phi = (lat * Math.PI) / 180
  const lam = (lng * Math.PI) / 180
  return new THREE.Vector3(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam))
}

// Rasterises the Natural Earth rings into an equirectangular bitmap once, then
// samples that per grid cell. Testing ~33k cells against the 128 rings directly
// would be millions of point-in-polygon tests at mount; this is one canvas fill
// plus an O(1) lookup per cell. All rings of a polygon go into a single path
// filled 'evenodd', so interior rings (the Caspian) punch through as holes.
function buildLandMask() {
  const width = MASK_WIDTH
  const height = MASK_WIDTH / 2
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#fff'

  for (const feature of landGeoJson.features) {
    const { type, coordinates } = feature.geometry
    // ne_110m_land is all Polygon today, but the 50m tier mixes in
    // MultiPolygon — normalising here keeps a data swap from breaking this.
    const polygons = type === 'Polygon' ? [coordinates] : coordinates
    for (const rings of polygons) {
      ctx.beginPath()
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const x = ((ring[i][0] + 180) / 360) * width
          const y = ((90 - ring[i][1]) / 180) * height
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
      }
      ctx.fill('evenodd')
    }
  }

  const rgba = ctx.getImageData(0, 0, width, height).data
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4] > 127 ? 1 : 0
  return { mask, width, height }
}

function buildDotPositions({ mask, width, height }) {
  const positions = []
  // One random per particle, baked once. It scatters brightness and picks out
  // the minority that stay bright white — without it every particle in a region
  // resolves to the same colour and the field reads as a flat sheet.
  const randoms = []
  // Constant-longitude graticule rather than equal-area sampling: columns
  // converge toward the poles, which is the aligned grid texture the reference
  // has and the previous Fibonacci scatter did not.
  for (let lat = -90 + DOT_STEP_DEG / 2; lat < 90; lat += DOT_STEP_DEG) {
    const y = Math.min(height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * height)))
    for (let lng = -180; lng < 180; lng += DOT_STEP_DEG) {
      const x = Math.min(width - 1, Math.max(0, Math.floor(((lng + 180) / 360) * width)))
      if (mask[y * width + x] !== 1) continue
      const v = toVec(lng, lat)
      positions.push(v.x * GLOBE_RADIUS, v.y * GLOBE_RADIUS, v.z * GLOBE_RADIUS)
      randoms.push(Math.random())
    }
  }
  return { positions: new Float32Array(positions), randoms: new Float32Array(randoms) }
}

// Point sprites are square by default in WebGL, which is exactly the dot shape
// the reference uses — so nothing is discarded to a circle here. Colour comes
// from a lambert term rather than a vertex attribute, letting the terminator
// stay fixed in space while the globe turns underneath it.
function createDotMaterial(pixelRatio, fields, arcCount) {
  return new THREE.ShaderMaterial({
    transparent: true,
    // Dots sit on a shell around a depth-writing body, so they need to test
    // depth (to be hidden on the far side) but not write it (they would
    // otherwise z-fight with each other along the limb).
    depthWrite: false,
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uDotPixels: { value: DOT_PIXELS },
      uRefDist: { value: CAMERA_DISTANCE },
      uLightDir: { value: LIGHT_DIR.clone() },
      uBrightness: { value: DOT_BRIGHTNESS },
      uColorBase: { value: new THREE.Color(COLOR_DOT_BASE) },
      uFieldPos: { value: fields.positions },
      uFieldColor: { value: fields.colors },
      uFieldReach: { value: fields.reach },
      uFieldStrength: { value: fields.strength },
      // Head position, colour and intensity of each in-flight arc, refreshed
      // every frame from the arc pool.
      uArcPos: { value: Array.from({ length: arcCount }, () => new THREE.Vector3()) },
      uArcColor: { value: Array.from({ length: arcCount }, () => new THREE.Color()) },
      uArcPower: { value: new Array(arcCount).fill(0) },
      uArcReach: { value: ARC_GLOW_REACH },
      uArcStrength: { value: ARC_GLOW_STRENGTH },
    },
    vertexShader: /* glsl */ `
      #define FIELD_COUNT ${COLOR_FIELDS.length}
      #define ARC_COUNT ${arcCount}

      uniform float uPixelRatio;
      uniform float uDotPixels;
      uniform float uRefDist;
      uniform vec3 uLightDir;
      uniform float uBrightness;
      uniform vec3 uColorBase;
      uniform vec3 uFieldPos[FIELD_COUNT];
      uniform vec3 uFieldColor[FIELD_COUNT];
      uniform float uFieldReach[FIELD_COUNT];
      uniform float uFieldStrength[FIELD_COUNT];
      uniform vec3 uArcPos[ARC_COUNT];
      uniform vec3 uArcColor[ARC_COUNT];
      uniform float uArcPower[ARC_COUNT];
      uniform float uArcReach;
      uniform float uArcStrength;
      attribute float aRandom;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // Every dot lies on the sphere, so its normal is its own direction.
        vec3 n = normalize(position);
        vec3 worldNormal = normalize(mat3(modelMatrix) * n);
        // Half-lambert, then a steep curve. The exponent is what pushes the
        // terminator back so the unlit face falls away instead of sitting at a
        // flat mid-tone across the whole sphere.
        float lambert = dot(worldNormal, normalize(uLightDir)) * 0.5 + 0.5;
        float lit = pow(lambert, 2.2);

        // Start white, then let each field wash its colour in by proximity.
        // smoothstep on distance is what makes the transitions gradual and
        // organic rather than bounded by any geographic edge — the fields know
        // nothing about coastlines, they are just lights sitting in the globe.
        vec3 tone = uColorBase;
        for (int i = 0; i < FIELD_COUNT; i++) {
          float falloff = 1.0 - smoothstep(0.0, uFieldReach[i], distance(position, uFieldPos[i]));
          tone = mix(tone, uFieldColor[i], pow(falloff, 1.7) * uFieldStrength[i]);
        }

        // Arcs spill a little colour onto whatever they pass over. Added rather
        // than mixed, so it lifts particles instead of recolouring them.
        vec3 spill = vec3(0.0);
        for (int i = 0; i < ARC_COUNT; i++) {
          float falloff = 1.0 - smoothstep(0.0, uArcReach, distance(position, uArcPos[i]));
          spill += uArcColor[i] * pow(falloff, 2.0) * uArcPower[i];
        }

        float scatter = mix(0.78, 1.14, aRandom);
        vColor = (tone * scatter * (0.34 + 0.66 * lit) + spill * uArcStrength) * uBrightness;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        // Size in CSS px at the sphere's centre plane, easing larger as dots
        // come nearer the camera.
        gl_PointSize = uDotPixels * uPixelRatio * (uRefDist / -mvPosition.z);

        // Fade out approaching the true silhouette. A point sprite is a flat
        // square drawn at a fixed screen size, so once its centre reaches the
        // geometric edge (viewNormal.z == 0) half that square would poke past
        // the sphere into empty space — that's what reads as a ragged rather
        // than a clean circular edge. Ending the fade at a small positive
        // margin, not exactly 0, means a dot is already fully transparent
        // before its quad can start crossing the boundary; the wide start
        // keeps the dissolve gradual rather than a visible cliff.
        vec3 viewNormal = normalize(normalMatrix * n);
        vAlpha = smoothstep(0.03, 0.24, viewNormal.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        gl_FragColor = vec4(vColor, vAlpha);
        #include <colorspace_fragment>
      }
    `,
  })
}

// Flat and unlit on purpose. The body's only jobs are to read as a near-black
// sphere and to write depth so the dot shell's far side stays occluded. It used
// to carry a fresnel rim, but the reference has no glow anywhere on the globe —
// any shading here shows up as exactly the edge halo that was wrong.
function createBodyMaterial() {
  return new THREE.MeshBasicMaterial({ color: COLOR_BODY })
}

// White radial falloff, tinted per-sprite via SpriteMaterial.color so one
// texture serves every node and pulse ring.
function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.7)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createRingTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = 'rgba(255,255,255,1)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2)
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(CANVAS_SIZE, CANVAS_SIZE, false)
  return renderer
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, CAMERA_DISTANCE * 4)
  camera.position.z = CAMERA_DISTANCE
  return camera
}

// Standard "planet atmosphere" technique: a sphere slightly larger than the
// body, rendered BackSide so each screen pixel shows the shell's FAR wall
// rather than its near one. That far point's outward normal faces away from
// the camera at screen centre (dot(normal, viewDir) ~ -1) and swings round to
// face the camera at the true grazing edge (~0) — so 1-abs(dot) is already a
// rim mask that peaks exactly on the sphere's silhouette, with no separate
// radius to solve for. A second, independent wave around the sphere's own
// longitude (not the screen) breaks the ring into brighter/dimmer sections
// rather than a uniform band, and leans each bright section toward white —
// the same "brighter reads whiter" coupling the particle field uses.
function createAtmosphereRim() {
  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS * RIM_SCALE, 96, 96)
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColorBlue: { value: new THREE.Color(COLOR_RIM_BLUE) },
      uColorViolet: { value: new THREE.Color(COLOR_RIM_VIOLET) },
      uColorWhite: { value: new THREE.Color(COLOR_RIM_WHITE) },
      uIntensity: { value: RIM_INTENSITY },
    },
    vertexShader: /* glsl */ `
      varying vec3 vViewNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalNormal;

      void main() {
        vLocalNormal = normalize(position);
        vViewNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorBlue;
      uniform vec3 uColorViolet;
      uniform vec3 uColorWhite;
      uniform float uIntensity;
      varying vec3 vViewNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalNormal;

      void main() {
        float facing = dot(normalize(vViewNormal), normalize(vViewDir));
        float rim = smoothstep(0.35, 1.0, pow(clamp(1.0 - abs(facing), 0.0, 1.0), 2.5));

        // Two low-frequency waves around the sphere's own longitude rather
        // than one, so brightness varies section to section instead of
        // reading as a single mechanical pulse.
        float angle = atan(vLocalNormal.y, vLocalNormal.x);
        float w1 = sin(angle * 2.0 + 0.6);
        float w2 = sin(angle * 3.0 + 2.4);
        float wave = clamp(0.5 + 0.5 * (w1 * 0.6 + w2 * 0.4), 0.0, 1.0);
        float section = pow(wave, 1.6);

        vec3 hue = mix(uColorBlue, uColorViolet, 0.5 + 0.5 * cos(angle * 1.6 + 3.1));
        vec3 color = mix(hue, uColorWhite, section * 0.5);

        gl_FragColor = vec4(color, rim * section * uIntensity);
        #include <colorspace_fragment>
      }
    `,
  })
  return new THREE.Mesh(geometry, material)
}

function slerp(a, b, t) {
  const dot = Math.max(-1, Math.min(1, a.dot(b)))
  const omega = Math.acos(dot)
  const sinOmega = Math.sin(omega) || 1e-6
  const ka = Math.sin((1 - t) * omega) / sinOmega
  const kb = Math.sin(t * omega) / sinOmega
  return new THREE.Vector3(a.x * ka + b.x * kb, a.y * ka + b.y * kb, a.z * ka + b.z * kb)
}

function disposeScene(scene) {
  scene.traverse((object) => {
    if (object.geometry) object.geometry.dispose()
    if (!object.material) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && value.isTexture) value.dispose()
      })
      material.dispose()
    })
  })
}

// Plain three.js in one effect, matching Coins3D — there is nothing reactive
// here, just a rig driven by a RAF loop.
function Globe({ facingLng = 50, arcCount = 7 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = createRenderer(canvas)
    const camera = createCamera()
    const scene = new THREE.Scene()
    const pixelRatio = renderer.getPixelRatio()

    // tilt holds the fixed axial pose; spin turns longitude underneath it.
    const tiltGroup = new THREE.Group()
    tiltGroup.rotation.x = TILT_RAD
    tiltGroup.rotation.z = ROLL_RAD
    const spinGroup = new THREE.Group()
    spinGroup.rotation.y = (-facingLng * Math.PI) / 180
    tiltGroup.add(spinGroup)
    scene.add(tiltGroup)

    const body = new THREE.Mesh(new THREE.SphereGeometry(BODY_RADIUS, 96, 96), createBodyMaterial())
    spinGroup.add(body)

    // Fields sit inside the sphere, in the same local space as the dots, so
    // they rotate with the earth and a region keeps its tint.
    const fields = {
      positions: COLOR_FIELDS.map(({ lng, lat }) => toVec(lng, lat).multiplyScalar(COLOR_FIELD_DEPTH)),
      colors: COLOR_FIELDS.map(({ color }) => new THREE.Color(color)),
      reach: COLOR_FIELDS.map(({ reach }) => reach),
      strength: COLOR_FIELDS.map(({ strength }) => strength),
    }

    const { positions, randoms } = buildDotPositions(buildLandMask())
    const dotGeometry = new THREE.BufferGeometry()
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    dotGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
    const dotMaterial = createDotMaterial(pixelRatio, fields, arcCount)
    const dots = new THREE.Points(dotGeometry, dotMaterial)
    // The dot shell has no meaningful bounding sphere for the frustum culler to
    // work with mid-spin; it always fills the frame, so skip the test.
    dots.frustumCulled = false
    spinGroup.add(dots)
    spinGroup.add(createAtmosphereRim())

    const cities = CITY_LNG_LAT.map(([lng, lat]) => toVec(lng, lat))
    const glowTexture = createGlowTexture()
    const ringTexture = createRingTexture()

    // Arcs live inside spinGroup because their endpoints are pinned to cities
    // on the surface and have to travel with them.
    const arcGroup = new THREE.Group()
    spinGroup.add(arcGroup)

    // One pooled slot per concurrent arc, allocated up front — the flight data
    // is swapped in on spawn so nothing is created or disposed mid-animation.
    const slots = []
    for (let i = 0; i < arcCount; i++) {
      const geometry = new LineGeometry()
      geometry.setPositions(new Float32Array((ARC_SEGMENTS + 1) * 3))
      const material = new LineMaterial({
        color: 0xffffff,
        linewidth: ARC_WIDTH,
        transparent: true,
        depthWrite: false,
      })
      // LineMaterial converts its pixel linewidth to clip space with this, so
      // it has to carry the CSS size the renderer was given, not the scaled
      // drawing-buffer size.
      material.resolution.set(CANVAS_SIZE, CANVAS_SIZE)
      const line = new Line2(geometry, material)
      line.frustumCulled = false
      line.visible = false
      arcGroup.add(line)

      const nodes = []
      const pulses = []
      for (let end = 0; end < 2; end++) {
        const node = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTexture,
            transparent: true,
            depthWrite: false,
            // The quad is flat but the surface it sits on is curved, so depth
            // testing against the body clips the far half into a crescent.
            // The facing fade above already hides it past the limb, so it's
            // safe to skip the test entirely.
            depthTest: false,
            blending: THREE.AdditiveBlending,
          }),
        )
        node.visible = false
        arcGroup.add(node)
        nodes.push(node)

        const pulse = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: ringTexture,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
          }),
        )
        pulse.visible = false
        arcGroup.add(pulse)
        pulses.push(pulse)
      }

      slots.push({
        line,
        geometry,
        material,
        nodes,
        pulses,
        arc: null,
        headLocal: new THREE.Vector3(),
        headColor: new THREE.Color(),
        headPower: 0,
      })
    }

    const arcPoints = new Float32Array((ARC_SEGMENTS + 1) * 3)
    const worldPoint = new THREE.Vector3()

    // How much a city faces the camera. The camera sits on +z looking at the
    // origin and never moves, so a world-space z of 1 is dead centre and 0 is
    // the limb.
    const facingOf = (city) => worldPoint.copy(city).applyMatrix4(spinGroup.matrixWorld).normalize().z

    const spawnArc = (now) => {
      const busy = new Set()
      for (const slot of slots) {
        if (!slot.arc) continue
        busy.add(slot.arc.ai)
        busy.add(slot.arc.bi)
      }

      const visible = []
      for (let i = 0; i < cities.length; i++) {
        if (busy.has(i)) continue
        // Low bar so endpoints can sit near the rim and arcs stretch right
        // across the sphere, rather than clustering in the middle.
        if (facingOf(cities[i]) > 0.12) visible.push(i)
      }
      if (visible.length < 2) return null

      const ai = visible[Math.floor(Math.random() * visible.length)]
      let bi = ai
      while (bi === ai) bi = visible[Math.floor(Math.random() * visible.length)]

      return {
        ai,
        bi,
        a: cities[ai],
        b: cities[bi],
        start: now,
        dur: ARC_MIN_MS + Math.random() * ARC_EXTRA_MS,
        color: new THREE.Color(ARC_COLORS[Math.floor(Math.random() * ARC_COLORS.length)]),
      }
    }

    const updateSlot = (slot, now) => {
      const { arc } = slot
      const t = Math.min(1, (now - arc.start) / arc.dur)
      const fade = t < 0.9 ? 1 : 1 - (t - 0.9) / 0.1
      const head = t
      const tail = Math.max(0, t - ARC_TAIL)

      if (head - tail < 1e-3) {
        slot.line.visible = false
        return
      }

      for (let s = 0; s <= ARC_SEGMENTS; s++) {
        const u = tail + (head - tail) * (s / ARC_SEGMENTS)
        const point = slerp(arc.a, arc.b, u)
        // Lift follows a sine over the flight, so the arc leaves the surface at
        // both ends and peaks outside the silhouette in between.
        const lift = GLOBE_RADIUS * (1 + ARC_LIFT * Math.sin(Math.PI * u))
        arcPoints[s * 3] = point.x * lift
        arcPoints[s * 3 + 1] = point.y * lift
        arcPoints[s * 3 + 2] = point.z * lift
      }

      slot.geometry.setPositions(arcPoints)
      slot.material.color.copy(arc.color)
      slot.material.opacity = fade
      slot.line.visible = true

      // Leading tip, in the same local space as the dots, so the particle
      // shader can spill a little of this arc's colour onto what it flies over.
      const tip = ARC_SEGMENTS * 3
      slot.headLocal.set(arcPoints[tip], arcPoints[tip + 1], arcPoints[tip + 2])
      slot.headColor.copy(arc.color)
      slot.headPower = fade

      const pulse = ((now - arc.start) % PULSE_MS) / PULSE_MS
      const ends = [arc.a, arc.b]
      for (let end = 0; end < 2; end++) {
        const facing = worldPoint.copy(ends[end]).applyMatrix4(spinGroup.matrixWorld).normalize().z
        const visible = Math.max(0, Math.min(1, (facing + 0.05) / 0.18))

        const node = slot.nodes[end]
        node.visible = visible > 0.05
        node.position.copy(ends[end]).multiplyScalar(GLOBE_RADIUS * 1.004)
        node.scale.setScalar(0.085)
        node.material.color.copy(arc.color)
        node.material.opacity = visible * fade

        const ring = slot.pulses[end]
        ring.visible = visible > 0.05
        ring.position.copy(node.position)
        ring.scale.setScalar(0.07 + pulse * 0.16)
        ring.material.color.copy(arc.color)
        ring.material.opacity = (1 - pulse) * 0.5 * visible * fade
      }
    }

    const releaseSlot = (slot) => {
      slot.arc = null
      slot.line.visible = false
      // Drop the spill with the arc, or the particles it was lighting keep the
      // tint after it has gone.
      slot.headPower = 0
      slot.nodes.forEach((node) => (node.visible = false))
      slot.pulses.forEach((ring) => (ring.visible = false))
    }

    const spinRate = (Math.PI * 2) / (SPIN_SECONDS * 1000)
    let lastNow = null
    let frameId = null

    function animate() {
      frameId = requestAnimationFrame(animate)
      const now = performance.now()
      // First frame after a (re)start has no previous timestamp to measure
      // against, so it advances nothing.
      const delta = lastNow === null ? 0 : now - lastNow
      lastNow = now

      spinGroup.rotation.y += spinRate * delta

      // Spawn and endpoint visibility both read world positions, so the graph
      // has to be current before either runs.
      scene.updateMatrixWorld()

      for (const slot of slots) {
        if (slot.arc && now - slot.arc.start > slot.arc.dur + 600) releaseSlot(slot)
        if (!slot.arc && Math.random() < 0.25) slot.arc = spawnArc(now)
        if (slot.arc) updateSlot(slot, now)
      }

      // Hand the arc tips to the particle shader after the slot pass, so the
      // spill matches where the arcs actually are this frame.
      const arcUniforms = dotMaterial.uniforms
      for (let i = 0; i < slots.length; i++) {
        arcUniforms.uArcPos.value[i].copy(slots[i].headLocal)
        arcUniforms.uArcColor.value[i].copy(slots[i].headColor)
        arcUniforms.uArcPower.value[i] = slots[i].arc ? slots[i].headPower : 0
      }

      renderer.render(scene, camera)
    }

    // Only render while the section is actually on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && frameId === null) {
          // Reset the clock so the globe doesn't jump by however long it spent
          // scrolled away.
          lastNow = null
          animate()
        } else if (!entry.isIntersecting && frameId !== null) {
          cancelAnimationFrame(frameId)
          frameId = null
        }
      },
      { threshold: 0.01 },
    )
    observer.observe(canvas)

    return () => {
      observer.disconnect()
      if (frameId !== null) cancelAnimationFrame(frameId)
      disposeScene(scene)
      glowTexture.dispose()
      ringTexture.dispose()
      renderer.dispose()
    }
  }, [facingLng, arcCount])

  return <canvas ref={canvasRef} className={styles.canvas} />
}

export default Globe
