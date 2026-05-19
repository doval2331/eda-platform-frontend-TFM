import { StatChip } from '../ui'
import { countClusters, outliersPercent } from '../utils/runMetrics'

export function RunKpis({ result, runMeta }) {
  const silhouette = result?.metrics?.silhouette ?? runMeta?.metrics?.silhouette ?? null
  const daviesBouldin = result?.metrics?.davies_bouldin ?? runMeta?.metrics?.davies_bouldin ?? null
  const outliersCount = result?.outliers_count ?? runMeta?.outliers_count ?? 0
  const nSamples = runMeta?.n_samples ?? result?.cluster_labels?.length ?? null
  const nClusters =
    result?.metrics?.n_clusters ??
    runMeta?.metrics?.n_clusters ??
    countClusters(result?.cluster_labels)
  const outPct = outliersPercent(outliersCount, nSamples)

  return (
    <div className="quick-stats quick-stats--row">
      <StatChip
        label="Silhouette"
        value={silhouette != null ? Number(silhouette).toFixed(2) : '—'}
      />
      <StatChip
        label="Davies-Bouldin"
        value={daviesBouldin != null ? Number(daviesBouldin).toFixed(2) : '—'}
      />
      <StatChip label="Clusters" value={nClusters != null ? String(nClusters) : '—'} />
      <StatChip label="Outliers" value={String(outliersCount)} />
      <StatChip
        label="% outliers"
        value={outPct != null ? `${outPct.toFixed(1)}%` : '—'}
      />
      {nSamples != null ? <StatChip label="Puntos" value={String(nSamples)} /> : null}
    </div>
  )
}
