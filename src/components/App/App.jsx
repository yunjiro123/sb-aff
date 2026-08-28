import Navbar from '../Navbar/Navbar.jsx'
import Hero from '../Hero/Hero.jsx'
import Ecosystem from '../Ecosystem/Ecosystem.jsx'
import EcosystemAlt from '../EcosystemAlt/EcosystemAlt.jsx'
import styles from './App.module.scss'

function App() {
  return (
    <div className={styles.app}>
      <Navbar />
      <Hero />
      <EcosystemAlt />
    </div>
  )
}

export default App
