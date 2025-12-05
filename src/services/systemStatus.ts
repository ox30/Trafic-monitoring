/**
 * Service de gestion des statuts des systèmes
 * Centralise l'état de tous les sous-systèmes de l'application
 */

export type SystemState = 'online' | 'offline' | 'degraded' | 'loading' | 'unknown'

export interface SystemInfo {
  id: string
  name: string
  description: string
  state: SystemState
  lastCheck?: Date
  lastError?: string
  details?: Record<string, string | number | boolean>
}

export interface SystemStatusStore {
  systems: Map<string, SystemInfo>
  listeners: Set<() => void>
}

// Store global des statuts
const store: SystemStatusStore = {
  systems: new Map(),
  listeners: new Set(),
}

// Initialiser les systèmes par défaut
const defaultSystems: SystemInfo[] = [
  {
    id: 'app',
    name: 'Application',
    description: 'État général de l\'application',
    state: 'online',
  },
  {
    id: 'network-layer',
    name: 'Couche Réseau',
    description: 'Données des routes nationales (geo.admin.ch)',
    state: 'unknown',
  },
  {
    id: 'tomtom-api',
    name: 'API TomTom',
    description: 'Données de trafic temps réel',
    state: 'offline',
    details: { configured: false },
  },
  {
    id: 'monitoring-engine',
    name: 'Moteur de surveillance',
    description: 'Analyse des conditions de trafic',
    state: 'offline',
    details: { configured: false },
  },
  {
    id: 'deviation-system',
    name: 'Système de déviation',
    description: 'Gestion des plans de déviation',
    state: 'offline',
    details: { configured: false },
  },
]

// Initialisation
defaultSystems.forEach(sys => store.systems.set(sys.id, sys))

/**
 * Met à jour le statut d'un système
 */
export function updateSystemStatus(
  systemId: string,
  update: Partial<Omit<SystemInfo, 'id'>>
): void {
  const current = store.systems.get(systemId)
  if (current) {
    store.systems.set(systemId, {
      ...current,
      ...update,
      lastCheck: new Date(),
    })
    notifyListeners()
  }
}

/**
 * Récupère le statut d'un système
 */
export function getSystemStatus(systemId: string): SystemInfo | undefined {
  return store.systems.get(systemId)
}

/**
 * Récupère tous les statuts
 */
export function getAllSystemStatuses(): SystemInfo[] {
  return Array.from(store.systems.values())
}

/**
 * Calcule l'état global du système
 */
export function getOverallStatus(): SystemState {
  const statuses = getAllSystemStatuses()
  
  // Si un système critique est offline, état dégradé
  const criticalSystems = ['app', 'network-layer']
  const criticalOffline = statuses.some(
    s => criticalSystems.includes(s.id) && s.state === 'offline'
  )
  if (criticalOffline) return 'offline'
  
  // Si un système est en chargement
  const anyLoading = statuses.some(s => s.state === 'loading')
  if (anyLoading) return 'loading'
  
  // Si un système est dégradé
  const anyDegraded = statuses.some(
    s => s.state === 'degraded' && criticalSystems.includes(s.id)
  )
  if (anyDegraded) return 'degraded'
  
  // Si tous les systèmes critiques sont online
  const allCriticalOnline = criticalSystems.every(id => {
    const sys = store.systems.get(id)
    return sys && sys.state === 'online'
  })
  
  return allCriticalOnline ? 'online' : 'degraded'
}

/**
 * S'abonner aux changements de statut
 */
export function subscribeToStatusChanges(callback: () => void): () => void {
  store.listeners.add(callback)
  return () => store.listeners.delete(callback)
}

/**
 * Notifier tous les listeners
 */
function notifyListeners(): void {
  store.listeners.forEach(callback => callback())
}

/**
 * Formate l'état pour l'affichage
 */
export function formatSystemState(state: SystemState): string {
  const labels: Record<SystemState, string> = {
    online: 'En ligne',
    offline: 'Hors ligne',
    degraded: 'Dégradé',
    loading: 'Chargement...',
    unknown: 'Inconnu',
  }
  return labels[state]
}

/**
 * Retourne la couleur associée à un état
 */
export function getStateColor(state: SystemState): string {
  const colors: Record<SystemState, string> = {
    online: '#22c55e',
    offline: '#ef4444',
    degraded: '#f59e0b',
    loading: '#3b82f6',
    unknown: '#6b7280',
  }
  return colors[state]
}

/**
 * Retourne l'icône associée à un état
 */
export function getStateIcon(state: SystemState): string {
  const icons: Record<SystemState, string> = {
    online: '✓',
    offline: '✕',
    degraded: '⚠',
    loading: '↻',
    unknown: '?',
  }
  return icons[state]
}

