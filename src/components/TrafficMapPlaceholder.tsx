/**
 * Placeholder pour la carte de trafic
 * À remplacer par une vraie carte (MapLibre) dans un sprint futur
 */

import './TrafficMapPlaceholder.css'

export function TrafficMapPlaceholder() {
  return (
    <div className="map-placeholder">
      <div className="map-placeholder-content">
        <div className="map-placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="map-placeholder-title">Carte Trafic Suisse</h3>
        <p className="map-placeholder-subtitle">
          Visualisation du réseau des routes nationales
        </p>
        <div className="map-placeholder-badge">
          À implémenter – Sprint 2
        </div>
        <div className="map-placeholder-features">
          <div className="map-feature">
            <span className="map-feature-icon">🛣️</span>
            <span>Réseau autoroutier</span>
          </div>
          <div className="map-feature">
            <span className="map-feature-icon">📍</span>
            <span>Événements en temps réel</span>
          </div>
          <div className="map-feature">
            <span className="map-feature-icon">↪️</span>
            <span>Plans de déviation</span>
          </div>
        </div>
      </div>
      
      {/* Décoration de fond stylisée comme une carte */}
      <div className="map-placeholder-bg">
        <svg viewBox="0 0 400 300" className="map-bg-svg">
          {/* Grille de fond */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          
          {/* Routes stylisées */}
          <path 
            d="M 50 200 Q 100 150 150 180 T 250 120 T 350 100" 
            fill="none" 
            stroke="var(--color-primary-light)" 
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path 
            d="M 80 250 Q 150 200 200 220 T 300 180" 
            fill="none" 
            stroke="var(--color-primary)" 
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.25"
          />
          <path 
            d="M 120 50 Q 180 100 220 80 T 320 120" 
            fill="none" 
            stroke="var(--color-primary-light)" 
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.2"
          />
          
          {/* Points d'intérêt */}
          <circle cx="150" cy="180" r="6" fill="var(--color-accent)" opacity="0.4"/>
          <circle cx="250" cy="120" r="6" fill="var(--color-warning)" opacity="0.4"/>
          <circle cx="200" cy="220" r="4" fill="var(--color-success)" opacity="0.4"/>
        </svg>
      </div>
    </div>
  )
}

