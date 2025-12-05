import { useState, useEffect } from 'react'
import { DashboardPage } from './pages/DashboardPage'
import { SystemStatusPanel } from './components/SystemStatusPanel'
import './App.css'

function App() {
  // Horloge temps réel
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="app-title">
            <h1>Monitoring Trafic Suisse</h1>
            <span className="app-subtitle">Réseau des routes nationales</span>
          </div>
        </div>
        <div className="app-header-status">
          <SystemStatusPanel />
          <div className="status-time">
            {currentTime.toLocaleTimeString('fr-CH', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
      </header>
      <main className="app-main">
        <DashboardPage />
      </main>
    </div>
  )
}

export default App
