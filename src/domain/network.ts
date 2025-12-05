/**
 * Modèle du réseau routier national suisse
 * Distinction entre couche globale (jonction à jonction) et couche fine (segments détaillés)
 */

export type Direction = "PLUS" | "MINUS";

export type NodeType = 
  | "JUNCTION" 
  | "INTERCHANGE" 
  | "RAMP_ENTRY" 
  | "RAMP_EXIT" 
  | "SERVICE_AREA";

/**
 * Nœud du réseau (jonction, échangeur, rampe, aire de service)
 */
export interface NetworkNode {
  id: string;              // ex: "J12", "R12B"
  type: NodeType;
  name: string;
  axisCode: string;        // ex: "A1"
  lat: number;
  lon: number;
}

/**
 * Segment global : entre deux nœuds principaux (jonction à jonction)
 * Utilisé pour la vue d'ensemble du réseau
 */
export interface GlobalSegment {
  id: string;              // ex: "A1-J12-J15-PLUS"
  axisCode: string;        // ex: "A1"
  fromNodeId: string;      // NetworkNode.id
  toNodeId: string;        // NetworkNode.id
  direction: Direction;
  lengthKm: number;
  description: string;
}

/**
 * Segment fin : découpage détaillé d'un segment global
 * Inclut les rampes, entrées, sorties
 */
export interface FineSegment {
  id: string;                // ex: "A1-J12-R12B-J13-PLUS"
  globalSegmentId: string;   // GlobalSegment.id
  fromNodeId: string;        // NetworkNode.id
  toNodeId: string;          // NetworkNode.id
  lengthKm: number;
  isRamp: boolean;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère tous les segments fins appartenant à un segment global
 */
export function getFineSegmentsForGlobal(
  allFine: FineSegment[],
  globalSegmentId: string
): FineSegment[] {
  return allFine.filter((seg) => seg.globalSegmentId === globalSegmentId);
}

/**
 * Récupère un nœud par son ID
 */
export function getNodeById(
  allNodes: NetworkNode[],
  nodeId: string
): NetworkNode | undefined {
  return allNodes.find((node) => node.id === nodeId);
}

/**
 * Récupère tous les segments globaux d'un axe donné
 */
export function getGlobalSegmentsByAxis(
  allGlobal: GlobalSegment[],
  axisCode: string
): GlobalSegment[] {
  return allGlobal.filter((seg) => seg.axisCode === axisCode);
}

/**
 * Calcule la longueur totale d'une liste de segments
 */
export function computeTotalLength(segments: { lengthKm: number }[]): number {
  return segments.reduce((acc, seg) => acc + seg.lengthKm, 0);
}

/**
 * Formate la direction pour l'affichage
 */
export function formatDirection(direction: Direction): string {
  return direction === "PLUS" ? "+" : "−";
}

/**
 * Formate le type de nœud pour l'affichage
 */
export function formatNodeType(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    JUNCTION: "Jonction",
    INTERCHANGE: "Échangeur",
    RAMP_ENTRY: "Entrée",
    RAMP_EXIT: "Sortie",
    SERVICE_AREA: "Aire de service",
  };
  return labels[type];
}

