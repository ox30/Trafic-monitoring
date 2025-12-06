/**
 * Carte interactive MapLibre pour le monitoring du trafic suisse
 * Affiche la couche officielle des routes nationales (ASTRA/geo.admin.ch)
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TrafficEvent } from '../domain/events'
import { loadNetworkData } from '../services/networkLoader'
import { extractRouteNumber, ROAD_COLORS } from '../services/geoAdminApi'
import { updateSystemStatus } from '../services/systemStatus'

// Import des icônes d'événements
import eventCriticalIcon from '../data/event-icons/event-critical.svg'
import eventHighIcon from '../data/event-icons/event-high.svg'
import eventMediumIcon from '../data/event-icons/event-medium.svg'
import eventLowIcon from '../data/event-icons/event-low.svg'

import './TrafficMap.css'

// Données mock de fallback (utilisées si l'API échoue)
const mockNetworkData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "A1-GE-NYON-PLUS", axe: "A1", strassennummer: "N1", from: "Genève Aéroport", to: "Nyon" },
      geometry: { type: "LineString", coordinates: [[6.1092, 46.2380], [6.1250, 46.2520], [6.1450, 46.2750], [6.1680, 46.3050], [6.1950, 46.3350], [6.2150, 46.3580], [6.2333, 46.3833]] }
    },
    {
      type: "Feature",
      properties: { id: "A1-NYON-MORGES-PLUS", axe: "A1", strassennummer: "N1", from: "Nyon", to: "Morges" },
      geometry: { type: "LineString", coordinates: [[6.2333, 46.3833], [6.2650, 46.4050], [6.3050, 46.4280], [6.3450, 46.4480], [6.3850, 46.4650], [6.4250, 46.4800], [6.4650, 46.4950], [6.5000, 46.5167]] }
    },
    {
      type: "Feature",
      properties: { id: "A1-MORGES-CRISSIER-PLUS", axe: "A1", strassennummer: "N1", from: "Morges", to: "Crissier" },
      geometry: { type: "LineString", coordinates: [[6.5000, 46.5167], [6.5180, 46.5250], [6.5380, 46.5350], [6.5550, 46.5420], [6.5750, 46.5450]] }
    },
    {
      type: "Feature",
      properties: { id: "A9-VEVEY-MONTREUX-PLUS", axe: "A9", strassennummer: "N9", from: "Vevey", to: "Montreux" },
      geometry: { type: "LineString", coordinates: [[6.8428, 46.4628], [6.8600, 46.4550], [6.8780, 46.4480], [6.8950, 46.4400], [6.9106, 46.4312]] }
    },
  ]
}

interface TrafficMapProps {
  selectedSegmentId: string | null
  onSelectSegment: (segmentId: string | null) => void
  events: TrafficEvent[]
}

// Centre de la Suisse
const SWITZERLAND_CENTER: [number, number] = [8.2275, 46.8182]
const INITIAL_ZOOM = 8

export function TrafficMap({ 
  selectedSegmentId, 
  onSelectSegment, 
  events,
}: TrafficMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const mapReady = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Stocker les données réseau chargées
  const networkDataRef = useRef<GeoJSON.FeatureCollection | null>(null)
  
  // Refs pour les valeurs actuelles (évite les re-renders de la carte)
  const selectedSegmentRef = useRef(selectedSegmentId)
  const eventsRef = useRef(events)
  const onSelectSegmentRef = useRef(onSelectSegment)
  
  useEffect(() => {
    selectedSegmentRef.current = selectedSegmentId
  }, [selectedSegmentId])
  
  useEffect(() => {
    eventsRef.current = events
  }, [events])
  
  useEffect(() => {
    onSelectSegmentRef.current = onSelectSegment
  }, [onSelectSegment])

  // Fonction pour mettre à jour le surlignage
  const updateHighlight = useCallback((segmentId: string | null) => {
    if (!map.current || !mapReady.current) return
    
    try {
      // Pour la couche ASTRA, on utilise l'ID ou strassennummer
      map.current.setFilter('roads-highlight', [
        'any',
        ['==', ['get', 'id'], segmentId || ''],
        ['==', ['to-string', ['get', 'featureId']], segmentId || ''],
      ])
    } catch (e) {
      console.warn('Erreur lors de la mise à jour du surlignage:', e)
    }
  }, [])

  // Fonction pour mettre à jour les événements
  const updateEvents = useCallback((eventList: TrafficEvent[]) => {
    if (!map.current || !mapReady.current || !networkDataRef.current) return
    
    try {
      const source = map.current.getSource('events') as maplibregl.GeoJSONSource
      if (!source) return

      const eventFeatures: GeoJSON.Feature[] = eventList
        .filter((e: TrafficEvent) => e.state !== 'CLOSED')
        .map((event: TrafficEvent) => {
          // Trouver le centre du segment associé dans les données du réseau
          const segmentFeature = networkDataRef.current?.features.find(
            (f: GeoJSON.Feature) => {
              const props = f.properties || {}
              return (props.id === event.globalSegmentId || 
                      props.segmentname === event.globalSegmentId) && 
                     (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
            }
          )

          if (!segmentFeature) {
            // Fallback: utiliser les données mock
            const mockFeature = mockNetworkData.features.find(
              (f: GeoJSON.Feature) => f.properties?.id === event.globalSegmentId
            )
            if (!mockFeature) return null
            const coords = (mockFeature.geometry as GeoJSON.LineString).coordinates
            const midIndex = Math.floor(coords.length / 2)
            return {
              type: 'Feature' as const,
              properties: {
                id: event.id,
                title: event.title,
                severity: event.severity,
                delay: event.estimatedDelayMinutes,
                icon: `event-${event.severity.toLowerCase()}`,
              },
              geometry: { type: 'Point' as const, coordinates: coords[midIndex] },
            }
          }

          // Calculer le centre de la géométrie
          let center: [number, number]
          if (segmentFeature.geometry.type === 'LineString') {
            const coords = segmentFeature.geometry.coordinates
            const midIndex = Math.floor(coords.length / 2)
            center = coords[midIndex] as [number, number]
          } else if (segmentFeature.geometry.type === 'MultiLineString') {
            const firstLine = segmentFeature.geometry.coordinates[0]
            const midIndex = Math.floor(firstLine.length / 2)
            center = firstLine[midIndex] as [number, number]
          } else {
            return null
          }

          return {
            type: 'Feature' as const,
            properties: {
              id: event.id,
              title: event.title,
              severity: event.severity,
              delay: event.estimatedDelayMinutes,
              icon: `event-${event.severity.toLowerCase()}`,
            },
            geometry: { type: 'Point' as const, coordinates: center },
          }
        })
        .filter((f): f is GeoJSON.Feature => f !== null)

      source.setData({
        type: 'FeatureCollection',
        features: eventFeatures,
      })
    } catch (e) {
      console.warn('Erreur lors de la mise à jour des événements:', e)
    }
  }, [])

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'Swiss Traffic Monitoring',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors | Routes nationales © ASTRA/swisstopo',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: SWITZERLAND_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 6,
      maxZoom: 18,
    })

    map.current = mapInstance

    mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapInstance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    mapInstance.on('load', async () => {
      // Charger les icônes d'événements
      try {
        await Promise.all([
          loadIcon(mapInstance, 'event-critical', eventCriticalIcon),
          loadIcon(mapInstance, 'event-high', eventHighIcon),
          loadIcon(mapInstance, 'event-medium', eventMediumIcon),
          loadIcon(mapInstance, 'event-low', eventLowIcon),
        ])
      } catch (e) {
        console.warn('Erreur chargement icônes:', e)
      }

      // Charger les routes nationales (cache IndexedDB ou API geo.admin.ch)
      let networkData: GeoJSON.FeatureCollection
      
      try {
        setIsLoading(true)
        
        // Charger via le service (cache ou API)
        const result = await loadNetworkData()
        networkData = result.data
        
        console.log(`✅ ${result.stats.totalFeatures} features (source: ${result.source})`)
        console.log(`   - ${result.stats.mainAxes} axes principaux`)
        console.log(`   - ${result.stats.ramps} rampes`)
        console.log(`   - ${result.stats.points} points KM`)
        
        if (result.cacheInfo) {
          console.log(`   - Cache: ${result.cacheInfo.ageHours.toFixed(1)}h`)
        }
        
      } catch (error) {
        console.warn('⚠️ Fallback vers données mock:', error)
        networkData = mockNetworkData
        
        // Signaler le mode dégradé
        updateSystemStatus('network-layer', {
          state: 'degraded',
          lastError: 'Utilisation des données mock',
          details: { 
            source: 'Données locales (fallback)',
            error: String(error),
          }
        })
      } finally {
        setIsLoading(false)
      }
      
      networkDataRef.current = networkData

      // Ajouter la source GeoJSON du réseau
      mapInstance.addSource('national-roads', {
        type: 'geojson',
        data: networkData,
      })

      // Couche des routes nationales - Axes principaux (ROUGE)
      mapInstance.addLayer({
        id: 'roads-main',
        type: 'line',
        source: 'national-roads',
        filter: ['all',
          ['any',
            ['==', ['geometry-type'], 'LineString'],
            ['==', ['geometry-type'], 'MultiLineString']
          ],
          ['!=', ['get', 'isRamp'], true]
        ],
        paint: {
          'line-color': ROAD_COLORS.mainAxis,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            6, 2,
            10, 4,
            14, 6
          ],
          'line-opacity': 0.9,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })

      // Couche des rampes, sorties, entrées (VIOLET)
      mapInstance.addLayer({
        id: 'roads-ramps',
        type: 'line',
        source: 'national-roads',
        filter: ['all',
          ['any',
            ['==', ['geometry-type'], 'LineString'],
            ['==', ['geometry-type'], 'MultiLineString']
          ],
          ['==', ['get', 'isRamp'], true]
        ],
        paint: {
          'line-color': ROAD_COLORS.ramp,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            6, 1.5,
            10, 3,
            14, 5
          ],
          'line-opacity': 0.85,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })

      // Couche de surlignage
      mapInstance.addLayer({
        id: 'roads-highlight',
        type: 'line',
        source: 'national-roads',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'line-color': '#22c55e',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            6, 4,
            10, 8,
            14, 12
          ],
          'line-opacity': 1,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })

      // Points kilométriques - visibles à partir du zoom 9
      mapInstance.addLayer({
        id: 'road-points',
        type: 'circle',
        source: 'national-roads',
        filter: ['==', ['geometry-type'], 'Point'],
        minzoom: 9,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            9, 3,
            12, 5,
            16, 8
          ],
          'circle-color': ROAD_COLORS.kmPoint,
          'circle-stroke-color': ROAD_COLORS.kmPointStroke,
          'circle-stroke-width': 2,
        },
      })

      // Source pour les événements
      mapInstance.addSource('events', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Couche des événements
      mapInstance.addLayer({
        id: 'events-layer',
        type: 'symbol',
        source: 'events',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            6, 0.6,
            10, 1,
            14, 1.2
          ],
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
        },
      })

      // Marquer la carte comme prête
      mapReady.current = true
      
      // Appliquer l'état initial
      updateHighlight(selectedSegmentRef.current)
      updateEvents(eventsRef.current)

      // Popup au survol des routes
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
      })

      // Handler pour le clic sur les routes (axes et rampes)
      const handleRoadClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const segmentId = feature.properties?.id || feature.properties?.featureId || feature.properties?.segmentname
          if (segmentId) {
            onSelectSegmentRef.current(String(segmentId))
          }
        }
      }

      // Handler pour le survol des axes principaux
      const handleMainAxisMouseEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        
        mapInstance.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const props = feature.properties || {}
        
        const routeNum = extractRouteNumber(props.strassennummer) || 'N/A'
        const axisCode = routeNum.replace('N', 'A')
        const segmentName = props.segmentname || ''
        const description = props.bezeichnung || ''
        const posCode = props.positionscode || ''
        const direction = posCode === '+' ? '→' : posCode === '-' ? '←' : ''
        
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="map-popup map-popup-axis">
              <div class="popup-header">
                <strong class="popup-route">${axisCode}</strong>
                ${direction ? `<span class="popup-direction">${direction}</span>` : ''}
              </div>
              ${segmentName ? `<span class="popup-segment">${segmentName}</span>` : ''}
              ${description ? `<span class="popup-description">${description}</span>` : ''}
            </div>
          `)
          .addTo(mapInstance)
      }

      // Handler pour le survol des rampes
      const handleRampMouseEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        
        mapInstance.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const props = feature.properties || {}
        
        const routeNum = extractRouteNumber(props.strassennummer) || 'N/A'
        const axisCode = routeNum.replace('N', 'A')
        const segmentName = props.segmentname || ''
        const junction = props.bezeichnung || ''
        
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="map-popup map-popup-ramp">
              <div class="popup-header">
                <strong class="popup-route">${axisCode}</strong>
                <span class="popup-type-ramp">Rampe</span>
              </div>
              ${segmentName ? `<span class="popup-segment">${segmentName}</span>` : ''}
              ${junction ? `<span class="popup-junction">Jonction: ${junction}</span>` : ''}
            </div>
          `)
          .addTo(mapInstance)
      }

      const handleRoadMouseLeave = () => {
        mapInstance.getCanvas().style.cursor = ''
        popup.remove()
      }

      // Handler pour le survol des points kilométriques
      const handlePointMouseEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        
        mapInstance.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const geom = feature.geometry
        
        // Valider que c'est bien un Point avec des coordonnées valides
        if (geom.type !== 'Point' || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
          return
        }
        
        const coordinates: [number, number] = [geom.coordinates[0], geom.coordinates[1]]
        const props = feature.properties || {}
        
        const pointName = props.name || ''
        const km = props.kilometerwert || ''
        const sectorLength = props.sektorlaenge ? `${parseFloat(props.sektorlaenge).toFixed(0)} m` : ''
        const routeNum = extractRouteNumber(props.strassennummer) || ''
        const axisCode = routeNum.replace('N', 'A')
        
        popup
          .setLngLat(coordinates)
          .setHTML(`
            <div class="map-popup map-popup-point">
              <div class="popup-header">
                <strong class="popup-route">${axisCode}</strong>
                <span class="popup-type-point">Point KM</span>
              </div>
              ${pointName ? `<span class="popup-point-name">Repère: ${pointName}</span>` : ''}
              ${km ? `<span class="popup-km">KM ${km}</span>` : ''}
              ${sectorLength ? `<span class="popup-sector">Secteur: ${sectorLength}</span>` : ''}
            </div>
          `)
          .addTo(mapInstance)
      }

      // Handler pour clic sur les points
      const handlePointClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const segmentId = feature.properties?.id || feature.properties?.featureId
          if (segmentId) {
            onSelectSegmentRef.current(String(segmentId))
          }
        }
      }

      // Appliquer les handlers aux couches
      mapInstance.on('click', 'roads-main', handleRoadClick)
      mapInstance.on('click', 'roads-ramps', handleRoadClick)
      mapInstance.on('click', 'road-points', handlePointClick)
      
      mapInstance.on('mouseenter', 'roads-main', handleMainAxisMouseEnter)
      mapInstance.on('mouseenter', 'roads-ramps', handleRampMouseEnter)
      mapInstance.on('mouseenter', 'road-points', handlePointMouseEnter)
      
      mapInstance.on('mouseleave', 'roads-main', handleRoadMouseLeave)
      mapInstance.on('mouseleave', 'roads-ramps', handleRoadMouseLeave)
      mapInstance.on('mouseleave', 'road-points', handleRoadMouseLeave)

      mapInstance.on('mouseenter', 'events-layer', (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        
        mapInstance.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const geom = feature.geometry
        
        // Valider que c'est bien un Point avec des coordonnées valides
        if (geom.type !== 'Point' || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
          return
        }
        
        const coordinates: [number, number] = [geom.coordinates[0], geom.coordinates[1]]
        const props = feature.properties || {}

        popup
          .setLngLat(coordinates)
          .setHTML(`
            <div class="map-popup map-popup-event">
              <strong>${props.title || 'Événement'}</strong>
              <span class="popup-severity popup-severity-${(props.severity || '').toLowerCase()}">${formatSeverity(props.severity)}</span>
              ${props.delay > 0 ? `<span class="popup-delay">+${props.delay} min</span>` : ''}
            </div>
          `)
          .addTo(mapInstance)
      })

      mapInstance.on('mouseleave', 'events-layer', () => {
        mapInstance.getCanvas().style.cursor = ''
        popup.remove()
      })
    })

    return () => {
      mapReady.current = false
      map.current?.remove()
      map.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionnellement vide - la carte ne doit s'initialiser qu'une fois

  // Mettre à jour le surlignage quand la sélection change
  useEffect(() => {
    updateHighlight(selectedSegmentId)
  }, [selectedSegmentId, updateHighlight])

  // Mettre à jour les événements quand ils changent
  useEffect(() => {
    updateEvents(events)
  }, [events, updateEvents])

  return (
    <div className="traffic-map">
      <div ref={mapContainer} className="traffic-map-container" />
      
      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="traffic-map-loading">
          <div className="loading-spinner"></div>
          <span>Chargement des routes nationales...</span>
        </div>
      )}
      
      <div className="traffic-map-legend">
        <div className="legend-title">Routes nationales</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-line" style={{ background: ROAD_COLORS.mainAxis }}></span>
            <span>Axes principaux</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: ROAD_COLORS.ramp }}></span>
            <span>Rampes / Sorties</span>
          </div>
          <div className="legend-item">
            <span className="legend-point" style={{ background: ROAD_COLORS.kmPoint, border: `2px solid ${ROAD_COLORS.kmPointStroke}` }}></span>
            <span>Points KM</span>
          </div>
          <div className="legend-item">
            <span className="legend-line legend-line-selected"></span>
            <span>Sélectionné</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fonction utilitaire pour charger une icône
async function loadIcon(map: maplibregl.Map, name: string, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      if (!map.hasImage(name)) {
        map.addImage(name, img)
      }
      resolve()
    }
    img.onerror = reject
    img.src = url
  })
}

function formatSeverity(severity: string): string {
  const labels: Record<string, string> = {
    LOW: 'Faible',
    MEDIUM: 'Moyen',
    HIGH: 'Élevé',
    CRITICAL: 'Critique',
  }
  return labels[severity] || severity
}
