/**
 * Détail d'un événement trafic sélectionné
 */

import { 
  TrafficEvent, 
  formatEventState, 
  formatSeverity,
  getSeverityColor,
  getStateColor,
} from '../domain/events'
import { MonitoringRoute } from '../domain/monitoring'
import { DeviationPlan } from '../domain/deviations'
import { LogEntry, formatLogSource, formatLogLevel, getLogLevelColor, formatTimestamp } from '../domain/logs'
import { mockGlobalSegments } from '../data/mockNetwork'
import { mockMonitoringRoutes } from '../data/mockMonitoringRoutes'
import { mockDeviationPlans } from '../data/mockDeviations'
import { mockLogs } from '../data/mockLogs'
import './EventDetail.css'

interface EventDetailProps {
  event: TrafficEvent | null
}

export function EventDetail({ event }: EventDetailProps) {
  if (!event) {
    return (
      <div className="event-detail event-detail-empty">
        <div className="event-detail-empty-content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p>Sélectionnez un événement pour voir les détails</p>
        </div>
      </div>
    )
  }

  const segment = mockGlobalSegments.find(s => s.id === event.globalSegmentId)
  const monitoringRoutes = mockMonitoringRoutes.filter(
    r => event.relatedMonitoringRouteIds.includes(r.id)
  )
  const deviationPlan = event.currentDeviationPlanId 
    ? mockDeviationPlans.find(p => p.id === event.currentDeviationPlanId)
    : null
  const eventLogs = mockLogs
    .filter(log => log.relatedEventId === event.id)
    .sort((a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime())

  return (
    <div className="event-detail">
      <div className="event-detail-header">
        <div className="event-detail-badges">
          <span 
            className="detail-severity-badge"
            style={{ 
              backgroundColor: `${getSeverityColor(event.severity)}20`,
              color: getSeverityColor(event.severity),
              borderColor: getSeverityColor(event.severity)
            }}
          >
            {formatSeverity(event.severity)}
          </span>
          <span 
            className="detail-state-badge"
            style={{ 
              backgroundColor: `${getStateColor(event.state)}20`,
              color: getStateColor(event.state)
            }}
          >
            {formatEventState(event.state)}
          </span>
        </div>
        <h2>{event.title}</h2>
        <p className="event-detail-id">ID: {event.id}</p>
      </div>

      <div className="event-detail-content">
        {/* Description */}
        <section className="detail-section">
          <h3>Description</h3>
          <p className="detail-description">{event.description}</p>
        </section>

        {/* Informations clés */}
        <section className="detail-section">
          <h3>Informations</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Retard estimé</span>
              <span className="detail-value detail-value-highlight">
                +{event.estimatedDelayMinutes} min
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Première détection</span>
              <span className="detail-value">
                {formatTimestamp(event.firstDetectedAt)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Dernière mise à jour</span>
              <span className="detail-value">
                {formatTimestamp(event.lastUpdatedAt)}
              </span>
            </div>
            {segment && (
              <div className="detail-item">
                <span className="detail-label">Tronçon</span>
                <span className="detail-value">
                  <span className="axis-badge">{segment.axisCode}</span>
                  {segment.description}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Routes de monitoring */}
        <section className="detail-section">
          <h3>Routes de monitoring ({monitoringRoutes.length})</h3>
          {monitoringRoutes.length > 0 ? (
            <div className="monitoring-routes">
              {monitoringRoutes.map(route => (
                <MonitoringRouteCard key={route.id} route={route} />
              ))}
            </div>
          ) : (
            <p className="detail-empty">Aucune route de monitoring associée</p>
          )}
        </section>

        {/* Plan de déviation */}
        <section className="detail-section">
          <h3>Plan de déviation</h3>
          {deviationPlan ? (
            <DeviationPlanCard plan={deviationPlan} />
          ) : (
            <p className="detail-empty">Aucun plan de déviation activé</p>
          )}
        </section>

        {/* Journal */}
        <section className="detail-section">
          <h3>Journal ({eventLogs.length})</h3>
          {eventLogs.length > 0 ? (
            <div className="event-logs">
              {eventLogs.map(log => (
                <LogEntryRow key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <p className="detail-empty">Aucune entrée de journal</p>
          )}
        </section>
      </div>
    </div>
  )
}

function MonitoringRouteCard({ route }: { route: MonitoringRoute }) {
  return (
    <div className="monitoring-route-card">
      <div className="monitoring-route-header">
        <span className="axis-badge">{route.axisCode}</span>
        <span className="monitoring-route-name">{route.name}</span>
        {route.isActive && (
          <span className="monitoring-route-active">Actif</span>
        )}
      </div>
      <div className="monitoring-route-info">
        <span>TomTom ID: <code>{route.tomtomRouteId}</code></span>
        <span>{route.lengthKm} km</span>
      </div>
    </div>
  )
}

function DeviationPlanCard({ plan }: { plan: DeviationPlan }) {
  return (
    <div className="deviation-plan-card">
      <div className="deviation-plan-header">
        <span className="axis-badge">{plan.affectedAxisCode}</span>
        <span className="deviation-plan-name">{plan.name}</span>
        <span className="deviation-plan-active">Activé</span>
      </div>
      <p className="deviation-plan-desc">{plan.description}</p>
      <div className="deviation-plan-templates">
        <div className="template-group">
          <span className="template-label">PMV:</span>
          <span>{plan.pmvTemplateIds.length} templates</span>
        </div>
        <div className="template-group">
          <span className="template-label">Messages:</span>
          <span>{plan.messageTemplates.length} modèles</span>
        </div>
      </div>
    </div>
  )
}

function LogEntryRow({ log }: { log: LogEntry }) {
  return (
    <div className="log-entry">
      <div className="log-entry-header">
        <span 
          className="log-level"
          style={{ color: getLogLevelColor(log.level) }}
        >
          {formatLogLevel(log.level)}
        </span>
        <span className="log-source">{formatLogSource(log.source)}</span>
        <span className="log-time">{formatTimestamp(log.timestampIso)}</span>
      </div>
      <p className="log-message">{log.message}</p>
    </div>
  )
}

