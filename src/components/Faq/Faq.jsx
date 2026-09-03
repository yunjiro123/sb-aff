import { useState } from 'react'
import Container from '../Container/Container.jsx'
import useRevealAnimation from '../../hooks/useRevealAnimation.js'
import styles from './Faq.module.scss'

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

const FAQS = [
  {
    question: 'What is the difference between RevShare and CPA?',
    answer: [
      "According to the RevShare model, you immediately receive 50% of the company's total revenue for each player you refer for life. We cover all fees and operational costs.",
      'The CPA payment is a fixed payment for each player who completes a target action. We set appropriate KPIs because we are not only interested in our development, but your development as well.',
    ],
  },
  {
    question: 'Are there any banners I can use to advertise?',
    answer: ['Yes, we offer multiple banner sizes for your convenience'],
  },
  {
    question: 'I have big audience how I can get special deals?',
    answer: ['If you have a website with good traffic or social media account with big audience you can connect with us'],
  },
  {
    question: 'Can I see the data of my referral?',
    answer: [
      'Yes, Starzbet believes in total transparency and offer all data to the users like username, wager they have done, commissions you made, when they registered, which of your link they used. All in your Affiliate Dashboard.',
    ],
  },
]

// Decorative chat bubbles flanking the accordion, low-opacity and
// non-interactive — pure visual texture, not a real conversation log.
const LEFT_CHAT = [
  { variant: 'grey', align: 'start', text: 'Hello, can you help me? I have a few questions about interacting with your company' },
  { variant: 'purple', align: 'end', text: 'Hello! always happy to help you :)' },
  { variant: 'ghost', align: 'start'},
]

const RIGHT_CHAT = [
  { variant: 'grey', align: 'end', text: 'Hello, tell us more about your bonuses and benefits' },
  { variant: 'purple', align: 'start', text: 'Hello with pleasure!' },
  { variant: 'grey', align: 'end', text: 'Do you support crypto payouts too?' },
  { variant: 'ghost', align: 'start' },
]

function ChatColumn({ side, bubbles }) {
  return (
    <div className={styles.chatColumn} data-side={side} aria-hidden="true">
      {bubbles.map(({ variant, align, text }, index) => (
        <div key={index} className={styles.bubble} data-variant={variant} data-align={align}>
          {variant === 'ghost' ? (
            <span className={styles.typingDots}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </span>
          ) : (
            text
          )}
          <span className={styles.bubbleDot} />
        </div>
      ))}
    </div>
  )
}

function Faq() {
  const revealRef = useRevealAnimation()
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (index) => setOpenIndex((current) => (current === index ? null : index))

  return (
    <section className={styles.faq} id="faq">
      <Container>
        <div ref={revealRef}>
          <div className={styles.header}>
            <span className={styles.eyebrow} data-reveal>FAQ</span>
            <h2 className={styles.heading} data-reveal>Everything you need to know.</h2>
          </div>

          <div className={styles.listWrap}>
            <ChatColumn side="left" bubbles={LEFT_CHAT} />
            <ChatColumn side="right" bubbles={RIGHT_CHAT} />

            <div className={styles.list}>
              {FAQS.map(({ question, answer }, index) => {
                const isOpen = openIndex === index

                return (
                  <div key={question} className={styles.item} data-open={isOpen} data-reveal>
                    <button
                      type="button"
                      className={styles.trigger}
                      aria-expanded={isOpen}
                      onClick={() => toggle(index)}
                    >
                      <span className={styles.question}>{question}</span>
                      <span className={styles.iconWrap}>
                        <PlusIcon />
                      </span>
                    </button>

                    <div className={styles.panel}>
                      <div className={styles.panelInner}>
                        {answer.map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex} className={styles.answer}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Faq
