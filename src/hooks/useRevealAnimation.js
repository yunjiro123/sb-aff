import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Flip to false to disable site-wide again without touching each section's
// data-reveal markup/ref wiring.
const ENABLED = true

// Fades/slides in every [data-reveal] element inside the returned ref's
// container, staggered, the first time the container scrolls into view.
// One-shot reveal — no scrub — shared by every section's eyebrow/heading/copy.
//
// `armed` gates only the animation, not the hidden starting state: Hero
// passes false until the site loader clears, so its reveal plays on a quiet
// main thread instead of racing page-load work. Targets are hidden either
// way — arming it later must not mean a frame of visible text that then
// blinks out to animate back in. Sections that don't need to wait just call
// this with no argument.
export default function useRevealAnimation(armed = true) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!ENABLED) return

    const container = containerRef.current
    if (!container) return

    const targets = container.querySelectorAll('[data-reveal]')
    if (!targets.length) return

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reduced) {
        gsap.set(targets, { autoAlpha: 1, y: 0 })
        return
      }

      gsap.set(targets, { autoAlpha: 0, y: 28 })

      if (!armed) return

      ScrollTrigger.create({
        trigger: container,
        start: 'top 85%',
        once: true,
        onEnter: () =>
          gsap.to(targets, {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            stagger: 0.12,
          }),
      })
    }, container)

    return () => ctx.revert()
  }, [armed])

  return containerRef
}
