import { useCallback, useState } from 'react'
import Loader from '../Loader/Loader.jsx'
import Navbar from '../Navbar/Navbar.jsx'
import Hero from '../Hero/Hero.jsx'
import EcosystemAlt from '../EcosystemAlt/EcosystemAlt.jsx'
import Geography from '../Geography/Geography.jsx'
import Product from '../Product/Product.jsx'
import Faq from '../Faq/Faq.jsx'
import Contact from '../Contact/Contact.jsx'
import styles from './App.module.scss'

function App() {
  // Hero's reveal is the only one above the fold, so it's the only one that
  // would otherwise fire while the page is still loading. Holding it until
  // the loader clears lets it play on a quiet main thread; every other
  // section reveals on scroll, long after this.
  const [loaded, setLoaded] = useState(false)
  const handleLoaded = useCallback(() => setLoaded(true), [])

  return (
    <div className={styles.app} aria-busy={!loaded}>
      <Loader onDone={handleLoaded} />
      <Navbar />
      <Hero revealArmed={loaded} />
      <EcosystemAlt />
      <Geography />
      <Product />
      <Faq />
      <Contact />
    </div>
  )
}

export default App
