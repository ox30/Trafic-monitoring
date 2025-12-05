/**
 * Modèle des journaux
 * Journal système (algorithme) et journal utilisateur (actions opérateur)
 */

/**
 * Source du log
 */
export type LogSource = "SYSTEM" | "OPERATOR";

/**
 * Niveau de log
 */
export type LogLevel = "INFO" | "WARNING" | "ERROR" | "DEBUG";

/**
 * Entrée de journal
 */
export interface LogEntry {
  id: string;
  timestampIso: string;
  source: LogSource;
  level: LogLevel;
  message: string;
  relatedEventId?: string;
  operatorId?: string;
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtre les logs par source
 */
export function filterLogsBySource(
  logs: LogEntry[],
  source: LogSource
): LogEntry[] {
  return logs.filter((log) => log.source === source);
}

/**
 * Filtre les logs par niveau
 */
export function filterLogsByLevel(
  logs: LogEntry[],
  level: LogLevel
): LogEntry[] {
  return logs.filter((log) => log.level === level);
}

/**
 * Récupère les logs liés à un événement
 */
export function getLogsForEvent(
  logs: LogEntry[],
  eventId: string
): LogEntry[] {
  return logs.filter((log) => log.relatedEventId === eventId);
}

/**
 * Récupère les logs d'un opérateur
 */
export function getLogsForOperator(
  logs: LogEntry[],
  operatorId: string
): LogEntry[] {
  return logs.filter((log) => log.operatorId === operatorId);
}

/**
 * Trie les logs par date (plus récent en premier)
 */
export function sortLogsByDate(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort(
    (a, b) =>
      new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  );
}

/**
 * Formate la source pour l'affichage
 */
export function formatLogSource(source: LogSource): string {
  return source === "SYSTEM" ? "Système" : "Opérateur";
}

/**
 * Formate le niveau pour l'affichage
 */
export function formatLogLevel(level: LogLevel): string {
  const labels: Record<LogLevel, string> = {
    INFO: "Info",
    WARNING: "Attention",
    ERROR: "Erreur",
    DEBUG: "Debug",
  };
  return labels[level];
}

/**
 * Retourne la couleur associée à un niveau de log
 */
export function getLogLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    INFO: "#3b82f6",     // bleu
    WARNING: "#eab308",  // jaune
    ERROR: "#ef4444",    // rouge
    DEBUG: "#6b7280",    // gris
  };
  return colors[level];
}

/**
 * Formate un timestamp ISO en format lisible
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

