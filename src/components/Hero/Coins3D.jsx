import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import coinGoldGlbUrl from '../../assets/coin.glb'
import coinBlueGlbUrl from '../../assets/coin-blue.glb'
import coinPurpleGlbUrl from '../../assets/coin-purple.glb'
import styles from './Hero.module.scss'

// Same radius, tilt/lean angles and delays as the CSS version it replaces —
// see Hero.module.scss history for how these numbers were tuned. The canvas
// itself is padded well past the 792x690 visual box: unlike a plain DOM
// element (which overflows its box freely unless clipped), a <canvas> has a
// hard edge — anything drawn outside its own pixel bounds is just gone. The
// margin gives the orbit room to swing without hitting that edge, and the
// canvas is offset by -MARGIN so its center still lands on the same origin.
// BOX_HEIGHT must match .visual's height in Hero.module.scss so the orbit
// stays centered on the (now taller) box.
const BOX_WIDTH = 792
const BOX_HEIGHT = 690
// Radius/perspective/margin scaled 1.25x with the blob's height growth
// (552->690) — re-centering alone (BOX_HEIGHT) wasn't enough, the ring
// itself still needed to be bigger to clear the now-taller silhouette.
const MARGIN = 225
const CANVAS_WIDTH = BOX_WIDTH + MARGIN * 2
const CANVAS_HEIGHT = BOX_HEIGHT + MARGIN * 2
const RADIUS = 400
const PERSPECTIVE = 1650
// Signs flipped from the CSS values (-20deg / -35deg): CSS's Y axis points
// down the screen, Three.js's points up. Rotations about Y (the orbit sweep)
// are unaffected, but rotations about X (tilt) and Z (lean) both depend on Y
// in their rotation matrices, so the same angle mirrors visually between the
// two systems unless the sign is flipped here.
const TILT_RAD = (25 * Math.PI) / 180
const LEAN_RAD = (35 * Math.PI) / 180
// Nudges the whole ring up (Three.js +Y is up) so the top-right of the orbit
// clears the blob instead of clipping into it — the lean is diagonal, so
// raising the ring's center lifts that corner along with everything else.
const ORBIT_OFFSET_Y = 30
const DURATION = 26
// The per-coin rotateY(90deg) that makes the rim lead the direction of
// travel (see addCoin) — kept as its own name because animate() adds the
// self-spin on top of this same pose every frame.
const BASE_COIN_ROTATION = Math.PI / 2
// Slow continuous spin on each coin's own axis, independent of DURATION (the
// orbit's period) so tuning one doesn't drag the other along. A full turn
// every 18s reads as a lazy tumble rather than a spinning top.
const SELF_SPIN_SECONDS = 18
const SELF_SPIN_RATE = (Math.PI * 2) / SELF_SPIN_SECONDS
const TARGET_DIAMETER = 88
// Evenly spaced delays around one lap (was a hardcoded 8-entry array stepping
// by DURATION/8 = 3.25). COIN_COUNT is deliberately not a multiple of
// MODELS.length (3) — see the COINS comment below for why that matters.
const COIN_COUNT = 10
const DELAYS = Array.from({ length: COIN_COUNT }, (_, i) => (-i * DURATION) / COIN_COUNT)
// The chip models are authored lying flat where the gold coin stands upright:
// the chip's mesh is 1.899 x 0.336 x 1.899, so its thin axis (the face
// normal) is Y, while the gold coin's is 1.899 x 1.898 x 0.361 — normal Z.
// X = 90 rotates the chip's normal Y->Z to match, which is what lets
// addCoin's 90deg Y turn leave both leading with the rim.
//
// Note Y is the chip's own axis of symmetry, so a Y rotation here is a no-op
// by construction: it spins the disc in its own plane, moving nothing but the
// texture. Use Z instead to stand the chip up facing the camera.
const CHIP_TILT_DEG = 90
const CHIP_TURN_DEG = 0
const CHIP_ROTATION = new THREE.Euler((CHIP_TILT_DEG * Math.PI) / 180, (CHIP_TURN_DEG * Math.PI) / 180, 0)
// coin-purple.glb is coin-blue.glb's mesh with a hue-rotated baseColor map
// (+72.3deg, the measured delta between coin-blue.png and coin-purple.png),
// so the two chips share both geometry and CHIP_ROTATION; only gold differs.
const MODELS = [
  { url: coinGoldGlbUrl, rotation: undefined },
  { url: coinBlueGlbUrl, rotation: CHIP_ROTATION },
  { url: coinPurpleGlbUrl, rotation: CHIP_ROTATION },
]
// Cycles the three finishes around the ring. COIN_COUNT over 3 models doesn't
// divide evenly, which is what keeps the sequence from reading as a repeat.
const COINS = DELAYS.map((delay, index) => ({ delay, model: index % MODELS.length }))

// Brightness comes from two knobs because the models respond to different
// things. The chips are metalness 0 — pure diffuse, so the lights below are
// their only input. coin.glb is metalness 1 (the glTF default its material
// omits), and a full metal has no diffuse response at all: it can only mirror
// an environment, so ENVIRONMENT_INTENSITY is the knob that moves the gold.
//
// The light values are pi-scaled from the 1.1 / 2.2 they were first tuned at.
// three dropped legacy lighting in r155 and direct light now runs through a
// physically-correct diffuse BRDF that divides by pi, which left the old
// numbers landing the coins under their own texture brightness.
//
// BRIGHTNESS scales all three together, holding that balance fixed — it's the
// one number to touch when the ring as a whole is too bright or too dim. Tune
// the individual values only to shift gold against the chips.
const BRIGHTNESS = 0.2
const HEMI_INTENSITY = 1.1 * Math.PI * BRIGHTNESS
const KEY_INTENSITY = 2.2 * Math.PI * BRIGHTNESS
const ENVIRONMENT_INTENSITY = 1 * BRIGHTNESS

function createRig() {
  const scene = new THREE.Scene()
  scene.environmentIntensity = ENVIRONMENT_INTENSITY
  scene.add(new THREE.HemisphereLight(0xfff2d8, 0x241505, HEMI_INTENSITY))
  const key = new THREE.DirectionalLight(0xffe6b8, KEY_INTENSITY)
  key.position.set(-260, 320, 480)
  scene.add(key)

  // rotateZ(lean) -> rotateX(tilt) -> (per coin) rotateY(theta), mirroring
  // the CSS transform order outer-to-inner as nested groups.
  const lean = new THREE.Group()
  lean.rotation.z = LEAN_RAD
  lean.position.y = ORBIT_OFFSET_Y
  const tilt = new THREE.Group()
  tilt.rotation.x = TILT_RAD
  lean.add(tilt)
  scene.add(lean)

  return { scene, mount: tilt }
}

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false)
  return renderer
}

// Bakes RoomEnvironment into an image-based light for one scene, tied to the
// renderer that will draw it. Returns the texture so the caller can dispose
// it — see the call site for why this can't be shared between renderers.
function createEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment()).texture
  scene.environment = envMap
  pmrem.dispose()
  return envMap
}

function createCamera() {
  // Matches CSS perspective(1100px): fov derived from the canvas height and
  // that same distance, so 1 Three.js unit lines up with 1 CSS px at z=0 —
  // using the padded canvas height keeps that mapping true out to the margin.
  const fov = 2 * Math.atan(CANVAS_HEIGHT / 2 / PERSPECTIVE) * (180 / Math.PI)
  const camera = new THREE.PerspectiveCamera(fov, CANVAS_WIDTH / CANVAS_HEIGHT, 1, PERSPECTIVE * 3)
  camera.position.z = PERSPECTIVE
  return camera
}

// Recenters and scales a loaded GLTF to TARGET_DIAMETER, wrapped in a group
// so per-coin clones can be positioned/rotated independently while sharing
// the same underlying geometry/material (cheap — no texture duplication).
function buildTemplate(gltf, rotation = new THREE.Euler()) {
  const box = new THREE.Box3().setFromObject(gltf.scene)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const scale = TARGET_DIAMETER / Math.max(size.x, size.y, size.z)
  gltf.scene.position.sub(center)

  // Model-space orientation, nested inside the template so it pivots the
  // already-centered mesh about its own center (rotating gltf.scene itself
  // would pivot about the model's original origin, since its position is now
  // -center and Three composes T * R * S) and leaves the outer group's
  // rotation.y free for the per-coin orbit turn in addCoin.
  const oriented = new THREE.Group()
  oriented.rotation.copy(rotation)
  oriented.add(gltf.scene)

  const template = new THREE.Group()
  template.add(oriented)
  template.scale.setScalar(scale)
  return template
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

// Two canvases stand in for the old CSS z-index -1 (behind the blob) and 2
// (in front of the portrait) — one canvas can't sit behind one DOM layer and
// in front of another at once, so each coin is reparented between the two
// scenes' shared lean/tilt rig as it crosses the near/far point of its orbit.
// Kept to plain three.js (no react-three-fiber) since there's nothing
// reactive here — one static rig animated on a loop.
function Coins3D() {
  const backCanvasRef = useRef(null)
  const frontCanvasRef = useRef(null)

  useEffect(() => {
    const backCanvas = backCanvasRef.current
    const frontCanvas = frontCanvasRef.current
    if (!backCanvas || !frontCanvas) return

    let cancelled = false
    const back = createRig()
    const front = createRig()
    const backRenderer = createRenderer(backCanvas)
    const frontRenderer = createRenderer(frontCanvas)
    const camera = createCamera()

    // One bake per renderer, not one shared between them: a PMREM texture is
    // render-target output living in the GPU context that produced it, and it
    // has no CPU-side image the other context could re-upload. Sharing one
    // left the front scene with no working environment, which read as coins
    // changing brightness at the two points where they swap canvases.
    // Disposed by hand below — disposeScene only walks the graph's children,
    // and an environment map hangs off the scene itself.
    const backEnvMap = createEnvironment(backRenderer, back.scene)
    const frontEnvMap = createEnvironment(frontRenderer, front.scene)

    const sweepGroups = []
    const isFront = []

    function addCoin(template, delay) {
      const sweep = new THREE.Group()
      const coin = template.clone(true)
      // translateZ(radius) then rotateY(90deg), same order as the CSS
      // version — turns the coin so its rim leads the direction of travel.
      // animate() keeps adding to this same axis every frame for the self
      // spin, so BASE_COIN_ROTATION is the pose that offset tumbles from.
      coin.position.z = RADIUS
      coin.rotation.y = BASE_COIN_ROTATION
      sweep.add(coin)
      back.mount.add(sweep)
      sweepGroups.push({ group: sweep, coin, delay })
      isFront.push(null)
    }

    const loader = new GLTFLoader()

    MODELS.forEach(({ url, rotation }, modelIndex) => {
      loader.load(url, (gltf) => {
        if (cancelled) return
        const template = buildTemplate(gltf, rotation)
        COINS.filter((coin) => coin.model === modelIndex).forEach((coin) => addCoin(template, coin.delay))
      })
    })

    const startTime = performance.now()
    let frameId = null

    function animate() {
      frameId = requestAnimationFrame(animate)
      const t = (performance.now() - startTime) / 1000

      sweepGroups.forEach(({ group, coin, delay }, index) => {
        const progress = (((t + delay) % DURATION) + DURATION) % DURATION
        const theta = (progress / DURATION) * Math.PI * 2
        group.rotation.y = theta
        // delay reused as a phase offset so coins don't all tumble in lockstep.
        coin.rotation.y = BASE_COIN_ROTATION + (t + delay) * SELF_SPIN_RATE

        const nowFront = Math.cos(theta) >= 0
        if (isFront[index] !== nowFront) {
          isFront[index] = nowFront
          ;(nowFront ? front.mount : back.mount).add(group)
        }
      })

      backRenderer.render(back.scene, camera)
      frontRenderer.render(front.scene, camera)
    }

    // Only render while the Hero is actually on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && frameId === null) {
          animate()
        } else if (!entry.isIntersecting && frameId !== null) {
          cancelAnimationFrame(frameId)
          frameId = null
        }
      },
      { threshold: 0.01 },
    )
    observer.observe(backCanvas)

    return () => {
      cancelled = true
      observer.disconnect()
      if (frameId !== null) cancelAnimationFrame(frameId)
      disposeScene(back.scene)
      disposeScene(front.scene)
      backEnvMap.dispose()
      frontEnvMap.dispose()
      backRenderer.dispose()
      frontRenderer.dispose()
    }
  }, [])

  return (
    <>
      <canvas ref={backCanvasRef} className={styles.coinCanvasBack} />
      <canvas ref={frontCanvasRef} className={styles.coinCanvasFront} />
    </>
  )
}

export default Coins3D
