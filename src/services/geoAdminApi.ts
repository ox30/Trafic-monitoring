/**
 * Service pour l'API geo.admin.ch (swisstopo/ASTRA)
 * Documentation : https://api3.geo.admin.ch/
 * 
 * Couche utilisée : ch.astra.nationalstrassenachsen (Axes des routes nationales)
 */

const GEO_ADMIN_API_BASE = 'https://api3.geo.admin.ch/rest/services/api/MapServer'
const LAYER_ID = 'ch.astra.nationalstrassenachsen'

// Bounding box de la Suisse en WGS84 (lon/lat)
const SWITZERLAND_BBOX = {
  minLon: 5.9,
  minLat: 45.8,
  maxLon: 10.5,
  maxLat: 47.9,
}

export interface NationalRoadFeature {
  id: number
  strassennummer: string | null  // Ex: "N1_BERN", "N2_BASEL"
  segmentname: string | null     // Ex: "S2", "10AUSTW"
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
 * Retourne un GeoJSON FeatureCollection
 */
export async function loadNationalRoads(): Promise<GeoJSON.FeatureCollection> {
  const { minLon, minLat, maxLon, maxLat } = SWITZERLAND_BBOX
  
  // Utiliser l'endpoint identify avec une bbox couvrant toute la Suisse
  // L'API supporte le format GeoJSON via le paramètre geometryFormat
  const url = new URL(`${GEO_ADMIN_API_BASE}/identify`)
  url.searchParams.set('layers', `all:${LAYER_ID}`)
  url.searchParams.set('geometryType', 'esriGeometryEnvelope')
  url.searchParams.set('geometry', `${minLon},${minLat},${maxLon},${maxLat}`)
  url.searchParams.set('geometryFormat', 'geojson')
  url.searchParams.set('sr', '4326')  // WGS84
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('tolerance', '0')
  url.searchParams.set('limit', '10000')  // Limite haute pour récupérer toutes les features

  try {
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Erreur API geo.admin.ch: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // L'API retourne un objet avec une propriété "results"
    // Chaque result contient une feature GeoJSON
    if (data.results && Array.isArray(data.results)) {
      const features: GeoJSON.Feature[] = data.results.map((result: {
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
        },
      }))

      return {
        type: 'FeatureCollection',
        features,
      }
    }

    // Si pas de résultats, retourner une collection vide
    return {
      type: 'FeatureCollection',
      features: [],
    }
  } catch (error) {
    console.error('Erreur lors du chargement des routes nationales:', error)
    throw error
  }
}

/**
 * Charge uniquement les lignes (axes routiers) sans les points
 */
export async function loadNationalRoadLines(): Promise<GeoJSON.FeatureCollection> {
  const allData = await loadNationalRoads()
  
  return {
    type: 'FeatureCollection',
    features: allData.features.filter(f => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'),
  }
}

/**
 * Charge uniquement les points (bornes, jonctions)
 */
export async function loadNationalRoadPoints(): Promise<GeoJSON.FeatureCollection> {
  const allData = await loadNationalRoads()
  
  return {
    type: 'FeatureCollection',
    features: allData.features.filter(f => f.geometry.type === 'Point'),
  }
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
 * Couleurs par axe routier suisse
 */
export const ROUTE_COLORS: Record<string, string> = {
  'N1': '#1a5f2a',   // Vert - A1 Genève-St-Gall
  'N2': '#2563eb',   // Bleu - A2 Bâle-Chiasso
  'N3': '#dc2626',   // Rouge - A3 Bâle-Sargans
  'N4': '#9333ea',   // Violet - A4 Zurich-Altdorf
  'N5': '#ea580c',   // Orange - A5 Yverdon-Bienne
  'N6': '#0d9488',   // Teal - A6 Berne-Spiez
  'N7': '#be185d',   // Rose - A7 Winterthur-Kreuzlingen
  'N8': '#4f46e5',   // Indigo - A8 Interlaken-Lungern
  'N9': '#ca8a04',   // Jaune - A9 Lausanne-Simplon
  'N12': '#059669',  // Émeraude - A12 Berne-Vevey
  'N13': '#7c3aed',  // Violet clair - A13 St-Margrethen-Bellinzona
  'N14': '#e11d48',  // Rouge rose - A14 Zurich-Luzern
  'N15': '#0284c7',  // Bleu ciel - A15
  'N16': '#65a30d',  // Lime - A16 Transjurane
  'default': '#6b7280',  // Gris pour les autres
}

/**
 * Retourne la couleur pour un numéro de route
 */
export function getRouteColor(routeNumber: string | null): string {
  if (!routeNumber) return ROUTE_COLORS.default
  return ROUTE_COLORS[routeNumber] || ROUTE_COLORS.default
}

