/**
 * Panneau de contrôle des statuts système
 * Affiche l'état de tous les sous-systèmes de l'application
 */

import { useState, useEffect, useRef } from 'react'
import {
  SystemInfo,
  SystemState,
  getAllSystemStatuses,
  getOverallStatus,
  subscribeToStatusChanges,
  formatSystemState,
  getStateColor,
  getStateIcon,
} from '../services/systemStatus'
import './SystemStatusPanel.css'

export function SystemStatusPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [systems, setSystems] = useState<SystemInfo[]>(getAllSystemStatuses())
  const [overallStatus, setOverallStatus] = useState<SystemState>(getOverallStatus())
  const panelRef = useRef<HTMLDivElement>(null)

  // S'abonner aux changements de statut
  useEffect(() => {
    const unsubscribe = subscribeToStatusChanges(() => {
      setSystems(getAllSystemStatuses())
      setOverallStatus(getOverallStatus())
    })
    return unsubscribe
  }, [])

  // Fermer le panneau quand on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Compter les systèmes par état
  const onlineCount = systems.filter(s => s.state === 'online').length
  const totalCount = systems.length

  return (
    <div className="system-status" ref={panelRef}>
      {/* Bouton indicateur */}
      <button 
        className={`system-status-trigger status-${overallStatus}`}
        onClick={() => setIsOpen(!isOpen)}
        title="État des systèmes"
      >
        <span 
          className="status-dot"
          style={{ backgroundColor: getStateColor(overallStatus) }}
        />
        <span className="status-label">
          {overallStatus === 'online' ? 'Système actif' : formatSystemState(overallStatus)}
        </span>
        <svg 
          className={`status-chevron ${isOpen ? 'open' : ''}`}
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Panneau déroulant */}
      {isOpen && (
        <div className="system-status-panel">
          <div className="panel-header">
            <h3>État des systèmes</h3>
            <span className="panel-summary">
              {onlineCount}/{totalCount} actifs
            </span>
          </div>

          <div className="panel-systems">
            {systems.map(system => (
              <SystemStatusItem key={system.id} system={system} />
            ))}
          </div>

          <div className="panel-footer">
            <span className="panel-timestamp">
              Dernière vérification : {new Date().toLocaleTimeString('fr-CH')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

interface SystemStatusItemProps {
  system: SystemInfo
}

function SystemStatusItem({ system }: SystemStatusItemProps) {
  const stateColor = getStateColor(system.state)
  const stateIcon = getStateIcon(system.state)

  return (
    <div className={`system-item state-${system.state}`}>
      <div className="system-item-header">
        <span 
          className="system-state-icon"
          style={{ backgroundColor: `${stateColor}20`, color: stateColor }}
        >
          {stateIcon}
        </span>
        <div className="system-info">
          <span className="system-name">{system.name}</span>
          <span className="system-description">{system.description}</span>
        </div>
        <span 
          className="system-state-badge"
          style={{ backgroundColor: `${stateColor}20`, color: stateColor }}
        >
          {formatSystemState(system.state)}
        </span>
      </div>

      {/* Détails supplémentaires */}
      {system.details && Object.keys(system.details).length > 0 && (
        <div className="system-details">
          {Object.entries(system.details).map(([key, value]) => (
            <span key={key} className="system-detail">
              <span className="detail-key">{formatDetailKey(key)}:</span>
              <span className="detail-value">{formatDetailValue(value)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Message d'erreur */}
      {system.lastError && (
        <div className="system-error">
          <span className="error-icon">⚠</span>
          <span className="error-message">{system.lastError}</span>
        </div>
      )}

      {/* Horodatage */}
      {system.lastCheck && (
        <div className="system-timestamp">
          Vérifié à {system.lastCheck.toLocaleTimeString('fr-CH')}
        </div>
      )}
    </div>
  )
}

function formatDetailKey(key: string): string {
  const labels: Record<string, string> = {
    configured: 'Configuré',
    source: 'Source',
    featuresCount: 'Features',
    apiKey: 'Clé API',
    connected: 'Connecté',
    lastUpdate: 'Dernière MAJ',
  }
  return labels[key] || key
}

function formatDetailValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non'
  }
  return String(value)
}

