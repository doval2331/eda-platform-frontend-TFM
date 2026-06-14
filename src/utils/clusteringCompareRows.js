import { METRIC_HINTS } from './businessLabels'

export const CLUSTERING_COMPARE_DEFINITIONS = [
  { id: 'n_clusters', label: 'Clusters', digits: 0, better: 'neutral' },
  { id: 'noise_pct', label: 'Ruido %', digits: 1, suffix: '%', better: 'lower' },
  {
    id: 'silhouette',
    label: 'Silhouette',
    digits: 2,
    better: 'higher',
    hintKey: 'silhouette',
  },
  {
    id: 'davies_bouldin',
    label: 'Davies-Bouldin',
    digits: 2,
    better: 'lower',
    hintKey: 'davies_bouldin',
  },
  {
    id: 'calinski_harabasz',
    label: 'Calinski-Harabasz',
    digits: 0,
    better: 'higher',
    hintKey: 'calinski_harabasz',
  },
  { id: 'ari', label: 'ARI', digits: 2, better: 'higher', hintKey: 'ari' },
  { id: 'nmi', label: 'NMI', digits: 2, better: 'higher', hintKey: 'nmi' },
]

export function buildClusteringCompareRows(primaryMetrics, baselineMetrics) {
  if (!baselineMetrics) return []

  return CLUSTERING_COMPARE_DEFINITIONS.map((def) => ({
    id: def.id,
    label: def.label,
    digits: def.digits,
    suffix: def.suffix,
    better: def.better,
    hint: def.hintKey ? METRIC_HINTS[def.hintKey] : undefined,
    primary: primaryMetrics?.[def.id] ?? null,
    baseline: baselineMetrics?.[def.id] ?? null,
  }))
}
