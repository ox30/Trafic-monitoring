/**
 * Carte interactive MapLibre pour le monitoring du trafic suisse
 */

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TrafficEvent } from '../domain/events'
import { GlobalSegment } from '../domain/network'
import networkData from '../data/network.geojson'

// Import des icônes d'événements
import eventCriticalIcon from '../data/event-icons/event-critical.svg'
import eventHighIcon from '../data/event-icons/event-high.svg'
import eventMediumIcon from '../data/event-icons/event-medium.svg'
import eventLowIcon from '../data/event-icons/event-low.svg'

import './TrafficMap.css'

interface TrafficMapProps {
  selectedSegmentId: string | null
  onSelectSegment: (segmentId: string | null) => void
  events: TrafficEvent[]
  segments: GlobalSegment[]
}

// Centre de la Suisse (approximatif, région lémanique pour notre mock)
const SWITZERLAND_CENTER: [number, number] = [6.45, 46.45]
const INITIAL_ZOOM = 9.5

export function TrafficMap({ 
  selectedSegmentId, 
  onSelectSegment, 
  events,
}: TrafficMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
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
            attribution: '© OpenStreetMap contributors',
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
      minZoom: 7,
      maxZoom: 16,
    })

    // Ajouter les contrôles de navigation
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.current.on('load', () => {
      if (!map.current) return

      // Charger les icônes d'événements
      const iconPromises = [
        loadIcon(map.current, 'event-critical', eventCriticalIcon),
        loadIcon(map.current, 'event-high', eventHighIcon),
        loadIcon(map.current, 'event-medium', eventMediumIcon),
        loadIcon(map.current, 'event-low', eventLowIcon),
      ]

      Promise.all(iconPromises).then(() => {
        if (!map.current) return

        // Ajouter la source GeoJSON du réseau
        map.current.addSource('network', {
          type: 'geojson',
          data: networkData as GeoJSON.FeatureCollection,
        })

        // Couche des tronçons (LineString) - fond
        map.current.addLayer({
          id: 'segments-background',
          type: 'line',
          source: 'network',
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {
            'line-color': '#1a5f2a',
            'line-width': 6,
            'line-opacity': 0.8,
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        })

        // Couche des tronçons - surlignage
        map.current.addLayer({
          id: 'segments-highlight',
          type: 'line',
          source: 'network',
          filter: ['==', ['get', 'id'], ''],
          paint: {
            'line-color': '#22c55e',
            'line-width': 10,
            'line-opacity': 1,
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        })

        // Couche des jonctions (Points)
        map.current.addLayer({
          id: 'junctions',
          type: 'circle',
          source: 'network',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'type'], 'interchange'], 8,
              6
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'type'], 'interchange'], '#f59e0b',
              '#ffffff'
            ],
            'circle-stroke-color': '#1a5f2a',
            'circle-stroke-width': 2,
          },
        })

        // Labels des jonctions
        map.current.addLayer({
          id: 'junction-labels',
          type: 'symbol',
          source: 'network',
          filter: ['==', ['geometry-type'], 'Point'],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Regular'],
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#1a5f2a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        })

        // Source pour les événements (sera mise à jour dynamiquement)
        map.current.addSource('events', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })

        // Couche des événements
        map.current.addLayer({
          id: 'events-layer',
          type: 'symbol',
          source: 'events',
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': 1,
            'icon-allow-overlap': true,
            'icon-anchor': 'center',
          },
        })

        setMapLoaded(true)
      })

      // Interaction : clic sur un tronçon
      map.current.on('click', 'segments-background', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const segmentId = feature.properties?.id
          if (segmentId) {
            onSelectSegment(segmentId)
          }
        }
      })

      // Curseur au survol des tronçons
      map.current.on('mouseenter', 'segments-background', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer'
        }
      })

      map.current.on('mouseleave', 'segments-background', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = ''
        }
      })

      // Popup au survol des jonctions
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
      })

      map.current.on('mouseenter', 'junctions', (e) => {
        if (!map.current || !e.features || e.features.length === 0) return
        
        map.current.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const name = feature.properties?.name || 'Jonction'
        const type = feature.properties?.type || 'junction'
        const axe = feature.properties?.axe || ''

        popup
          .setLngLat(coordinates)
          .setHTML(`
            <div class="map-popup">
              <strong>${name}</strong>
              <span class="popup-badge">${axe}</span>
              <span class="popup-type">${formatNodeType(type)}</span>
            </div>
          `)
          .addTo(map.current)
      })

      map.current.on('mouseleave', 'junctions', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = ''
        }
        popup.remove()
      })

      // Popup au survol des événements
      map.current.on('mouseenter', 'events-layer', (e) => {
        if (!map.current || !e.features || e.features.length === 0) return
        
        map.current.getCanvas().style.cursor = 'pointer'
        
        const feature = e.features[0]
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const title = feature.properties?.title || 'Événement'
        const severity = feature.properties?.severity || ''
        const delay = feature.properties?.delay || 0

        popup
          .setLngLat(coordinates)
          .setHTML(`
            <div class="map-popup map-popup-event">
              <strong>${title}</strong>
              <span class="popup-severity popup-severity-${severity.toLowerCase()}">${formatSeverity(severity)}</span>
              ${delay > 0 ? `<span class="popup-delay">+${delay} min</span>` : ''}
            </div>
          `)
          .addTo(map.current)
      })

      map.current.on('mouseleave', 'events-layer', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = ''
        }
        popup.remove()
      })
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [onSelectSegment])

  // Mise à jour du surlignage quand le segment sélectionné change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    map.current.setFilter('segments-highlight', [
      '==',
      ['get', 'id'],
      selectedSegmentId || '',
    ])

    // Zoom sur le segment sélectionné
    if (selectedSegmentId) {
      const features = (networkData as GeoJSON.FeatureCollection).features.filter(
        (f) => f.properties?.id === selectedSegmentId && f.geometry.type === 'LineString'
      )
      
      if (features.length > 0) {
        const coords = (features[0].geometry as GeoJSON.LineString).coordinates
        const bounds = coords.reduce(
          (bounds, coord) => bounds.extend(coord as [number, number]),
          new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
        )
        
        map.current.fitBounds(bounds, {
          padding: 100,
          maxZoom: 12,
          duration: 500,
        })
      }
    }
  }, [selectedSegmentId, mapLoaded])

  // Mise à jour des événements sur la carte
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Créer les features pour les événements
    const eventFeatures: GeoJSON.Feature[] = events
      .filter((e) => e.state !== 'CLOSED')
      .map((event) => {
        // Trouver le centre du segment associé
        const segmentFeature = (networkData as GeoJSON.FeatureCollection).features.find(
          (f) => f.properties?.id === event.globalSegmentId && f.geometry.type === 'LineString'
        )

        if (!segmentFeature) return null

        const coords = (segmentFeature.geometry as GeoJSON.LineString).coordinates
        const midIndex = Math.floor(coords.length / 2)
        const center = coords[midIndex]

        return {
          type: 'Feature' as const,
          properties: {
            id: event.id,
            title: event.title,
            severity: event.severity,
            delay: event.estimatedDelayMinutes,
            icon: `event-${event.severity.toLowerCase()}`,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: center,
          },
        }
      })
      .filter((f): f is GeoJSON.Feature => f !== null)

    const source = map.current.getSource('events') as maplibregl.GeoJSONSource
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: eventFeatures,
      })
    }
  }, [events, mapLoaded])

  return (
    <div className="traffic-map">
      <div ref={mapContainer} className="traffic-map-container" />
      <div className="traffic-map-legend">
        <div className="legend-title">Légende</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-line legend-line-normal"></span>
            <span>Tronçon</span>
          </div>
          <div className="legend-item">
            <span className="legend-line legend-line-selected"></span>
            <span>Sélectionné</span>
          </div>
          <div className="legend-item">
            <span className="legend-point legend-point-junction"></span>
            <span>Jonction</span>
          </div>
          <div className="legend-item">
            <span className="legend-point legend-point-interchange"></span>
            <span>Échangeur</span>
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

function formatNodeType(type: string): string {
  const labels: Record<string, string> = {
    junction: 'Jonction',
    interchange: 'Échangeur',
    ramp_entry: 'Entrée',
    ramp_exit: 'Sortie',
    service_area: 'Aire de service',
  }
  return labels[type] || type
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

