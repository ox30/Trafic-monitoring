/**
 * Données mock pour les opérateurs et leurs zones
 */

import { Operator, OperatorArea, OperatorSession } from "../domain/operators";

// ─────────────────────────────────────────────────────────────────────────────
// Zones opérateur
// ─────────────────────────────────────────────────────────────────────────────

export const mockOperatorAreas: OperatorArea[] = [
  {
    id: "AREA-OUEST",
    name: "Suisse Romande Ouest",
    axisCodes: ["A1", "A9", "A12"],
    bbox: [5.9, 46.1, 7.0, 46.9], // Région Genève-Lausanne
  },
  {
    id: "AREA-EST",
    name: "Suisse Romande Est",
    axisCodes: ["A9", "A12", "A1"],
    bbox: [6.8, 46.0, 7.5, 47.0], // Région Valais-Fribourg
  },
  {
    id: "AREA-BERNE",
    name: "Région Berne",
    axisCodes: ["A1", "A6", "A12"],
    bbox: [7.0, 46.7, 8.0, 47.2], // Région Berne
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Opérateurs
// ─────────────────────────────────────────────────────────────────────────────

const now = new Date();
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

export const mockOperators: Operator[] = [
  {
    id: "OP-001",
    name: "Jean Dupont",
    areaIds: ["AREA-OUEST"],
    email: "jean.dupont@ofrou.admin.ch",
    isOnline: true,
    lastActiveAt: now.toISOString(),
  },
  {
    id: "OP-002",
    name: "Marie Favre",
    areaIds: ["AREA-EST", "AREA-BERNE"],
    email: "marie.favre@ofrou.admin.ch",
    isOnline: true,
    lastActiveAt: fiveMinutesAgo.toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sessions opérateur
// ─────────────────────────────────────────────────────────────────────────────

const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

export const mockOperatorSessions: OperatorSession[] = [
  {
    id: "SESSION-001",
    operatorId: "OP-001",
    startedAt: twoHoursAgo.toISOString(),
    lastActivityAt: now.toISOString(),
    activeEventIds: ["EVT-001", "EVT-002"],
  },
  {
    id: "SESSION-002",
    operatorId: "OP-002",
    startedAt: twoHoursAgo.toISOString(),
    lastActivityAt: fiveMinutesAgo.toISOString(),
    activeEventIds: ["EVT-001"],
  },
];

