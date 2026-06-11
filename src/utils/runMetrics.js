/** Métricas derivadas de un resultado de pipeline o resumen de run. */

export function countClusters(clusterLabels) {
  if (!clusterLabels?.length) return null
  const set = new Set(clusterLabels.filter((l) => l >= 0))
  return set.size
}

export function outliersPercent(outliersCount, nSamples) {
  if (nSamples == null || nSamples <= 0) return null
  const n = Number(outliersCount) || 0
  return (n / nSamples) * 100
}

export function formatModality(modality) {
  const map = {
    tabular: 'Fuente tabular',
    it_ops: 'IT Ops',
    project: 'Proyecto multifuente',
    texto: 'Texto',
    imagen: 'Imagen',
    multimodal: 'Multimodal',
  }
  return map[modality] ?? modality
}
