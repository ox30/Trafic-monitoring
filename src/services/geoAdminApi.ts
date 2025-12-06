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
 */

const GEO_ADMIN_API_BASE = 'https://api3.geo.admin.ch/rest/services/api/MapServer'
const LAYER_ID = 'ch.astra.nationalstrassenachsen'

// Subdiviser la Suisse en zones plus petites pour récupérer toutes les données
// L'API a une limite de résultats par requête
const SWITZERLAND_ZONES = [
  // Suisse romande - Ouest
  { minLon: 5.9, minLat: 45.8, maxLon: 6.8, maxLat: 46.6 },
  { minLon: 5.9, minLat: 46.5, maxLon: 6.8, maxLat: 47.2 },
  // Suisse romande - Centre
  { minLon: 6.7, minLat: 45.8, maxLon: 7.5, maxLat: 46.6 },
  { minLon: 6.7, minLat: 46.5, maxLon: 7.5, maxLat: 47.2 },
  // Suisse centrale - Berne
  { minLon: 7.4, minLat: 46.0, maxLon: 8.0, maxLat: 46.7 },
  { minLon: 7.4, minLat: 46.6, maxLon: 8.0, maxLat: 47.3 },
  // Suisse centrale - Lucerne
  { minLon: 7.9, minLat: 46.5, maxLon: 8.5, maxLat: 47.2 },
  { minLon: 7.9, minLat: 47.1, maxLon: 8.5, maxLat: 47.6 },
  // Zurich et environs
  { minLon: 8.4, minLat: 47.0, maxLon: 9.0, maxLat: 47.6 },
  // Suisse orientale - St-Gall
  { minLon: 8.9, minLat: 47.0, maxLon: 9.7, maxLat: 47.7 },
  // Grisons Nord
  { minLon: 9.0, minLat: 46.5, maxLon: 10.0, maxLat: 47.1 },
  // Grisons Sud / Tessin Nord
  { minLon: 8.5, minLat: 46.0, maxLon: 9.5, maxLat: 46.6 },
  // Tessin Sud
  { minLon: 8.5, minLat: 45.8, maxLon: 9.5, maxLat: 46.1 },
  // Valais
  { minLon: 6.8, minLat: 45.9, maxLon: 8.0, maxLat: 46.4 },
  // Grisons Est
  { minLon: 9.5, minLat: 46.3, maxLon: 10.5, maxLat: 47.0 },
]

export interface NationalRoadFeature {
  id: number
  strassennummer: string | null  // N1, N1_YVER, N20, etc.
  segmentname: string | null     // ECUBLENS - WANKDORF, S4, etc.
  bezeichnung: string | null     // Genève - St. Margrethen, 29 Murten, etc.
  name: string | null            // Nom du point de repère (pour les points km)
  kilometerwert: string | null   // Valeur kilométrique
  sektorlaenge: string | null    // Longueur du secteur en mètres
  positionscode: string | null   // "+", "-", "=" (sens de circulation)
  eigentuemer: string | null     // Propriétaire (CH)
  type_geom: 'line' | 'point'
}

/**
 * Charge les axes des routes nationales depuis l'API geo.admin.ch
 * Fait plusieurs requêtes par zone pour contourner la limite de l'API
 */
export async function loadNationalRoads(): Promise<GeoJSON.FeatureCollection> {
  const allFeatures: GeoJSON.Feature[] = []
  const seenIds = new Set<number>()
  
  console.log('🔄 Chargement des routes nationales depuis geo.admin.ch...')
  console.log(`   ${SWITZERLAND_ZONES.length} zones à charger`)
  
  // Charger chaque zone en parallèle (par groupes de 5 pour éviter de surcharger)
  const chunkSize = 5
  for (let i = 0; i < SWITZERLAND_ZONES.length; i += chunkSize) {
    const chunk = SWITZERLAND_ZONES.slice(i, i + chunkSize)
    const chunkPromises = chunk.map(async (zone, idx) => {
      try {
        const features = await loadZone(zone)
        console.log(`   Zone ${i + idx + 1}/${SWITZERLAND_ZONES.length}: ${features.length} features`)
        return features
      } catch (error) {
        console.warn(`   Zone ${i + idx + 1}: Erreur`, error)
        return []
      }
    })
    
    const chunkResults = await Promise.all(chunkPromises)
    
    // Fusionner les résultats en évitant les doublons
    for (const features of chunkResults) {
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
  url.searchParams.set('limit', '100000')  // Limite maximale

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
 * 
 * LOGIQUE :
 * - Axe principal : strassennummer = "N1", "N2", "N20" (juste le numéro)
 * - Rampe : strassennummer = "N1_YVER", "N1_MURT" (contient un underscore)
 */
export function isRampSegment(properties: Record<string, unknown>): boolean {
  const strassennummer = (properties.strassennummer as string) || ''
  
  // Si strassennummer contient un underscore après le numéro de route, c'est une rampe
  // Ex: N1_YVER, N1_MURT, N4_MUTZ sont des rampes
  // Ex: N1, N2, N20 sont des axes principaux
  return strassennummer.includes('_')
}

/**
 * Extrait le numéro de route principal (N1, N2, etc.) depuis strassennummer
 * Ex: "N1_BERN" -> "N1", "N16" -> "N16"
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
 * Formate le code de position pour l'affichage
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
  // Axes principaux - ROUGE
  mainAxis: '#dc2626',
  
  // Rampes, sorties, entrées - VIOLET/MAGENTA
  ramp: '#a855f7',
  
  // Sélection - VERT CLAIR
  selected: '#4ade80',
  
  // Points kilométriques
  kmPoint: '#f59e0b',
  kmPointStroke: '#ffffff',
}
