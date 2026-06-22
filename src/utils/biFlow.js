/** Recorrido recomendado de la plataforma: dónde encaja Metabase BI. */

export const ANALYSIS_FLOW_STEPS = [
  {
    id: 'analyze',
    label: 'Analizar',
    shortLabel: '1',
    path: '/',
    description: 'Prepara datos y ejecuta el clustering.',
  },
  {
    id: 'explore',
    label: 'Explorar',
    shortLabel: '2',
    path: '/',
    description: 'Usa chat y agentes; guarda hallazgos con «Seleccionar».',
  },
  {
    id: 'consolidate',
    label: 'Consolidar',
    shortLabel: '3',
    path: '/dashboard-conversacional',
    description: 'Revisa los hallazgos guardados y elige los más relevantes.',
  },
  {
    id: 'report',
    label: 'Informar (Metabase)',
    shortLabel: '4',
    path: '/metabase',
    description: 'Publica tablas BI y abre gráficos para informes o defensa.',
  },
]

export function flowStepIndex(stepId) {
  return ANALYSIS_FLOW_STEPS.findIndex((step) => step.id === stepId)
}

export function nextFlowStep(stepId) {
  const index = flowStepIndex(stepId)
  if (index < 0 || index >= ANALYSIS_FLOW_STEPS.length - 1) return null
  return ANALYSIS_FLOW_STEPS[index + 1]
}

export function metabaseLinkState({ runId, fromStep } = {}) {
  return {
    fromRunId: runId || undefined,
    fromStep: fromStep || undefined,
  }
}
