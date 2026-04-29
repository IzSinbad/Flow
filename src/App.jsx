import { useState } from 'react'
import Landing from './components/Landing'
import ReadMode from './components/ReadMode'
import WriteMode from './components/WriteMode'
import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState('landing')

  const goTo = (screen) => {
    setCurrentScreen(screen)
  }

  return (
    <div>
      {currentScreen === 'landing' && <Landing goTo={goTo} />}
      {currentScreen === 'read' && <ReadMode goTo={goTo} />}
      {currentScreen === 'write' && <WriteMode goTo={goTo} />}
    </div>
  )
}

export default App
