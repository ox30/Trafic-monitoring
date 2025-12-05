/**
 * Données mock pour les événements trafic
 */

import { TrafficEvent } from "../domain/events";

const now = new Date();
const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

export const mockTrafficEvents: TrafficEvent[] = [
  {
    id: "EVT-001",
    globalSegmentId: "A1-MORGES-CRISSIER-PLUS",
    title: "Bouchon A1 Morges → Crissier",
    description:
      "Ralentissement important suite à un accident. Bouchon de 6 km. Temps de parcours multiplié par 5.",
    state: "ACTIVE",
    severity: "CRITICAL",
    estimatedDelayMinutes: 25,
    firstDetectedAt: oneHourAgo.toISOString(),
    lastUpdatedAt: now.toISOString(),
    relatedMonitoringRouteIds: ["MR-A1-MORGES-CRISSIER"],
    currentDeviationPlanId: "DEV-A1-MORGES-LAUSANNE",
  },
  {
    id: "EVT-002",
    globalSegmentId: "A1-NYON-MORGES-PLUS",
    title: "Ralentissement A1 Nyon → Morges",
    description:
      "Trafic dense en amont du bouchon de Morges-Crissier. Queue de bouchon.",
    state: "CONFIRMED",
    severity: "MEDIUM",
    estimatedDelayMinutes: 10,
    firstDetectedAt: thirtyMinutesAgo.toISOString(),
    lastUpdatedAt: now.toISOString(),
    relatedMonitoringRouteIds: ["MR-A1-NYON-MORGES"],
    currentDeviationPlanId: undefined,
  },
  {
    id: "EVT-003",
    globalSegmentId: "A9-VEVEY-MONTREUX-PLUS",
    title: "Incident résolu A9 Vevey → Montreux",
    description:
      "Véhicule en panne évacué. Circulation revenue à la normale.",
    state: "CLOSED",
    severity: "LOW",
    estimatedDelayMinutes: 0,
    firstDetectedAt: twoHoursAgo.toISOString(),
    lastUpdatedAt: thirtyMinutesAgo.toISOString(),
    relatedMonitoringRouteIds: ["MR-A9-VEVEY-MONTREUX"],
    currentDeviationPlanId: undefined,
  },
];

