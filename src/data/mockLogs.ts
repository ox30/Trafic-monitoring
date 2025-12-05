/**
 * Données mock pour les journaux (système et opérateur)
 */

import { LogEntry } from "../domain/logs";

const now = new Date();
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
const fortyMinutesAgo = new Date(now.getTime() - 40 * 60 * 1000);
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

export const mockLogs: LogEntry[] = [
  // Logs système pour EVT-001
  {
    id: "LOG-001",
    timestampIso: oneHourAgo.toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Ralentissement détecté sur A1-MORGES-CRISSIER-PLUS. Vitesse moyenne: 45 km/h",
    relatedEventId: "EVT-001",
  },
  {
    id: "LOG-002",
    timestampIso: new Date(oneHourAgo.getTime() + 5 * 60 * 1000).toISOString(),
    source: "SYSTEM",
    level: "WARNING",
    message: "Événement EVT-001 créé. Sévérité initiale: HIGH",
    relatedEventId: "EVT-001",
  },
  {
    id: "LOG-003",
    timestampIso: new Date(oneHourAgo.getTime() + 8 * 60 * 1000).toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Événement EVT-001 confirmé automatiquement après 3 snapshots consécutifs.",
    relatedEventId: "EVT-001",
  },
  {
    id: "LOG-004",
    timestampIso: fortyMinutesAgo.toISOString(),
    source: "OPERATOR",
    level: "INFO",
    message: "Activation du plan de déviation DEV-A1-MORGES-LAUSANNE",
    relatedEventId: "EVT-001",
    operatorId: "OP-001",
  },
  {
    id: "LOG-005",
    timestampIso: new Date(fortyMinutesAgo.getTime() + 2 * 60 * 1000).toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Plan DEV-A1-MORGES-LAUSANNE activé. PMV mis à jour.",
    relatedEventId: "EVT-001",
  },
  {
    id: "LOG-006",
    timestampIso: twentyMinutesAgo.toISOString(),
    source: "SYSTEM",
    level: "ERROR",
    message: "Sévérité EVT-001 augmentée à CRITICAL. Vitesse: 20 km/h, Retard: 31 min",
    relatedEventId: "EVT-001",
  },
  {
    id: "LOG-007",
    timestampIso: tenMinutesAgo.toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Amélioration détectée sur EVT-001. Vitesse: 25 km/h (+5 km/h)",
    relatedEventId: "EVT-001",
  },

  // Logs système pour EVT-002
  {
    id: "LOG-008",
    timestampIso: thirtyMinutesAgo.toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Ralentissement détecté sur A1-NYON-MORGES-PLUS (queue de bouchon EVT-001)",
    relatedEventId: "EVT-002",
  },
  {
    id: "LOG-009",
    timestampIso: new Date(thirtyMinutesAgo.getTime() + 3 * 60 * 1000).toISOString(),
    source: "SYSTEM",
    level: "WARNING",
    message: "Événement EVT-002 créé. Lié à EVT-001 (propagation amont)",
    relatedEventId: "EVT-002",
  },
  {
    id: "LOG-010",
    timestampIso: fiveMinutesAgo.toISOString(),
    source: "OPERATOR",
    level: "INFO",
    message: "Événement EVT-002 confirmé manuellement par l'opérateur",
    relatedEventId: "EVT-002",
    operatorId: "OP-001",
  },

  // Logs pour EVT-003 (événement clôturé)
  {
    id: "LOG-011",
    timestampIso: twoHoursAgo.toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Ralentissement détecté sur A9-VEVEY-MONTREUX-PLUS. Véhicule en panne signalé.",
    relatedEventId: "EVT-003",
  },
  {
    id: "LOG-012",
    timestampIso: new Date(twoHoursAgo.getTime() + 30 * 60 * 1000).toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Véhicule évacué. Circulation en cours de normalisation.",
    relatedEventId: "EVT-003",
  },
  {
    id: "LOG-013",
    timestampIso: thirtyMinutesAgo.toISOString(),
    source: "SYSTEM",
    level: "INFO",
    message: "Événement EVT-003 clôturé automatiquement. Trafic fluide.",
    relatedEventId: "EVT-003",
  },

  // Logs système généraux
  {
    id: "LOG-014",
    timestampIso: now.toISOString(),
    source: "SYSTEM",
    level: "DEBUG",
    message: "Cycle de monitoring terminé. 4 routes analysées, 2 événements actifs.",
  },
];

