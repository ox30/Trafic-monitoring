import { DashboardPage } from './pages/DashboardPage'
import './App.css'

function App() {
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
          <div className="status-indicator status-online">
            <span className="status-dot"></span>
            <span>Système actif</span>
          </div>
          <div className="status-time">
            {new Date().toLocaleTimeString('fr-CH', { 
              hour: '2-digit', 
              minute: '2-digit' 
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

