/**
 * Données mock pour les routes de monitoring TomTom
 */

import { MonitoringRoute, MonitoringSnapshot } from "../domain/monitoring";

// ─────────────────────────────────────────────────────────────────────────────
// Routes de monitoring TomTom
// ─────────────────────────────────────────────────────────────────────────────

export const mockMonitoringRoutes: MonitoringRoute[] = [
  {
    id: "MR-A1-GE-NYON",
    tomtomRouteId: "tt-ch-a1-001",
    name: "A1 Genève Aéroport → Nyon",
    axisCode: "A1",
    fromNodeId: "J-GE-AIRPORT",
    toNodeId: "J-NYON",
    lengthKm: 22.5,
    isActive: true,
  },
  {
    id: "MR-A1-NYON-MORGES",
    tomtomRouteId: "tt-ch-a1-002",
    name: "A1 Nyon → Morges",
    axisCode: "A1",
    fromNodeId: "J-NYON",
    toNodeId: "J-MORGES",
    lengthKm: 28.0,
    isActive: true,
  },
  {
    id: "MR-A1-MORGES-CRISSIER",
    tomtomRouteId: "tt-ch-a1-003",
    name: "A1 Morges → Crissier",
    axisCode: "A1",
    fromNodeId: "J-MORGES",
    toNodeId: "J-LAUSANNE-CRISSIER",
    lengthKm: 12.5,
    isActive: true,
  },
  {
    id: "MR-A9-VEVEY-MONTREUX",
    tomtomRouteId: "tt-ch-a9-001",
    name: "A9 Vevey → Montreux",
    axisCode: "A9",
    fromNodeId: "J-VEVEY",
    toNodeId: "J-MONTREUX",
    lengthKm: 8.5,
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Snapshots de monitoring (données simulées à un instant T)
// ─────────────────────────────────────────────────────────────────────────────

const now = new Date();
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

export const mockMonitoringSnapshots: MonitoringSnapshot[] = [
  // Route A1 Genève-Nyon : trafic fluide
  {
    id: "snap-001",
    monitoringRouteId: "MR-A1-GE-NYON",
    timestampIso: now.toISOString(),
    averageSpeedKmh: 115,
    freeFlowSpeedKmh: 120,
    travelTimeSeconds: 702,  // ~11.7 min pour 22.5 km à 115 km/h
    freeFlowTravelTimeSeconds: 675,
    delaySeconds: 27,
  },
  // Route A1 Nyon-Morges : ralentissement modéré
  {
    id: "snap-002",
    monitoringRouteId: "MR-A1-NYON-MORGES",
    timestampIso: now.toISOString(),
    averageSpeedKmh: 75,
    freeFlowSpeedKmh: 120,
    travelTimeSeconds: 1344,  // ~22.4 min pour 28 km à 75 km/h
    freeFlowTravelTimeSeconds: 840,
    delaySeconds: 504,  // ~8.4 min de retard
  },
  {
    id: "snap-002b",
    monitoringRouteId: "MR-A1-NYON-MORGES",
    timestampIso: fiveMinutesAgo.toISOString(),
    averageSpeedKmh: 68,
    freeFlowSpeedKmh: 120,
    travelTimeSeconds: 1482,
    freeFlowTravelTimeSeconds: 840,
    delaySeconds: 642,  // ~10.7 min de retard
  },
  // Route A1 Morges-Crissier : bouchon important
  {
    id: "snap-003",
    monitoringRouteId: "MR-A1-MORGES-CRISSIER",
    timestampIso: now.toISOString(),
    averageSpeedKmh: 25,
    freeFlowSpeedKmh: 120,
    travelTimeSeconds: 1800,  // 30 min pour 12.5 km à 25 km/h
    freeFlowTravelTimeSeconds: 375,
    delaySeconds: 1425,  // ~23.75 min de retard
  },
  {
    id: "snap-003b",
    monitoringRouteId: "MR-A1-MORGES-CRISSIER",
    timestampIso: fiveMinutesAgo.toISOString(),
    averageSpeedKmh: 20,
    freeFlowSpeedKmh: 120,
    travelTimeSeconds: 2250,
    freeFlowTravelTimeSeconds: 375,
    delaySeconds: 1875,  // ~31 min de retard
  },
  {
    id: "snap-003c",
    monitoringRouteId: "MR-A1-MORGES-CRISSIER",
    timestampIso: tenMinutesAgo.toISOString(),
    averageSpeedKmh: 18,
    freeFlowSpeedKmh: 120,
    travelTimeSeconds: 2500,
    freeFlowTravelTimeSeconds: 375,
    delaySeconds: 2125,  // ~35 min de retard
  },
  // Route A9 Vevey-Montreux : trafic fluide
  {
    id: "snap-004",
    monitoringRouteId: "MR-A9-VEVEY-MONTREUX",
    timestampIso: now.toISOString(),
    averageSpeedKmh: 110,
    freeFlowSpeedKmh: 120,
    travelTimeSeconds: 278,
    freeFlowTravelTimeSeconds: 255,
    delaySeconds: 23,
  },
];

