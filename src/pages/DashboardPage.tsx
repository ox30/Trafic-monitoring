/**
 * Page principale du Dashboard de monitoring trafic
 */

import { useState } from 'react'
import { TrafficMapPlaceholder } from '../components/TrafficMapPlaceholder'
import { EventList } from '../components/EventList'
import { EventDetail } from '../components/EventDetail'
import { SegmentList } from '../components/SegmentList'
import { mockTrafficEvents } from '../data/mockEvents'
import { mockGlobalSegments } from '../data/mockNetwork'
import { sortEventsBySeverity } from '../domain/events'
import './DashboardPage.css'

export function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Événements triés par sévérité
  const sortedEvents = sortEventsBySeverity(mockTrafficEvents)
  
  // Événement sélectionné
  const selectedEvent = selectedEventId 
    ? mockTrafficEvents.find(e => e.id === selectedEventId) || null
    : null

  // ID du segment associé à l'événement sélectionné (pour le surlignage)
  const highlightedSegmentId = selectedEvent?.globalSegmentId || null

  return (
    <div className="dashboard">
      {/* Zone carte (placeholder) */}
      <div className="dashboard-map">
        <TrafficMapPlaceholder />
      </div>

      {/* Zone principale : événements et détails */}
      <div className="dashboard-main">
        {/* Liste des événements */}
        <div className="dashboard-events">
          <EventList 
            events={sortedEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
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
          highlightedSegmentId={highlightedSegmentId}
        />
      </div>
    </div>
  )
}

