/**
 * Service de chargement du réseau national
 * 
 * Combine le cache IndexedDB et l'API geo.admin.ch
 * 
 * Stratégie :
 * 1. Vérifier le cache IndexedDB
 * 2. Si cache valide (< 24h), l'utiliser
 * 3. Sinon, télécharger depuis l'API
 * 4. Sauvegarder en cache pour la prochaine fois
 */

import { 
  getFromCache, 
  saveToCache, 
  isCacheValid, 
  getCacheInfo,
  clearCache 
} from './networkCache'
import { loadNationalRoadsWithFallback, isRampSegment } from './geoAdminApi'
import { updateSystemStatus } from './systemStatus'

export interface LoadResult {
  data: GeoJSON.FeatureCollection
  source: 'cache' | 'api'
  stats: {
    totalFeatures: number
    mainAxes: number
    ramps: number
    points: number
  }
  cacheInfo?: {
    ageHours: number
    timestamp: Date
  }
}

/**
 * Charge les données du réseau national
 * Utilise le cache si disponible et valide, sinon l'API
 */
export async function loadNetworkData(forceRefresh = false): Promise<LoadResult> {
  console.log('🔄 Chargement du réseau national...')
  
  // Forcer le rafraîchissement si demandé
  if (forceRefresh) {
    console.log('   Force refresh demandé, vidage du cache...')
    await clearCache()
  }
  
  // Vérifier le cache
  const cacheValid = await isCacheValid()
  
  if (cacheValid && !forceRefresh) {
    console.log('📦 Cache valide trouvé, chargement depuis IndexedDB...')
    const cached = await getFromCache()
    
    if (cached) {
      const stats = computeStats(cached.data)
      const ageHours = (Date.now() - cached.timestamp) / (60 * 60 * 1000)
      
      console.log(`✅ Données chargées depuis le cache (${ageHours.toFixed(1)}h)`)
      console.log(`   ${stats.totalFeatures} features`)
      
      updateSystemStatus('network-layer', {
        state: 'online',
        details: {
          source: `Cache local (${ageHours.toFixed(1)}h)`,
          features: stats.totalFeatures,
        }
      })
      
      return {
        data: cached.data,
        source: 'cache',
        stats,
        cacheInfo: {
          ageHours,
          timestamp: new Date(cached.timestamp),
        }
      }
    }
  }
  
  // Pas de cache valide, charger depuis l'API
  console.log('🌐 Téléchargement depuis geo.admin.ch...')
  updateSystemStatus('network-layer', {
    state: 'loading',
    details: {
      source: 'Téléchargement en cours...',
    }
  })
  
  try {
    const data = await loadNationalRoadsWithFallback()
    const stats = computeStats(data)
    
    console.log(`✅ Données téléchargées: ${stats.totalFeatures} features`)
    
    // Sauvegarder en cache
    console.log('💾 Sauvegarde en cache...')
    await saveToCache(data)
    console.log('✅ Cache mis à jour')
    
    updateSystemStatus('network-layer', {
      state: 'online',
      details: {
        source: 'geo.admin.ch',
        features: stats.totalFeatures,
      }
    })
    
    return {
      data,
      source: 'api',
      stats,
    }
  } catch (error) {
    console.error('❌ Erreur chargement API:', error)
    
    // Essayer le cache même s'il est périmé
    const cached = await getFromCache()
    if (cached) {
      console.log('⚠️ Utilisation du cache périmé en fallback')
      const stats = computeStats(cached.data)
      
      updateSystemStatus('network-layer', {
        state: 'degraded',
        lastError: 'API indisponible, utilisation du cache périmé',
        details: {
          source: 'Cache périmé',
          features: stats.totalFeatures,
        }
      })
      
      return {
        data: cached.data,
        source: 'cache',
        stats,
        cacheInfo: {
          ageHours: (Date.now() - cached.timestamp) / (60 * 60 * 1000),
          timestamp: new Date(cached.timestamp),
        }
      }
    }
    
    // Pas de cache, erreur
    updateSystemStatus('network-layer', {
      state: 'offline',
      lastError: 'Erreur de chargement, aucune donnée disponible',
    })
    
    throw error
  }
}

/**
 * Calcule les statistiques des données
 */
function computeStats(data: GeoJSON.FeatureCollection): LoadResult['stats'] {
  const lines = data.features.filter(
    f => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
  )
  const points = data.features.filter(f => f.geometry.type === 'Point')
  const mainAxes = lines.filter(f => !isRampSegment(f.properties as Record<string, unknown>))
  const ramps = lines.filter(f => isRampSegment(f.properties as Record<string, unknown>))
  
  return {
    totalFeatures: data.features.length,
    mainAxes: mainAxes.length,
    ramps: ramps.length,
    points: points.length,
  }
}

/**
 * Retourne les informations sur le cache
 */
export async function getNetworkCacheInfo() {
  return getCacheInfo()
}

/**
 * Force le rafraîchissement des données
 */
export async function refreshNetworkData(): Promise<LoadResult> {
  return loadNetworkData(true)
}

