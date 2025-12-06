/**
 * Carte interactive MapLibre pour le monitoring du trafic suisse
 * Affiche la couche officielle des routes nationales (ASTRA/geo.admin.ch)
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TrafficEvent } from '../domain/events'
import { GlobalSegment } from '../domain/network'
import { loadNationalRoads, extractRouteNumber, ROUTE_COLORS } from '../services/geoAdminApi'
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
  segments: GlobalSegment[]
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

      // Charger les routes nationales depuis l'API geo.admin.ch
      let networkData: GeoJSON.FeatureCollection
      
      // Signaler le début du chargement
      updateSystemStatus('network-layer', {
        state: 'loading',
        details: { source: 'geo.admin.ch' }
      })
      
      try {
        setIsLoading(true)
        networkData = await loadNationalRoads()
        
        if (networkData.features.length === 0) {
          throw new Error('Aucune donnée reçue')
        }
        
        console.log(`✅ ${networkData.features.length} features chargées depuis geo.admin.ch`)
        
        // Signaler le succès
        updateSystemStatus('network-layer', {
          state: 'online',
          details: { 
            source: 'geo.admin.ch (API)',
            featuresCount: networkData.features.length,
          }
        })
      } catch (error) {
        console.warn('⚠️ Fallback vers données mock:', error)
        networkData = mockNetworkData
        
        // Signaler le mode dégradé
        updateSystemStatus('network-layer', {
          state: 'degraded',
          lastError: error instanceof Error ? error.message : 'Erreur de connexion',
          details: { 
            source: 'Données locales (fallback)',
            featuresCount: networkData.features.length,
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

      // Couche des routes nationales - fond (toutes les lignes)
      mapInstance.addLayer({
        id: 'roads-background',
        type: 'line',
        source: 'national-roads',
        filter: ['any',
          ['==', ['geometry-type'], 'LineString'],
          ['==', ['geometry-type'], 'MultiLineString']
        ],
        paint: {
          'line-color': [
            'case',
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N1'], ROUTE_COLORS['N1'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N2'], ROUTE_COLORS['N2'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N3'], ROUTE_COLORS['N3'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N4'], ROUTE_COLORS['N4'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N5'], ROUTE_COLORS['N5'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N6'], ROUTE_COLORS['N6'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N7'], ROUTE_COLORS['N7'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N8'], ROUTE_COLORS['N8'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 2], 'N9'], ROUTE_COLORS['N9'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 3], 'N12'], ROUTE_COLORS['N12'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 3], 'N13'], ROUTE_COLORS['N13'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 3], 'N14'], ROUTE_COLORS['N14'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 3], 'N15'], ROUTE_COLORS['N15'],
            ['==', ['slice', ['coalesce', ['get', 'strassennummer'], ''], 0, 3], 'N16'], ROUTE_COLORS['N16'],
            // Fallback pour données mock
            ['==', ['get', 'axe'], 'A1'], ROUTE_COLORS['N1'],
            ['==', ['get', 'axe'], 'A9'], ROUTE_COLORS['N9'],
            ROUTE_COLORS.default
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            6, 2,
            10, 4,
            14, 6
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

      // Points (jonctions, bornes) - visible uniquement à zoom élevé
      mapInstance.addLayer({
        id: 'road-points',
        type: 'circle',
        source: 'national-roads',
        filter: ['==', ['geometry-type'], 'Point'],
        minzoom: 10,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, 3,
            14, 6
          ],
          'circle-color': '#ffffff',
          'circle-stroke-color': '#1a5f2a',
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

      // Interactions
      mapInstance.on('click', 'roads-background', (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const segmentId = feature.properties?.id || feature.properties?.featureId || feature.properties?.segmentname
          if (segmentId) {
            onSelectSegmentRef.current(String(segmentId))
          }
        }
      })

      // Popup au survol des routes
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
      })

      mapInstance.on('mouseenter', 'roads-background', (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        
        mapInstance.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const props = feature.properties || {}
        
        const routeNum = extractRouteNumber(props.strassennummer) || props.axe || 'N/A'
        const axisCode = routeNum.replace('N', 'A')
        const name = props.bezeichnung || props.segmentname || props.from && props.to ? `${props.from} → ${props.to}` : ''
        const km = props.kilometerwert ? `KM ${props.kilometerwert}` : ''
        
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="map-popup">
              <strong>${axisCode}</strong>
              ${name ? `<span class="popup-name">${name}</span>` : ''}
              ${km ? `<span class="popup-km">${km}</span>` : ''}
            </div>
          `)
          .addTo(mapInstance)
      })

      mapInstance.on('mouseleave', 'roads-background', () => {
        mapInstance.getCanvas().style.cursor = ''
        popup.remove()
      })

      mapInstance.on('mouseenter', 'road-points', (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        
        mapInstance.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const props = feature.properties || {}
        
        const name = props.name || props.bezeichnung || 'Point'
        const km = props.kilometerwert ? `KM ${props.kilometerwert}` : ''
        
        popup
          .setLngLat(coordinates)
          .setHTML(`
            <div class="map-popup">
              <strong>${name}</strong>
              ${km ? `<span class="popup-km">${km}</span>` : ''}
            </div>
          `)
          .addTo(mapInstance)
      })

      mapInstance.on('mouseleave', 'road-points', () => {
        mapInstance.getCanvas().style.cursor = ''
        popup.remove()
      })

      mapInstance.on('mouseenter', 'events-layer', (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        
        mapInstance.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
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
            <span className="legend-line" style={{ background: ROUTE_COLORS['N1'] }}></span>
            <span>A1</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: ROUTE_COLORS['N2'] }}></span>
            <span>A2</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: ROUTE_COLORS['N9'] }}></span>
            <span>A9</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: ROUTE_COLORS['N12'] }}></span>
            <span>A12</span>
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
