/**
 * Service pour l'API geo.admin.ch (swisstopo/ASTRA)
 * 
 * Documentation : https://api3.geo.admin.ch/
 * Métadonnées : https://www.geocat.ch/geonetwork/srv/ger/catalog.search#/metadata/cc9bb928-851d-4ecd-8dd8-ba6abcad19a4
 * Couche : ch.astra.nationalstrassenachsen (Axes des routes nationales)
 * 
 * Structure des données :
 * - Axes principaux : strassennummer = "N1", "N2", "N20" (sans underscore)
 *   - segmentname = "ECUBLENS - WANKDORF", "Thielle - Murten"
 *   - bezeichnung = "Genève - St. Margrethen" (description de l'axe complet)
 *   - positionscode = "+" ou "-" (sens de circulation, chaussée)
 * 
 * - Rampes/Sorties/Entrées : strassennummer = "N1_YVER", "N1_MURT" (avec underscore)
 *   - segmentname = "S4", "10AUSTW" (code court)
 *   - bezeichnung = "29 Murten", "24 ECH YVERDON" (numéro et nom de jonction)
 * 
 * - Points kilométriques : type_geom = "point"
 *   - name = "1410" (nom du point de repère)
 *   - kilometerwert = "141" (valeur en km)
 * 
 * STRATÉGIE DE CHARGEMENT :
 * L'API identify a une limite de ~500-1000 features par requête.
 * On charge donc route par route (N1, N2, etc.) pour tout récupérer.
 */

const GEO_ADMIN_API_BASE = 'https://api3.geo.admin.ch/rest/services/api/MapServer'
const LAYER_ID = 'ch.astra.nationalstrassenachsen'

// Liste des routes nationales suisses
const ROUTE_NUMBERS = [
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9',
  'N10', 'N11', 'N12', 'N13', 'N14', 'N15', 'N16', 'N17', 'N18',
  'N20', 'N21', 'N22', 'N23', 'N24', 'N25', 'N28',
]

// Bounding box de la Suisse en WGS84
const SWITZERLAND_BOUNDS = {
  minLon: 5.9,
  minLat: 45.8,
  maxLon: 10.5,
  maxLat: 47.9,
}

export interface NationalRoadFeature {
  id: number
  strassennummer: string | null
  segmentname: string | null
  bezeichnung: string | null
  name: string | null
  kilometerwert: string | null
  sektorlaenge: string | null
  positionscode: string | null
  eigentuemer: string | null
  type_geom: 'line' | 'point'
}

/**
 * Charge les axes des routes nationales depuis l'API geo.admin.ch
 * Stratégie : charger route par route pour contourner la limite de l'API
 */
export async function loadNationalRoads(): Promise<GeoJSON.FeatureCollection> {
  const allFeatures: GeoJSON.Feature[] = []
  const seenIds = new Set<number>()
  
  console.log('🔄 Chargement des routes nationales depuis geo.admin.ch...')
  console.log(`   ${ROUTE_NUMBERS.length} routes à charger`)
  
  // Charger chaque route en parallèle (par groupes de 5)
  const chunkSize = 5
  for (let i = 0; i < ROUTE_NUMBERS.length; i += chunkSize) {
    const chunk = ROUTE_NUMBERS.slice(i, i + chunkSize)
    
    const chunkPromises = chunk.map(async (routeNum) => {
      try {
        const features = await loadRouteData(routeNum)
        console.log(`   ${routeNum}: ${features.length} features`)
        return { routeNum, features }
      } catch (error) {
        console.warn(`   ${routeNum}: Erreur`, error)
        return { routeNum, features: [] }
      }
    })
    
    const results = await Promise.all(chunkPromises)
    
    // Fusionner les résultats
    for (const { features } of results) {
      for (const feature of features) {
        const featureId = feature.properties?.id || feature.id
        if (featureId && !seenIds.has(featureId as number)) {
          seenIds.add(featureId as number)
          allFeatures.push(feature)
        }
      }
    }
  }
  
  // Compter les types
  const lines = allFeatures.filter(f => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
  const points = allFeatures.filter(f => f.geometry.type === 'Point')
  const mainAxes = lines.filter(f => !isRampSegment(f.properties as Record<string, unknown>))
  const ramps = lines.filter(f => isRampSegment(f.properties as Record<string, unknown>))
  
  console.log(`✅ Total: ${allFeatures.length} features uniques`)
  console.log(`   - ${mainAxes.length} axes principaux`)
  console.log(`   - ${ramps.length} rampes/sorties/entrées`)
  console.log(`   - ${points.length} points kilométriques`)
  
  return {
    type: 'FeatureCollection',
    features: allFeatures,
  }
}

/**
 * Charge les données d'une route spécifique via l'API find
 * Utilise une recherche par le champ strassennummer
 */
async function loadRouteData(routeNumber: string): Promise<GeoJSON.Feature[]> {
  // Utiliser l'endpoint find pour rechercher par attribut
  // searchText avec le préfixe de la route (ex: "N1" match "N1", "N1_BERN", etc.)
  const url = new URL(`${GEO_ADMIN_API_BASE}/find`)
  url.searchParams.set('layer', LAYER_ID)
  url.searchParams.set('searchField', 'strassennummer')
  url.searchParams.set('searchText', routeNumber)
  url.searchParams.set('geometryFormat', 'geojson')
  url.searchParams.set('sr', '4326')
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('contains', 'true')  // Recherche "contient" pour matcher N1, N1_BERN, etc.

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.results && Array.isArray(data.results)) {
    return data.results.map((result: {
      id: number
      featureId: number
      geometry: GeoJSON.Geometry
      properties: Record<string, unknown>
      attrs: Record<string, unknown>
    }) => {
      // L'API find retourne les attributs dans "attrs" ou "properties"
      const props = result.attrs || result.properties || {}
      
      return {
        type: 'Feature' as const,
        id: result.featureId || result.id,
        geometry: result.geometry,
        properties: {
          id: result.featureId || result.id,
          ...props,
          isRamp: isRampSegment(props),
        },
      }
    })
  }
  
  return []
}

/**
 * Méthode alternative : charger par zone géographique
 * Utilisée en fallback si find ne fonctionne pas
 */
async function loadByZone(bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number }): Promise<GeoJSON.Feature[]> {
  const { minLon, minLat, maxLon, maxLat } = bbox
  
  const url = new URL(`${GEO_ADMIN_API_BASE}/identify`)
  url.searchParams.set('layers', `all:${LAYER_ID}`)
  url.searchParams.set('geometryType', 'esriGeometryEnvelope')
  url.searchParams.set('geometry', `${minLon},${minLat},${maxLon},${maxLat}`)
  url.searchParams.set('geometryFormat', 'geojson')
  url.searchParams.set('sr', '4326')
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('tolerance', '0')
  url.searchParams.set('limit', '100000')

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.results && Array.isArray(data.results)) {
    return data.results.map((result: {
      id: number
      featureId: number
      geometry: GeoJSON.Geometry
      properties: Record<string, unknown>
    }) => ({
      type: 'Feature' as const,
      id: result.featureId || result.id,
      geometry: result.geometry,
      properties: {
        id: result.featureId || result.id,
        ...result.properties,
        isRamp: isRampSegment(result.properties),
      },
    }))
  }
  
  return []
}

/**
 * Charge toutes les routes avec fallback sur la méthode par zone
 */
export async function loadNationalRoadsWithFallback(): Promise<GeoJSON.FeatureCollection> {
  try {
    // Essayer d'abord la méthode route par route
    const result = await loadNationalRoads()
    
    // Si on a assez de données, retourner
    if (result.features.length > 1000) {
      return result
    }
    
    console.log('⚠️ Peu de données avec find, essai avec identify par zones...')
    
    // Fallback : charger par petites zones
    return await loadByMultipleZones()
  } catch (error) {
    console.error('Erreur chargement routes:', error)
    throw error
  }
}

/**
 * Charge par multiples petites zones (fallback)
 */
async function loadByMultipleZones(): Promise<GeoJSON.FeatureCollection> {
  const allFeatures: GeoJSON.Feature[] = []
  const seenIds = new Set<number>()
  
  // Créer une grille de petites zones
  const { minLon, minLat, maxLon, maxLat } = SWITZERLAND_BOUNDS
  const zones: { minLon: number; minLat: number; maxLon: number; maxLat: number }[] = []
  const step = 0.5 // Degré
  
  for (let lon = minLon; lon < maxLon; lon += step) {
    for (let lat = minLat; lat < maxLat; lat += step) {
      zones.push({
        minLon: lon,
        minLat: lat,
        maxLon: Math.min(lon + step, maxLon),
        maxLat: Math.min(lat + step, maxLat),
      })
    }
  }
  
  console.log(`   Chargement par ${zones.length} zones...`)
  
  // Charger par groupes
  const chunkSize = 10
  for (let i = 0; i < zones.length; i += chunkSize) {
    const chunk = zones.slice(i, i + chunkSize)
    const promises = chunk.map(zone => loadByZone(zone).catch(() => []))
    const results = await Promise.all(promises)
    
    for (const features of results) {
      for (const feature of features) {
        const id = feature.properties?.id || feature.id
        if (id && !seenIds.has(id as number)) {
          seenIds.add(id as number)
          allFeatures.push(feature)
        }
      }
    }
    
    console.log(`   ${Math.min(i + chunkSize, zones.length)}/${zones.length} zones...`)
  }
  
  return {
    type: 'FeatureCollection',
    features: allFeatures,
  }
}

/**
 * Détermine si un segment est une rampe
 * Axe principal : strassennummer = "N1", "N2", "N20" (juste le numéro)
 * Rampe : strassennummer = "N1_YVER", "N1_MURT" (contient un underscore)
 */
export function isRampSegment(properties: Record<string, unknown>): boolean {
  const strassennummer = (properties.strassennummer as string) || ''
  return strassennummer.includes('_')
}

/**
 * Extrait le numéro de route principal
 */
export function extractRouteNumber(strassennummer: string | null): string | null {
  if (!strassennummer) return null
  const match = strassennummer.match(/^(N\d+)/)
  return match ? match[1] : null
}

/**
 * Convertit N vers A
 */
export function convertToAxisCode(routeNumber: string | null): string | null {
  if (!routeNumber) return null
  return routeNumber.replace('N', 'A')
}

/**
 * Formate le code de position
 */
export function formatPositionCode(code: string | null): string {
  if (!code) return ''
  switch (code) {
    case '+': return 'Sens +'
    case '-': return 'Sens −'
    case '=': return 'Point de repère'
    default: return code
  }
}

/**
 * Couleurs pour l'affichage
 */
export const ROAD_COLORS = {
  mainAxis: '#dc2626',
  ramp: '#a855f7',
  selected: '#4ade80',
  kmPoint: '#f59e0b',
  kmPointStroke: '#ffffff',
}
