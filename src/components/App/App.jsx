import Navbar from '../Navbar/Navbar.jsx'
import Hero from '../Hero/Hero.jsx'
import Ecosystem from '../Ecosystem/Ecosystem.jsx'
import EcosystemAlt from '../EcosystemAlt/EcosystemAlt.jsx'
import Geography from '../Geography/Geography.jsx'
import styles from './App.module.scss'

function App() {
  return (
    <div className={styles.app}>
      <Navbar />
      <Hero />
      <EcosystemAlt />
      <Geography />
    </div>
  )
}

export default App
