/**
 * Modèle des plans de déviation
 * Plans pré-établis pour le management du trafic
 */

/**
 * Plan de déviation pré-établi
 * Contient les tronçons concernés et les actions à déclencher
 */
export interface DeviationPlan {
  id: string;
  name: string;
  description: string;
  affectedAxisCode: string;
  mainRouteGlobalSegmentIds: string[];    // tronçons de l'itinéraire normal
  deviationGlobalSegmentIds: string[];    // tronçons de la déviation
  pmvTemplateIds: string[];               // IDs des templates PMV à afficher
  messageTemplates: string[];             // textes d'annonce trafic
}

/**
 * État d'activation d'un plan de déviation
 */
export type DeviationActivationState = 
  | "INACTIVE"    // Plan non activé
  | "PENDING"     // Activation demandée, en attente de confirmation
  | "ACTIVE"      // Plan activé
  | "DEACTIVATING"; // Désactivation en cours

/**
 * Instance d'activation d'un plan de déviation
 */
export interface DeviationActivation {
  id: string;
  planId: string;
  state: DeviationActivationState;
  activatedAt?: string;       // ISO 8601
  activatedByOperatorId?: string;
  deactivatedAt?: string;     // ISO 8601
  deactivatedByOperatorId?: string;
  relatedEventId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère un plan par son ID
 */
export function getDeviationPlanById(
  plans: DeviationPlan[],
  planId: string
): DeviationPlan | undefined {
  return plans.find((p) => p.id === planId);
}

/**
 * Récupère les plans affectant un axe donné
 */
export function getDeviationPlansByAxis(
  plans: DeviationPlan[],
  axisCode: string
): DeviationPlan[] {
  return plans.filter((p) => p.affectedAxisCode === axisCode);
}

/**
 * Récupère les plans qui couvrent un segment global
 */
export function getDeviationPlansForSegment(
  plans: DeviationPlan[],
  globalSegmentId: string
): DeviationPlan[] {
  return plans.filter((p) =>
    p.mainRouteGlobalSegmentIds.includes(globalSegmentId)
  );
}

/**
 * Formate l'état d'activation pour l'affichage
 */
export function formatActivationState(state: DeviationActivationState): string {
  const labels: Record<DeviationActivationState, string> = {
    INACTIVE: "Inactif",
    PENDING: "En attente",
    ACTIVE: "Actif",
    DEACTIVATING: "Désactivation en cours",
  };
  return labels[state];
}

/**
 * Vérifie si un plan est actuellement activé
 */
export function isPlanActive(
  activations: DeviationActivation[],
  planId: string
): boolean {
  return activations.some(
    (a) => a.planId === planId && a.state === "ACTIVE"
  );
}

