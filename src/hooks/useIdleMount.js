import { useEffect, useState } from 'react'

// Delays mounting an expensive but already-visible child (a 3D scene that
// can't be gated by viewport intersection, since it's on screen from the
// first frame) until the browser is idle — after initial layout/paint and
// other components' own mount work have settled — rather than fighting them
// for the main thread at the exact moment the page loads. Falls back to a
// plain timeout on browsers without requestIdleCallback (Safari).
export default function useIdleMount(timeout = 1500) {
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setShouldMount(true), { timeout })
      return () => window.cancelIdleCallback(id)
    }

    const id = window.setTimeout(() => setShouldMount(true), timeout)
    return () => window.clearTimeout(id)
  }, [timeout])

  return shouldMount
}
