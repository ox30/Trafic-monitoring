/**
 * Service pour l'API geo.admin.ch (swisstopo/ASTRA)
 * 
 * Documentation : https://api3.geo.admin.ch/
 * Métadonnées : https://www.geocat.ch/geonetwork/srv/ger/catalog.search#/metadata/cc9bb928-851d-4ecd-8dd8-ba6abcad19a4
 * Couche : ch.astra.nationalstrassenachsen (Axes des routes nationales)
 */

const GEO_ADMIN_API_BASE = 'https://api3.geo.admin.ch/rest/services/api/MapServer'
const LAYER_ID = 'ch.astra.nationalstrassenachsen'

// Subdiviser la Suisse en zones pour contourner la limite de l'API
// L'API a une limite de résultats, donc on fait plusieurs requêtes
const SWITZERLAND_ZONES = [
  // Suisse romande (Ouest)
  { minLon: 5.9, minLat: 45.8, maxLon: 7.2, maxLat: 47.0 },
  // Suisse centrale (Berne, Lucerne)
  { minLon: 7.0, minLat: 46.0, maxLon: 8.3, maxLat: 47.5 },
  // Suisse orientale (Zurich, St-Gall)
  { minLon: 8.1, minLat: 46.8, maxLon: 9.7, maxLat: 47.9 },
  // Grisons, Tessin (Sud-Est)
  { minLon: 8.5, minLat: 45.8, maxLon: 10.5, maxLat: 47.2 },
]

export interface NationalRoadFeature {
  id: number
  strassennummer: string | null  // Ex: "N1_BERN", "N2_BASEL"
  segmentname: string | null     // Ex: "S2", "10AUSTW", "EINSTW"
  bezeichnung: string | null     // Ex: "2 Bern", "33 Cham"
  name: string | null            // Nom du point de référence
  kilometerwert: string | null   // Valeur kilométrique
  sektorlaenge: string | null    // Longueur du secteur en mètres
  positionscode: string | null   // "+", "-", "=", null
  eigentuemer: string | null     // Propriétaire (CH)
  type_geom: 'line' | 'point'
}

/**
 * Charge les axes des routes nationales depuis l'API geo.admin.ch
 * Fait plusieurs requêtes par zone pour contourner la limite de l'API
 * Retourne un GeoJSON FeatureCollection
 */
export async function loadNationalRoads(): Promise<GeoJSON.FeatureCollection> {
  const allFeatures: GeoJSON.Feature[] = []
  const seenIds = new Set<number>()
  
  console.log('🔄 Chargement des routes nationales depuis geo.admin.ch...')
  
  // Charger chaque zone en parallèle
  const zonePromises = SWITZERLAND_ZONES.map(async (zone, index) => {
    try {
      const features = await loadZone(zone)
      console.log(`  Zone ${index + 1}/${SWITZERLAND_ZONES.length}: ${features.length} features`)
      return features
    } catch (error) {
      console.warn(`  Zone ${index + 1}: Erreur`, error)
      return []
    }
  })
  
  const zoneResults = await Promise.all(zonePromises)
  
  // Fusionner les résultats en évitant les doublons
  for (const features of zoneResults) {
    for (const feature of features) {
      const featureId = feature.properties?.id || feature.id
      if (featureId && !seenIds.has(featureId as number)) {
        seenIds.add(featureId as number)
        allFeatures.push(feature)
      }
    }
  }
  
  console.log(`✅ Total: ${allFeatures.length} features uniques chargées`)
  
  return {
    type: 'FeatureCollection',
    features: allFeatures,
  }
}

/**
 * Charge les features d'une zone spécifique
 */
async function loadZone(bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number }): Promise<GeoJSON.Feature[]> {
  const { minLon, minLat, maxLon, maxLat } = bbox
  
  const url = new URL(`${GEO_ADMIN_API_BASE}/identify`)
  url.searchParams.set('layers', `all:${LAYER_ID}`)
  url.searchParams.set('geometryType', 'esriGeometryEnvelope')
  url.searchParams.set('geometry', `${minLon},${minLat},${maxLon},${maxLat}`)
  url.searchParams.set('geometryFormat', 'geojson')
  url.searchParams.set('sr', '4326')
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('tolerance', '0')
  url.searchParams.set('limit', '50000')  // Limite maximale par requête

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
      geometryType: string
      properties: Record<string, unknown>
    }) => ({
      type: 'Feature' as const,
      id: result.featureId || result.id,
      geometry: result.geometry,
      properties: {
        id: result.featureId || result.id,
        ...result.properties,
        // Ajouter un flag pour identifier les rampes
        isRamp: isRampSegment(result.properties),
      },
    }))
  }
  
  return []
}

/**
 * Détermine si un segment est une rampe (sortie, entrée, échangeur)
 * Basé sur le segmentname et d'autres propriétés
 */
export function isRampSegment(properties: Record<string, unknown>): boolean {
  const segmentname = (properties.segmentname as string || '').toUpperCase()
  const strassennummer = (properties.strassennummer as string || '').toUpperCase()
  
  // Patterns indiquant une rampe/sortie/entrée
  const rampPatterns = [
    'AUSTW',   // Ausfahrt West (sortie ouest)
    'AUSTO',   // Ausfahrt Ost (sortie est)
    'AUSTN',   // Ausfahrt Nord
    'AUSTS',   // Ausfahrt Sud
    'AUSF',    // Ausfahrt (sortie)
    'EINST',   // Einfahrt (entrée)
    'EINF',    // Einfahrt
    'RAMP',    // Rampe
    'VERZ',    // Verzweigung (embranchement)
    'ZUBR',    // Zubringer (bretelle)
    'AST',     // Ast (branche)
    '_A',      // Suffixe rampe
    '_B',      // Suffixe rampe
    '_R',      // Suffixe rampe
  ]
  
  // Vérifier si le segmentname contient un pattern de rampe
  for (const pattern of rampPatterns) {
    if (segmentname.includes(pattern)) {
      return true
    }
  }
  
  // Vérifier si strassennummer indique une rampe (ex: N1_AUST, N2_VERZ)
  for (const pattern of rampPatterns) {
    if (strassennummer.includes(pattern)) {
      return true
    }
  }
  
  return false
}

/**
 * Extrait le numéro de route (N1, N2, etc.) depuis strassennummer
 * Ex: "N1_BERN" -> "N1", "N16_BURE" -> "N16"
 */
export function extractRouteNumber(strassennummer: string | null): string | null {
  if (!strassennummer) return null
  const match = strassennummer.match(/^(N\d+)/)
  return match ? match[1] : null
}

/**
 * Convertit le numéro de route N vers A (N1 -> A1)
 */
export function convertToAxisCode(routeNumber: string | null): string | null {
  if (!routeNumber) return null
  return routeNumber.replace('N', 'A')
}

/**
 * Couleurs pour l'affichage
 */
export const ROAD_COLORS = {
  // Axes principaux - ROUGE
  mainAxis: '#dc2626',
  
  // Rampes, sorties, entrées - VIOLET
  ramp: '#8b5cf6',
  
  // Sélection - VERT
  selected: '#22c55e',
  
  // Points/jonctions
  junction: '#ffffff',
  interchange: '#f59e0b',
}

/**
 * Retourne la couleur pour un segment selon son type
 */
export function getSegmentColor(isRamp: boolean): string {
  return isRamp ? ROAD_COLORS.ramp : ROAD_COLORS.mainAxis
}
