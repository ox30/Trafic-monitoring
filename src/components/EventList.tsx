/**
 * Liste des événements trafic
 */

import { 
  TrafficEvent, 
  formatEventState, 
  formatSeverity,
  getSeverityColor,
  getStateColor,
} from '../domain/events'
import { mockGlobalSegments } from '../data/mockNetwork'
import './EventList.css'

interface EventListProps {
  events: TrafficEvent[]
  selectedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

export function EventList({ events, selectedEventId, onSelectEvent }: EventListProps) {
  const activeEvents = events.filter(e => e.state !== 'CLOSED')
  const closedEvents = events.filter(e => e.state === 'CLOSED')

  return (
    <div className="event-list">
      <div className="event-list-header">
        <h2>Événements trafic</h2>
        <span className="event-count">{activeEvents.length} actif{activeEvents.length > 1 ? 's' : ''}</span>
      </div>

      {activeEvents.length === 0 ? (
        <div className="event-list-empty">
          <p>Aucun événement actif</p>
        </div>
      ) : (
        <div className="event-list-items">
          {activeEvents.map(event => (
            <EventCard 
              key={event.id}
              event={event}
              isSelected={event.id === selectedEventId}
              onClick={() => onSelectEvent(event.id)}
            />
          ))}
        </div>
      )}

      {closedEvents.length > 0 && (
        <>
          <div className="event-list-divider">
            <span>Événements clôturés</span>
          </div>
          <div className="event-list-items event-list-closed">
            {closedEvents.map(event => (
              <EventCard 
                key={event.id}
                event={event}
                isSelected={event.id === selectedEventId}
                onClick={() => onSelectEvent(event.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface EventCardProps {
  event: TrafficEvent
  isSelected: boolean
  onClick: () => void
}

function EventCard({ event, isSelected, onClick }: EventCardProps) {
  const segment = mockGlobalSegments.find(s => s.id === event.globalSegmentId)
  const lastUpdated = new Date(event.lastUpdatedAt)
  const timeAgo = formatTimeAgo(lastUpdated)

  return (
    <button 
      className={`event-card ${isSelected ? 'event-card-selected' : ''}`}
      onClick={onClick}
    >
      <div className="event-card-header">
        <div 
          className="event-severity-badge"
          style={{ 
            backgroundColor: `${getSeverityColor(event.severity)}20`,
            color: getSeverityColor(event.severity),
            borderColor: getSeverityColor(event.severity)
          }}
        >
          {formatSeverity(event.severity)}
        </div>
        <div 
          className="event-state-badge"
          style={{ 
            backgroundColor: `${getStateColor(event.state)}20`,
            color: getStateColor(event.state)
          }}
        >
          {formatEventState(event.state)}
        </div>
      </div>

      <h3 className="event-card-title">{event.title}</h3>
      
      {segment && (
        <div className="event-card-segment">
          <span className="segment-axis">{segment.axisCode}</span>
          <span className="segment-desc">{segment.description}</span>
        </div>
      )}

      <div className="event-card-footer">
        <div className="event-delay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>
            {event.estimatedDelayMinutes > 0 
              ? `+${event.estimatedDelayMinutes} min` 
              : 'Fluide'}
          </span>
        </div>
        <div className="event-time">
          {timeAgo}
        </div>
      </div>

      {event.currentDeviationPlanId && (
        <div className="event-deviation-active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
          </svg>
          <span>Déviation active</span>
        </div>
      )}
    </button>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutes < 1) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Il y a ${diffHours}h`
  
  return date.toLocaleDateString('fr-CH')
}

