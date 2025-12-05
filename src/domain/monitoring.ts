/**
 * Modèle du monitoring TomTom
 * Routes de monitoring créées par l'admin et snapshots de trafic
 */

/**
 * Route de monitoring TomTom
 * Créée par l'administrateur chez TomTom
 * Contraintes : max ~200km, max ~800 routes au total
 */
export interface MonitoringRoute {
  id: string;               // id interne appli
  tomtomRouteId: string;    // id côté TomTom
  name: string;
  axisCode: string;
  fromNodeId: string;
  toNodeId: string;
  lengthKm: number;
  isActive: boolean;
}

/**
 * Snapshot de trafic pour une route de monitoring
 * Données retournées par l'API TomTom à un instant T
 */
export interface MonitoringSnapshot {
  id: string;
  monitoringRouteId: string;
  timestampIso: string;
  averageSpeedKmh: number;
  freeFlowSpeedKmh: number;
  travelTimeSeconds: number;
  freeFlowTravelTimeSeconds: number;
  delaySeconds: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le temps perdu en minutes à partir d'un snapshot
 */
export function computeDelayMinutes(snapshot: MonitoringSnapshot): number {
  return Math.round(snapshot.delaySeconds / 60);
}

/**
 * Calcule le ratio de vitesse actuelle / vitesse fluide (en %)
 */
export function computeSpeedRatio(snapshot: MonitoringSnapshot): number {
  if (snapshot.freeFlowSpeedKmh === 0) return 0;
  return Math.round((snapshot.averageSpeedKmh / snapshot.freeFlowSpeedKmh) * 100);
}

/**
 * Détermine si le trafic est fluide (vitesse >= 80% de la vitesse libre)
 */
export function isTrafficFlowing(snapshot: MonitoringSnapshot): boolean {
  return computeSpeedRatio(snapshot) >= 80;
}

/**
 * Détermine si le trafic est congestionné (vitesse < 50% de la vitesse libre)
 */
export function isTrafficCongested(snapshot: MonitoringSnapshot): boolean {
  return computeSpeedRatio(snapshot) < 50;
}

/**
 * Calcule la moyenne des retards sur plusieurs snapshots
 */
export function computeAverageDelay(snapshots: MonitoringSnapshot[]): number {
  if (snapshots.length === 0) return 0;
  const totalDelay = snapshots.reduce((acc, s) => acc + s.delaySeconds, 0);
  return Math.round(totalDelay / snapshots.length / 60);
}

/**
 * Récupère les routes de monitoring actives
 */
export function getActiveMonitoringRoutes(
  routes: MonitoringRoute[]
): MonitoringRoute[] {
  return routes.filter((route) => route.isActive);
}

/**
 * Récupère les snapshots pour une route donnée
 */
export function getSnapshotsForRoute(
  allSnapshots: MonitoringSnapshot[],
  routeId: string
): MonitoringSnapshot[] {
  return allSnapshots.filter((s) => s.monitoringRouteId === routeId);
}

/**
 * Formate la durée en format lisible (ex: "5 min", "1h 23 min")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes} min`;
}

