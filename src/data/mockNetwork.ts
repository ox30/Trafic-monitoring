/**
 * Données mock pour le réseau routier national suisse
 */

import {
  NetworkNode,
  GlobalSegment,
  FineSegment,
} from "../domain/network";

// ─────────────────────────────────────────────────────────────────────────────
// Nœuds du réseau (jonctions, échangeurs, rampes)
// ─────────────────────────────────────────────────────────────────────────────

export const mockNetworkNodes: NetworkNode[] = [
  // A1 - Axe Genève - Lausanne - Berne
  {
    id: "J-GE-AIRPORT",
    type: "JUNCTION",
    name: "Genève Aéroport",
    axisCode: "A1",
    lat: 46.2380,
    lon: 6.1092,
  },
  {
    id: "J-NYON",
    type: "JUNCTION",
    name: "Nyon",
    axisCode: "A1",
    lat: 46.3833,
    lon: 6.2333,
  },
  {
    id: "J-MORGES",
    type: "INTERCHANGE",
    name: "Échangeur Morges",
    axisCode: "A1",
    lat: 46.5167,
    lon: 6.5000,
  },
  {
    id: "J-LAUSANNE-CRISSIER",
    type: "INTERCHANGE",
    name: "Échangeur Crissier",
    axisCode: "A1",
    lat: 46.5450,
    lon: 6.5750,
  },
  {
    id: "R-MORGES-ENTRY",
    type: "RAMP_ENTRY",
    name: "Entrée Morges",
    axisCode: "A1",
    lat: 46.5150,
    lon: 6.4950,
  },
  {
    id: "R-MORGES-EXIT",
    type: "RAMP_EXIT",
    name: "Sortie Morges",
    axisCode: "A1",
    lat: 46.5160,
    lon: 6.4980,
  },
  // A9 - Lausanne - Simplon
  {
    id: "J-VEVEY",
    type: "JUNCTION",
    name: "Vevey",
    axisCode: "A9",
    lat: 46.4628,
    lon: 6.8428,
  },
  {
    id: "J-MONTREUX",
    type: "JUNCTION",
    name: "Montreux",
    axisCode: "A9",
    lat: 46.4312,
    lon: 6.9106,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Segments globaux (jonction à jonction)
// ─────────────────────────────────────────────────────────────────────────────

export const mockGlobalSegments: GlobalSegment[] = [
  {
    id: "A1-GE-NYON-PLUS",
    axisCode: "A1",
    fromNodeId: "J-GE-AIRPORT",
    toNodeId: "J-NYON",
    direction: "PLUS",
    lengthKm: 22.5,
    description: "A1 Genève Aéroport → Nyon (direction Lausanne)",
  },
  {
    id: "A1-NYON-MORGES-PLUS",
    axisCode: "A1",
    fromNodeId: "J-NYON",
    toNodeId: "J-MORGES",
    direction: "PLUS",
    lengthKm: 28.0,
    description: "A1 Nyon → Morges (direction Lausanne)",
  },
  {
    id: "A1-MORGES-CRISSIER-PLUS",
    axisCode: "A1",
    fromNodeId: "J-MORGES",
    toNodeId: "J-LAUSANNE-CRISSIER",
    direction: "PLUS",
    lengthKm: 12.5,
    description: "A1 Morges → Crissier (direction Lausanne)",
  },
  {
    id: "A1-MORGES-NYON-MINUS",
    axisCode: "A1",
    fromNodeId: "J-MORGES",
    toNodeId: "J-NYON",
    direction: "MINUS",
    lengthKm: 28.0,
    description: "A1 Morges → Nyon (direction Genève)",
  },
  {
    id: "A9-VEVEY-MONTREUX-PLUS",
    axisCode: "A9",
    fromNodeId: "J-VEVEY",
    toNodeId: "J-MONTREUX",
    direction: "PLUS",
    lengthKm: 8.5,
    description: "A9 Vevey → Montreux (direction Simplon)",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Segments fins (découpage détaillé)
// ─────────────────────────────────────────────────────────────────────────────

export const mockFineSegments: FineSegment[] = [
  // Découpage de A1-GE-NYON-PLUS
  {
    id: "A1-GE-NYON-PLUS-1",
    globalSegmentId: "A1-GE-NYON-PLUS",
    fromNodeId: "J-GE-AIRPORT",
    toNodeId: "J-NYON",
    lengthKm: 22.5,
    isRamp: false,
    description: "Segment principal Genève Aéroport → Nyon",
  },
  // Découpage de A1-NYON-MORGES-PLUS avec rampes
  {
    id: "A1-NYON-MORGES-PLUS-1",
    globalSegmentId: "A1-NYON-MORGES-PLUS",
    fromNodeId: "J-NYON",
    toNodeId: "R-MORGES-ENTRY",
    lengthKm: 25.0,
    isRamp: false,
    description: "Nyon → Approche Morges",
  },
  {
    id: "A1-NYON-MORGES-PLUS-RAMP-ENTRY",
    globalSegmentId: "A1-NYON-MORGES-PLUS",
    fromNodeId: "R-MORGES-ENTRY",
    toNodeId: "J-MORGES",
    lengthKm: 1.5,
    isRamp: true,
    description: "Entrée Morges (rampe)",
  },
  {
    id: "A1-NYON-MORGES-PLUS-RAMP-EXIT",
    globalSegmentId: "A1-NYON-MORGES-PLUS",
    fromNodeId: "R-MORGES-EXIT",
    toNodeId: "J-MORGES",
    lengthKm: 1.5,
    isRamp: true,
    description: "Sortie Morges (rampe)",
  },
  // Découpage de A1-MORGES-CRISSIER-PLUS
  {
    id: "A1-MORGES-CRISSIER-PLUS-1",
    globalSegmentId: "A1-MORGES-CRISSIER-PLUS",
    fromNodeId: "J-MORGES",
    toNodeId: "J-LAUSANNE-CRISSIER",
    lengthKm: 12.5,
    isRamp: false,
    description: "Morges → Crissier",
  },
  // Découpage de A9-VEVEY-MONTREUX-PLUS
  {
    id: "A9-VEVEY-MONTREUX-PLUS-1",
    globalSegmentId: "A9-VEVEY-MONTREUX-PLUS",
    fromNodeId: "J-VEVEY",
    toNodeId: "J-MONTREUX",
    lengthKm: 8.5,
    isRamp: false,
    description: "Vevey → Montreux",
  },
  // Découpage de A1-MORGES-NYON-MINUS
  {
    id: "A1-MORGES-NYON-MINUS-1",
    globalSegmentId: "A1-MORGES-NYON-MINUS",
    fromNodeId: "J-MORGES",
    toNodeId: "J-NYON",
    lengthKm: 28.0,
    isRamp: false,
    description: "Morges → Nyon (direction Genève)",
  },
];

