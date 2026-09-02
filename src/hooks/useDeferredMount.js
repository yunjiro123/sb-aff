import { useEffect, useRef, useState } from 'react'

// Delays mounting an expensive below-the-fold child (a 3D scene, a heavy
// canvas) until its container is about to enter the viewport, instead of
// paying its setup cost at page load alongside everything above the fold.
// Once triggered it stays mounted for good — pausing/resuming after that is
// each consumer's own concern (Globe/Coins3D already gate their own render
// loops with their own IntersectionObserver; this only gates the mount).
export default function useDeferredMount(rootMargin = '600px') {
  const ref = useRef(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || shouldMount) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [rootMargin, shouldMount])

  return [ref, shouldMount]
}
