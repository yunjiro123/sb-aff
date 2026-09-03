import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '../Container/Container.jsx'
import useRevealAnimation from '../../hooks/useRevealAnimation.js'
import useIdleMount from '../../hooks/useIdleMount.js'
import sbGames from '../../assets/sb-games.webp'
import sbStats from '../../assets/sb-stats.webp'
import sbThird from '../../assets/sb-third.webp'
import sbFourth from '../../assets/sb-fourth.webp'
import sbFifth from '../../assets/sb-fifth.webp'
// Referenced as a CSS background on .card, imported here only so the prewarm
// below can decode it — a background image has no element to call decode()
// on, but the decoded-image cache is keyed by URL.
import cardTexture from '../../assets/card.webp'
import styles from './EcosystemAlt.module.scss'

gsap.registerPlugin(ScrollTrigger)

const ANGLES = [-30, -15, 0, 15, 30]
const RISE_FROM = 360

const TOP_SLOTS = [0, 1, 2]
const BOTTOM_SLOTS = [3, 4]

// Source hand card per slot index. The top row takes the middle three so
// the hand empties from the inside out and keeps its shape till the end.
const SOURCE_CARDS = [1, 2, 3, 0, 4]

const DEAL_STAGGER = 0.12
const dealSpan = (count) => 1 - DEAL_STAGGER * (count - 1)

// The settled copy crossfades in over this last slice of each flight's
// own progress, instead of a hard cut at arrival. Safe to do late — the
// flying card and its landing spot are nearly coincident by this point.
const FADE_START = 0.85

// What "hidden" means for a card that hasn't been dealt yet. Deliberately
// not 0: browsers skip painting fully-transparent content, which would defer
// every dealt card's first rasterization to the frames it fades in. This is
// indistinguishable on screen but keeps it paintable, so that work lands at
// setup instead. The crossfade floors at this rather than 0 for the same
// reason — see the clamp in createDeal's onUpdate.
const HIDDEN_OPACITY = 0.0001

const clamp01 = (n) => Math.min(1, Math.max(0, n))
const rad = (deg) => (deg * Math.PI) / 180

// Ordered to match slot index: TOP_SLOTS (0-2) then BOTTOM_SLOTS (3-4).
// `asset` is optional — only cards with one get the overhanging image treatment.
const CONTENT = [
  {
    eyebrow: 'Game Studio',
    title: '11000+ Exclusive Titles',
    highlight: 'Exclusive',
    copy: 'Exclusive titles built in-house, giving your traffic something no other operator can offer.',
    asset: sbGames,
  },
  {
    eyebrow: 'Live Analytics',
    title: 'Real Time Reporting',
    highlight: 'Real Time',
    copy: 'Track clicks, signups and revenue live — no waiting on end-of-day reports.',
    asset: sbStats,
  },
  {
    eyebrow: 'Player Value',
    title: 'Truly High LTV',
    highlight: 'High LTV',
    copy: 'Our own local call centers, VIP and support teams, welcome bonuses and loyalty programs.',
    asset: sbThird,
  },
  {
    eyebrow: 'Payments',
    title: 'Flexible Payouts',
    highlight: 'Payouts',
    copy: 'Get paid the way that works for you — multiple currencies and methods, with fast, reliable transfers.',
    asset: sbFourth,
    // Two side-by-side phones read best wider than the card, so this one
    // also bleeds past the left/right edges (see .cardAsset.sideOverhang).
    sideOverhang: true,
  },
  {
    eyebrow: 'Worldwide',
    title: 'Global Domination',
    highlight: 'Domination',
    copy: 'Reach players in every major market, backed by localized support and licenses that travel with you.',
    asset: sbFifth,
  },
]

const cardNumber = (slotIndex) => String(slotIndex + 1).padStart(2, '0')

const renderTitle = (title, highlight) => {
  const at = highlight ? title.indexOf(highlight) : -1
  if (at < 0) return title

  return (
    <>
      {title.slice(0, at)}
      <span className={styles.titleAccent}>{highlight}</span>
      {title.slice(at + highlight.length)}
    </>
  )
}

function EcosystemAlt() {
  const revealRef = useRevealAnimation()
  const sectionRef = useRef(null)
  const handRef = useRef(null)
  const cardRefs = useRef([])
  const topRowRef = useRef(null)
  const bottomRowRef = useRef(null)
  const slotRefs = useRef([])
  const dealtRefs = useRef([])

  // Decoding a webp expands it into a raw RGBA buffer — card.webp alone is
  // 900x1250 = 4.5MB, and the five card images another ~11MB between them.
  // Left to the browser that work happens lazily at first paint, which is
  // the exact frames the cards are flying, and never again (hence a stutter
  // only on the first reveal). decode() does it up front instead. Detached
  // Images rather than refs on the elements: the decoded-image cache is
  // keyed by URL, so this covers .card's CSS background too, which has no
  // element to call decode() on.
  //
  // Gated on idle rather than run at mount: this section is far below the
  // fold, but the decode was landing in the middle of first paint and
  // competing with Hero's above-the-fold reveal. Idle still leaves it many
  // seconds ahead of the scroll that needs it.
  const prewarmImages = useIdleMount()

  useEffect(() => {
    if (!prewarmImages) return

    const urls = [cardTexture, ...CONTENT.map(({ asset }) => asset).filter(Boolean)]

    urls.forEach((url) => {
      const img = new Image()
      img.src = url
      // Rejects if the image fails to load — nothing to do about it here,
      // the deal just falls back to decoding on demand as it did before.
      img.decode?.().catch(() => {})
    })
  }, [prewarmImages])

  useEffect(() => {
    // gsap.context().revert() cleans up tweens/ScrollTriggers created inside
    // it, but not listeners manually added via ScrollTrigger.addEventListener
    // — createDeal below registers one 'refresh' listener per row, tracked
    // here so cleanup can remove them explicitly.
    const refreshListeners = []

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Cards are slot-sized in the DOM and scaled down to hand size, so
      // the deal never renders them above native resolution. --display-w/h
      // are what they should read as in the hand; sizing below works from
      // those rather than offsetWidth/Height, which are the larger box.
      const cardStyle = getComputedStyle(cardRefs.current[0])
      const displayH = parseFloat(cardStyle.getPropertyValue('--display-h'))
      const restScaleX = parseFloat(cardStyle.getPropertyValue('--display-w')) / cardRefs.current[0].offsetWidth
      const restScaleY = displayH / cardRefs.current[0].offsetHeight

      // Cards rotate about their centre, so the fan's arc comes from
      // pairing each rotation with the offset a bottom pivot would have
      // swung it to. That keeps a resting pose to a plain (x, y, rotate)
      // triple, which the flight can interpolate straight out of.
      const fanX = (i) => (displayH / 2) * Math.sin(rad(ANGLES[i]))
      const fanY = (i) => (displayH / 2) * (1 - Math.cos(rad(ANGLES[i])))

      gsap.set(handRef.current, { autoAlpha: 0 })
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 115%',
        end: 'bottom bottom',
        onToggle: (self) => gsap.set(handRef.current, { autoAlpha: self.isActive ? 1 : 0 }),
      })

      if (reduced) {
        gsap.set(cardRefs.current, {
          x: (i) => fanX(i),
          y: (i) => fanY(i),
          rotate: (i) => ANGLES[i],
          scaleX: restScaleX,
          scaleY: restScaleY,
        })
        gsap.set(dealtRefs.current, { opacity: 1 })
        return
      }

      // Not autoAlpha (visibility: hidden) and deliberately not a flat 0:
      // browsers skip painting BOTH hidden and fully-transparent subtrees, so
      // either one leaves each card's gradients, clip-path, border-radius and
      // text to rasterize for the first time on the very frames it fades in —
      // which is why the stutter only ever showed up on the first reveal and
      // never again. A hair above zero is visually identical but counts as
      // paintable, so the raster happens up front and the crossfade is left
      // as a pure compositor change.
      gsap.set(dealtRefs.current, { opacity: HIDDEN_OPACITY })

      // The hand rises and fans open. Has to finish before the deal
      // begins, or cards fly out of a hand that's still opening.
      gsap.fromTo(
        cardRefs.current,
        { x: 0, y: RISE_FROM, rotate: 0, scaleX: restScaleX, scaleY: restScaleY },
        {
          x: (i) => fanX(i),
          y: (i) => fanY(i),
          rotate: (i) => ANGLES[i],
          scaleX: restScaleX,
          scaleY: restScaleY,
          ease: 'none',
          stagger: { each: 0.06, from: 'center' },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'top 50%',
            scrub: true,
          },
        },
      )

      const easeFlight = gsap.parseEase('power1.inOut')

      // offsetLeft/Top/Width/Height are just as layout-forcing as
      // getBoundingClientRect() — missed this the first pass. These are
      // static per hand card (fixed positioning, doesn't move with scroll),
      // so cache all 5 once instead of re-reading per slot per scroll frame.
      let cardOffsets = cardRefs.current.map((card) => ({
        left: card.offsetLeft,
        top: card.offsetTop,
        width: card.offsetWidth,
        height: card.offsetHeight,
      }))
      const remeasureCardOffsets = () => {
        cardOffsets = cardRefs.current.map((card) => ({
          left: card.offsetLeft,
          top: card.offsetTop,
          width: card.offsetWidth,
          height: card.offsetHeight,
        }))
      }
      ScrollTrigger.addEventListener('refresh', remeasureCardOffsets)
      refreshListeners.push(remeasureCardOffsets)

      // What flies is the real hand card, not a stand-in over the slot —
      // a separate element can only sit wholly in front of or behind
      // .hand, so it would jump layers the moment it launched.
      //
      // Rows anchor to their BOTTOM edge, which is load-bearing: the
      // flight interpolates toward the slot's live position, so if the
      // slot's centre is still below the hand's at the start, the card's
      // first move is downward. A slot whose top is on screen can still
      // have its middle below the fold, by an amount that varies with
      // viewport height; measuring from the bottom holds at any size.
      const createDeal = (rowEl, slotIndexes, start, end) => {
        const span = dealSpan(slotIndexes.length)

        // getBoundingClientRect() forces a synchronous layout flush of the
        // whole document, not just the queried element — cheap alone, but
        // it used to run on every scroll frame here (twice per slot, via
        // scrub), which gets expensive once there's enough layout
        // elsewhere on the page to make each flush costly. .hand is
        // `position: fixed`, so its rect never moves with scroll — safe to
        // measure once. Each slot is in normal flow, so its viewport
        // position does shift with scroll, but only by exactly how far the
        // page has scrolled since it was measured — which ScrollTrigger
        // already tracks via self.scroll(), for free. Re-measured on
        // ScrollTrigger's own 'refresh' (window resize / orientation
        // change) so a layout change doesn't leave these stale.
        let handRect = handRef.current.getBoundingClientRect()
        let slotRects = slotIndexes.map((slotIndex) => slotRefs.current[slotIndex].getBoundingClientRect())
        let measuredScroll = window.scrollY

        const remeasure = () => {
          handRect = handRef.current.getBoundingClientRect()
          slotRects = slotIndexes.map((slotIndex) => slotRefs.current[slotIndex].getBoundingClientRect())
          measuredScroll = window.scrollY
        }
        ScrollTrigger.addEventListener('refresh', remeasure)
        refreshListeners.push(remeasure)

        // gsap.set() is a zero-duration Tween: every call allocates a Tween,
        // parses its vars, resolves targets and inits CSSPlugin, then throws
        // it away. Fine occasionally, wasteful at three calls per slot per
        // frame (~540/sec for this row alone) — the allocation churn alone is
        // GC pressure. quickSetter is GSAP's own answer for values set at
        // frame rate: built once here, then it's just a property write.
        const setters = slotIndexes.map((slotIndex) => {
          const sourceIndex = SOURCE_CARDS[slotIndex]
          return {
            sourceIndex,
            // One "css" setter takes the whole transform+opacity batch, so
            // the two separate set(source, …) calls collapse into one.
            source: gsap.quickSetter(cardRefs.current[sourceIndex], 'css'),
            landed: gsap.quickSetter(dealtRefs.current[slotIndex], 'opacity'),
          }
        })

        ScrollTrigger.create({
          trigger: rowEl,
          start,
          end,
          scrub: true,
          onUpdate: (self) => {
            const scrollDelta = self.scroll() - measuredScroll

            setters.forEach(({ sourceIndex, source, landed }, order) => {
              const raw = clamp01((self.progress - order * DEAL_STAGGER) / span)
              const p = easeFlight(raw)

              // Crossfades to the in-slot copy over the flight's last
              // stretch rather than cutting at arrival — so the card
              // scrolls with the page afterwards, but the handoff reads
              // as a dissolve instead of a pop.
              const fade = clamp01((raw - FADE_START) / (1 - FADE_START))
              // Floored rather than allowed to hit 0 — dropping it to fully
              // transparent here would hand the browser back its licence to
              // skip painting this card, undoing the prewarm above.
              landed(Math.max(fade, HIDDEN_OPACITY))

              // offsetLeft/Top are untransformed, so this stays a fixed
              // reference whatever the card is doing mid-flight.
              const sourceOffset = cardOffsets[sourceIndex]
              const restX = handRect.left + sourceOffset.left + sourceOffset.width / 2
              const restY = handRect.top + sourceOffset.top + sourceOffset.height / 2
              const dst = slotRects[order]
              const dstTop = dst.top - scrollDelta

              source({
                opacity: 1 - fade,
                x: fanX(sourceIndex) * (1 - p) + (dst.left + dst.width / 2 - restX) * p,
                y: fanY(sourceIndex) * (1 - p) + (dstTop + dst.height / 2 - restY) * p,
                rotate: ANGLES[sourceIndex] * (1 - p),
                scaleX: restScaleX + (1 - restScaleX) * p,
                scaleY: restScaleY + (1 - restScaleY) * p,
              })
            })
          },
        })
      }

      createDeal(topRowRef.current, TOP_SLOTS, 'bottom bottom', 'bottom 75%')
      // The bottom row is last in the section and has far less page left
      // to scroll through, so it starts earlier and lands sooner.
      createDeal(bottomRowRef.current, BOTTOM_SLOTS, 'bottom bottom+=150', 'bottom 95%')
    }, sectionRef)

    return () => {
      ctx.revert()
      refreshListeners.forEach((fn) => ScrollTrigger.removeEventListener('refresh', fn))
    }
  }, [])

  // Ref'd by slot index, which runs across both rows.
  const renderSlot = (slotIndex) => {
    const { eyebrow, title, highlight, copy, asset, sideOverhang } = CONTENT[slotIndex]

    return (
      <div key={slotIndex} className={styles.slot} ref={(el) => (slotRefs.current[slotIndex] = el)}>
        <div
          className={`${styles.dealtCard} ${asset ? styles.hasImage : ''}`}
          ref={(el) => (dealtRefs.current[slotIndex] = el)}
        >
          {asset && (
            <>
              <div className={styles.dealtVignette} />
              <div className={`${styles.cardAsset} ${sideOverhang ? styles.sideOverhang : ''}`}>
                <img className={styles.cardAssetImg} src={asset} alt="" />
              </div>
              <div className={styles.dealtScrim} />
            </>
          )}
          <div className={styles.dealtBody}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowNum}>{cardNumber(slotIndex)}</span>
              <span className={styles.eyebrowRule} />
              <span className={styles.eyebrowLabel}>{eyebrow}</span>
            </div>
            <h3 className={styles.dealtTitle}>{renderTitle(title, highlight)}</h3>
            <p className={styles.dealtCopy}>{copy}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className={styles.ecosystem} ref={sectionRef}>
      <Container>
        <div ref={revealRef}>
          <span className={styles.sectionEyebrow} data-reveal>Ecosystem</span>

          <h2 className={styles.heading} data-reveal>
            Advanced ecosystem for profit
            <br />
            <span className={styles.accent}>Maximization</span>
          </h2>
        </div>

        <div className={styles.slotGrid}>
          <div className={styles.slotRow} ref={topRowRef}>
            {TOP_SLOTS.map(renderSlot)}
          </div>
          <div className={styles.slotRow} ref={bottomRowRef}>
            {BOTTOM_SLOTS.map(renderSlot)}
          </div>
        </div>
      </Container>

      <div className={styles.hand} ref={handRef}>
        {ANGLES.map((_, index) => (
          <div
            key={index}
            className={styles.card}
            style={{ zIndex: index }}
            ref={(el) => (cardRefs.current[index] = el)}
          />
        ))}
      </div>
    </section>
  )
}

export default EcosystemAlt
