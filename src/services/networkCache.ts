/**
 * Service de cache pour les données du réseau national
 * 
 * Utilise IndexedDB pour stocker les données localement.
 * Les données sont téléchargées une fois puis rechargées depuis le cache.
 * 
 * Stratégie :
 * 1. Au démarrage, vérifier si les données sont en cache
 * 2. Si oui et < 24h, utiliser le cache
 * 3. Sinon, télécharger depuis l'API et mettre en cache
 */

const DB_NAME = 'traffic-monitoring-db'
const DB_VERSION = 1
const STORE_NAME = 'network-data'
const CACHE_KEY = 'national-roads'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 heures

interface CachedData {
  key: string
  data: GeoJSON.FeatureCollection
  timestamp: number
  featureCount: number
}

/**
 * Ouvre la base de données IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => {
      reject(new Error('Erreur ouverture IndexedDB'))
    }
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Créer le store si nécessaire
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Récupère les données depuis le cache
 */
export async function getFromCache(): Promise<CachedData | null> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(CACHE_KEY)
      
      request.onerror = () => {
        reject(new Error('Erreur lecture cache'))
      }
      
      request.onsuccess = () => {
        resolve(request.result || null)
      }
    })
  } catch (error) {
    console.warn('IndexedDB non disponible:', error)
    return null
  }
}

/**
 * Sauvegarde les données dans le cache
 */
export async function saveToCache(data: GeoJSON.FeatureCollection): Promise<void> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      const cacheEntry: CachedData = {
        key: CACHE_KEY,
        data,
        timestamp: Date.now(),
        featureCount: data.features.length,
      }
      
      const request = store.put(cacheEntry)
      
      request.onerror = () => {
        reject(new Error('Erreur écriture cache'))
      }
      
      request.onsuccess = () => {
        resolve()
      }
    })
  } catch (error) {
    console.warn('Erreur sauvegarde cache:', error)
  }
}

/**
 * Vérifie si le cache est valide (existe et < 24h)
 */
export async function isCacheValid(): Promise<boolean> {
  const cached = await getFromCache()
  
  if (!cached) return false
  
  const age = Date.now() - cached.timestamp
  return age < CACHE_DURATION_MS
}

/**
 * Retourne l'âge du cache en heures
 */
export async function getCacheAge(): Promise<number | null> {
  const cached = await getFromCache()
  
  if (!cached) return null
  
  return (Date.now() - cached.timestamp) / (60 * 60 * 1000)
}

/**
 * Retourne les infos du cache
 */
export async function getCacheInfo(): Promise<{
  exists: boolean
  featureCount: number
  ageHours: number | null
  timestamp: Date | null
} | null> {
  const cached = await getFromCache()
  
  if (!cached) {
    return {
      exists: false,
      featureCount: 0,
      ageHours: null,
      timestamp: null,
    }
  }
  
  return {
    exists: true,
    featureCount: cached.featureCount,
    ageHours: (Date.now() - cached.timestamp) / (60 * 60 * 1000),
    timestamp: new Date(cached.timestamp),
  }
}

/**
 * Vide le cache
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(CACHE_KEY)
      
      request.onerror = () => {
        reject(new Error('Erreur suppression cache'))
      }
      
      request.onsuccess = () => {
        resolve()
      }
    })
  } catch (error) {
    console.warn('Erreur vidage cache:', error)
  }
}

/**
 * Force le rafraîchissement du cache
 */
export async function forceRefresh(): Promise<void> {
  await clearCache()
}

