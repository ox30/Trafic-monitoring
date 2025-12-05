/**
 * Données mock pour les plans de déviation
 */

import { DeviationPlan, DeviationActivation } from "../domain/deviations";

export const mockDeviationPlans: DeviationPlan[] = [
  {
    id: "DEV-A1-MORGES-LAUSANNE",
    name: "Déviation A1 Morges-Lausanne via Route de Berne",
    description:
      "Plan de déviation pour le trafic A1 entre Morges et Lausanne. " +
      "Dévie le trafic via la sortie Morges-Ouest, Route de Berne, " +
      "et réinjection à Crissier-Est.",
    affectedAxisCode: "A1",
    mainRouteGlobalSegmentIds: [
      "A1-MORGES-CRISSIER-PLUS",
    ],
    deviationGlobalSegmentIds: [
      // Ces IDs seraient des segments de routes cantonales/nationales
      // Pour le mock, on utilise des IDs fictifs
      "RC-MORGES-BERNE-1",
      "RC-BERNE-CRISSIER-1",
    ],
    pmvTemplateIds: [
      "PMV-A1-MORGES-001",
      "PMV-A1-AUBONNE-001",
      "PMV-A1-NYON-001",
    ],
    messageTemplates: [
      "A1 Morges → Lausanne : Bouchon {delay} min. Déviation conseillée via sortie Morges-Ouest.",
      "A1 direction Lausanne : Accident entre Morges et Crissier. Prenez la sortie Morges-Ouest.",
    ],
  },
  {
    id: "DEV-A1-LAUSANNE-MORGES",
    name: "Déviation A1 Lausanne-Morges via Renens",
    description:
      "Plan de déviation pour le trafic A1 entre Lausanne et Morges direction Genève. " +
      "Dévie le trafic via la sortie Crissier-Centre, Renens, " +
      "et réinjection à Morges-Est.",
    affectedAxisCode: "A1",
    mainRouteGlobalSegmentIds: [
      "A1-MORGES-NYON-MINUS",
    ],
    deviationGlobalSegmentIds: [
      "RC-CRISSIER-RENENS-1",
      "RC-RENENS-MORGES-1",
    ],
    pmvTemplateIds: [
      "PMV-A1-CRISSIER-001",
      "PMV-A1-ECUBLENS-001",
    ],
    messageTemplates: [
      "A1 Lausanne → Genève : Bouchon {delay} min. Déviation conseillée via sortie Crissier.",
      "A1 direction Genève : Ralentissement important entre Crissier et Morges. Sortie Crissier conseillée.",
    ],
  },
];

// Activation actuelle (le plan DEV-A1-MORGES-LAUSANNE est actif pour l'événement EVT-001)
const now = new Date();
const fortyMinutesAgo = new Date(now.getTime() - 40 * 60 * 1000);

export const mockDeviationActivations: DeviationActivation[] = [
  {
    id: "ACT-001",
    planId: "DEV-A1-MORGES-LAUSANNE",
    state: "ACTIVE",
    activatedAt: fortyMinutesAgo.toISOString(),
    activatedByOperatorId: "OP-001",
    relatedEventId: "EVT-001",
  },
];

