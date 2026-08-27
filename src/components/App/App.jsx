import Navbar from '../Navbar/Navbar.jsx'
import Hero from '../Hero/Hero.jsx'
import styles from './App.module.scss'

function App() {
  return (
    <div className={styles.app}>
      <Navbar />
      <Hero />
    </div>
  )
}

export default App
