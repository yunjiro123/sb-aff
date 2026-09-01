import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '../Container/Container.jsx'
import sbGames from '../../assets/sb-games.webp'
import sbStats from '../../assets/sb-stats.webp'
import sbThird from '../../assets/sb-third.webp'
import sbFourth from '../../assets/sb-fourth.webp'
import sbFifth from '../../assets/sb-fifth.webp'
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
  const sectionRef = useRef(null)
  const handRef = useRef(null)
  const cardRefs = useRef([])
  const topRowRef = useRef(null)
  const bottomRowRef = useRef(null)
  const slotRefs = useRef([])
  const dealtRefs = useRef([])

  useEffect(() => {
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
        gsap.set(dealtRefs.current, { autoAlpha: 1 })
        return
      }

      gsap.set(dealtRefs.current, { autoAlpha: 0 })

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

        ScrollTrigger.create({
          trigger: rowEl,
          start,
          end,
          scrub: true,
          onUpdate: (self) => {
            const handRect = handRef.current.getBoundingClientRect()

            slotIndexes.forEach((slotIndex, order) => {
              const raw = clamp01((self.progress - order * DEAL_STAGGER) / span)
              const p = easeFlight(raw)
              const sourceIndex = SOURCE_CARDS[slotIndex]
              const source = cardRefs.current[sourceIndex]
              const slot = slotRefs.current[slotIndex]
              const landed = dealtRefs.current[slotIndex]

              // Crossfades to the in-slot copy over the flight's last
              // stretch rather than cutting at arrival — so the card
              // scrolls with the page afterwards, but the handoff reads
              // as a dissolve instead of a pop.
              const fade = clamp01((raw - FADE_START) / (1 - FADE_START))
              gsap.set(source, { autoAlpha: 1 - fade })
              gsap.set(landed, { autoAlpha: fade })

              // offsetLeft/Top are untransformed, so this stays a fixed
              // reference whatever the card is doing mid-flight.
              const restX = handRect.left + source.offsetLeft + source.offsetWidth / 2
              const restY = handRect.top + source.offsetTop + source.offsetHeight / 2
              const dst = slot.getBoundingClientRect()

              gsap.set(source, {
                x: fanX(sourceIndex) * (1 - p) + (dst.left + dst.width / 2 - restX) * p,
                y: fanY(sourceIndex) * (1 - p) + (dst.top + dst.height / 2 - restY) * p,
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

    return () => ctx.revert()
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
      {/* Unsharp-mask filter for the upscaled card artwork (see
          .cardAssetImg) — cheaper than shipping heavier source images, at
          the cost of amplifying noise/blockiness the upscale already put
          there rather than recovering real detail. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="ecosystemSharpen">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blurred" />
          <feComposite in="SourceGraphic" in2="blurred" operator="arithmetic" k1="0" k2="1.6" k3="-0.6" k4="0" />
        </filter>
      </svg>

      <Container>
        <span className={styles.sectionEyebrow}>Ecosystem</span>

        <h2 className={styles.heading}>
          Advanced Ecosystem For Profit
          <br />
          <span className={styles.accent}>Maximization</span>
        </h2>

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
