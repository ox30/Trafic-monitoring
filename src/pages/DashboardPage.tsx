/**
 * Page principale du Dashboard de monitoring trafic
 */

import { useState } from 'react'
import { TrafficMap } from '../components/TrafficMap'
import { EventList } from '../components/EventList'
import { EventDetail } from '../components/EventDetail'
import { SegmentList } from '../components/SegmentList'
import { mockTrafficEvents } from '../data/mockEvents'
import { mockGlobalSegments } from '../data/mockNetwork'
import { sortEventsBySeverity } from '../domain/events'
import './DashboardPage.css'

export function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  // Événements triés par sévérité
  const sortedEvents = sortEventsBySeverity(mockTrafficEvents)
  
  // Événement sélectionné
  const selectedEvent = selectedEventId 
    ? mockTrafficEvents.find(e => e.id === selectedEventId) || null
    : null

  // Gestion de la sélection d'un événement
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    // Sélectionner automatiquement le segment associé
    const event = mockTrafficEvents.find(e => e.id === eventId)
    if (event) {
      setSelectedSegmentId(event.globalSegmentId)
    }
  }

  // Gestion de la sélection d'un segment
  const handleSelectSegment = (segmentId: string | null) => {
    setSelectedSegmentId(segmentId)
    // Si un événement est associé à ce segment, le sélectionner
    if (segmentId) {
      const relatedEvent = mockTrafficEvents.find(e => e.globalSegmentId === segmentId)
      if (relatedEvent) {
        setSelectedEventId(relatedEvent.id)
      }
    }
  }

  return (
    <div className="dashboard">
      {/* Zone carte MapLibre */}
      <div className="dashboard-map">
        <TrafficMap 
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={handleSelectSegment}
          events={sortedEvents}
          segments={mockGlobalSegments}
        />
      </div>

      {/* Zone principale : événements et détails */}
      <div className="dashboard-main">
        {/* Liste des événements */}
        <div className="dashboard-events">
          <EventList 
            events={sortedEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
          />
        </div>

        {/* Détail de l'événement sélectionné */}
        <div className="dashboard-detail">
          <EventDetail event={selectedEvent} />
        </div>
      </div>

      {/* Zone secondaire : liste des tronçons */}
      <div className="dashboard-segments">
        <SegmentList 
          segments={mockGlobalSegments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={handleSelectSegment}
        />
      </div>
    </div>
  )
}
