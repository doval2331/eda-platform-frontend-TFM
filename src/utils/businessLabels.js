/** Etiquetas y textos orientados a usuarios de negocio (no técnicos). */

export const REDUCTION_OPTIONS = [
  {
    value: 'UMAP',
    label: 'Vista equilibrada (recomendada)',
    helper: 'Agrupa incidencias similares conservando patrones generales y locales.',
  },
  {
    value: 'PCA',
    label: 'Vista rápida y simple',
    helper: 'Resume los datos con un enfoque lineal. Útil para exploraciones rápidas.',
  },
  {
    value: 't-SNE',
    label: 'Vista detallada de proximidad',
    helper: 'Enfatiza incidencias muy parecidas entre sí. Puede tardar más con muchos datos.',
  },
]

export const MODALITY_OPTIONS = [
  { value: 'tabular', label: 'Una fuente tabular (mis incidencias)' },
  { value: 'project', label: 'Escenario multifuente (proyecto)' },
  { value: 'it_ops', label: 'Datos de demo (incidencias IT)' },
]

export function clusterDisplayName(clusterId) {
  if (clusterId === -1) return 'Caso atípico'
  return `Grupo ${clusterId + 1}`
}

export function clusterLegendName(clusterId) {
  if (clusterId === -1) return 'Casos atípicos'
  return `Grupo ${clusterId + 1}`
}

export function qualityFromSilhouette(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  const n = Number(value)
  if (n >= 0.4) return { label: 'Buena', className: 'kpi-quality--good' }
  if (n >= 0.25) return { label: 'Media', className: 'kpi-quality--medium' }
  return { label: 'Baja', className: 'kpi-quality--low' }
}

export function stabilityLabel(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (n >= 0.7) return 'Alta'
  if (n >= 0.4) return 'Media'
  return 'Baja'
}

export const METRIC_HINTS = {
  silhouette: 'Indica si las incidencias de un mismo grupo se parecen entre sí.',
  davies_bouldin: 'Mide la separación entre grupos (valores más bajos suelen ser mejores).',
  calinski_harabasz: 'Evalúa la separación de grupos en el espacio original de variables.',
  ari: 'Coincidencia con categorías de referencia del dataset (solo evaluación).',
  nmi: 'Información compartida con categorías de referencia (solo evaluación).',
  cluster_stability: 'Indica si el patrón se mantiene al repetir el agrupamiento.',
  noise_pct: 'Porcentaje de incidencias que no encajan claramente en ningún grupo.',
}
