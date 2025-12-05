/**
 * Modèle des opérateurs et de leurs périmètres
 * Multi-opérateurs travaillant en parallèle sur des zones géographiques
 */

/**
 * Zone géographique de responsabilité d'un opérateur
 */
export interface OperatorArea {
  id: string;
  name: string;
  axisCodes: string[];      // ex: ["A1", "A2"]
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

/**
 * Opérateur du système
 */
export interface Operator {
  id: string;
  name: string;
  areaIds: string[];
  email?: string;
  isOnline?: boolean;
  lastActiveAt?: string;    // ISO 8601
}

/**
 * Session opérateur active
 */
export interface OperatorSession {
  id: string;
  operatorId: string;
  startedAt: string;        // ISO 8601
  lastActivityAt: string;   // ISO 8601
  activeEventIds: string[]; // événements actuellement suivis par l'opérateur
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère un opérateur par son ID
 */
export function getOperatorById(
  operators: Operator[],
  operatorId: string
): Operator | undefined {
  return operators.find((op) => op.id === operatorId);
}

/**
 * Récupère les zones d'un opérateur
 */
export function getOperatorAreas(
  operator: Operator,
  allAreas: OperatorArea[]
): OperatorArea[] {
  return allAreas.filter((area) => operator.areaIds.includes(area.id));
}

/**
 * Vérifie si un opérateur couvre un axe donné
 */
export function operatorCoversAxis(
  operator: Operator,
  allAreas: OperatorArea[],
  axisCode: string
): boolean {
  const areas = getOperatorAreas(operator, allAreas);
  return areas.some((area) => area.axisCodes.includes(axisCode));
}

/**
 * Récupère tous les axes couverts par un opérateur
 */
export function getOperatorAxes(
  operator: Operator,
  allAreas: OperatorArea[]
): string[] {
  const areas = getOperatorAreas(operator, allAreas);
  const axesSet = new Set<string>();
  areas.forEach((area) => {
    area.axisCodes.forEach((axis) => axesSet.add(axis));
  });
  return Array.from(axesSet);
}

/**
 * Récupère les opérateurs en ligne
 */
export function getOnlineOperators(operators: Operator[]): Operator[] {
  return operators.filter((op) => op.isOnline);
}

/**
 * Récupère les opérateurs couvrant un segment global
 */
export function getOperatorsForSegment(
  operators: Operator[],
  allAreas: OperatorArea[],
  axisCode: string
): Operator[] {
  return operators.filter((op) => operatorCoversAxis(op, allAreas, axisCode));
}

