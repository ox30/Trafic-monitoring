/**
 * Modèle des événements trafic
 * Cycle de vie : détection → confirmation → actif → dégradation → clôture
 */

import { MonitoringSnapshot } from "./monitoring";

/**
 * États du cycle de vie d'un événement trafic
 */
export type TrafficEventState =
  | "DETECTED"    // Première détection, en attente de confirmation
  | "CONFIRMED"   // Confirmé par le système ou l'opérateur
  | "ACTIVE"      // Événement actif, potentiellement avec déviation
  | "DEGRADING"   // Situation en amélioration
  | "CLOSED";     // Événement terminé

/**
 * Niveaux de sévérité d'un événement
 */
export type TrafficSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Événement trafic
 */
export interface TrafficEvent {
  id: string;
  globalSegmentId: string;
  title: string;
  description: string;
  state: TrafficEventState;
  severity: TrafficSeverity;
  estimatedDelayMinutes: number;
  firstDetectedAt: string;      // ISO 8601
  lastUpdatedAt: string;        // ISO 8601
  relatedMonitoringRouteIds: string[];
  currentDeviationPlanId?: string;
}

/**
 * Seuils pour le calcul de sévérité
 */
export interface SeverityThresholds {
  low: number;      // retard en minutes pour LOW
  medium: number;   // retard en minutes pour MEDIUM
  high: number;     // retard en minutes pour HIGH
  // Au-delà de high → CRITICAL
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule la sévérité à partir de snapshots de monitoring
 * Basé sur le retard moyen observé
 */
export function computeSeverityFromSnapshots(
  snapshots: MonitoringSnapshot[],
  thresholds: SeverityThresholds
): TrafficSeverity {
  if (snapshots.length === 0) return "LOW";

  // Calcul du retard moyen en minutes
  const averageDelaySeconds =
    snapshots.reduce((acc, s) => acc + s.delaySeconds, 0) / snapshots.length;
  const averageDelayMinutes = averageDelaySeconds / 60;

  if (averageDelayMinutes >= thresholds.high) {
    return "CRITICAL";
  } else if (averageDelayMinutes >= thresholds.medium) {
    return "HIGH";
  } else if (averageDelayMinutes >= thresholds.low) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * Calcule la sévérité à partir d'un retard en minutes
 */
export function computeSeverityFromDelay(
  delayMinutes: number,
  thresholds: SeverityThresholds = { low: 5, medium: 15, high: 30 }
): TrafficSeverity {
  if (delayMinutes >= thresholds.high) return "CRITICAL";
  if (delayMinutes >= thresholds.medium) return "HIGH";
  if (delayMinutes >= thresholds.low) return "MEDIUM";
  return "LOW";
}

/**
 * Formate l'état pour l'affichage
 */
export function formatEventState(state: TrafficEventState): string {
  const labels: Record<TrafficEventState, string> = {
    DETECTED: "Détecté",
    CONFIRMED: "Confirmé",
    ACTIVE: "Actif",
    DEGRADING: "En amélioration",
    CLOSED: "Clôturé",
  };
  return labels[state];
}

/**
 * Formate la sévérité pour l'affichage
 */
export function formatSeverity(severity: TrafficSeverity): string {
  const labels: Record<TrafficSeverity, string> = {
    LOW: "Faible",
    MEDIUM: "Moyen",
    HIGH: "Élevé",
    CRITICAL: "Critique",
  };
  return labels[severity];
}

/**
 * Retourne la couleur associée à une sévérité
 */
export function getSeverityColor(severity: TrafficSeverity): string {
  const colors: Record<TrafficSeverity, string> = {
    LOW: "#22c55e",       // vert
    MEDIUM: "#eab308",    // jaune
    HIGH: "#f97316",      // orange
    CRITICAL: "#ef4444",  // rouge
  };
  return colors[severity];
}

/**
 * Retourne la couleur associée à un état
 */
export function getStateColor(state: TrafficEventState): string {
  const colors: Record<TrafficEventState, string> = {
    DETECTED: "#3b82f6",  // bleu
    CONFIRMED: "#8b5cf6", // violet
    ACTIVE: "#ef4444",    // rouge
    DEGRADING: "#f97316", // orange
    CLOSED: "#6b7280",    // gris
  };
  return colors[state];
}

/**
 * Trie les événements par sévérité (critique en premier)
 */
export function sortEventsBySeverity(events: TrafficEvent[]): TrafficEvent[] {
  const order: Record<TrafficSeverity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  return [...events].sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Filtre les événements actifs (non clôturés)
 */
export function getActiveEvents(events: TrafficEvent[]): TrafficEvent[] {
  return events.filter((e) => e.state !== "CLOSED");
}

