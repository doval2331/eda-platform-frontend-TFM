import { StatChip } from '../ui'
import { countClusters, outliersPercent } from '../utils/runMetrics'

function KpiIcon({ children }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      {children}
    </svg>
  )
}

const KPI_ICONS = {
  silhouette: (
    <KpiIcon>
      <path
        d="M4 19V5M10 19V9M16 19V13M22 19V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </KpiIcon>
  ),
  davies: (
    <KpiIcon>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </KpiIcon>
  ),
  clusters: (
    <KpiIcon>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
    </KpiIcon>
  ),
  outliers: (
    <KpiIcon>
      <path
        d="M12 3l9 16H3L12 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </KpiIcon>
  ),
  points: (
    <KpiIcon>
      <path
        d="M4 4h16v16H4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </KpiIcon>
  ),
}

export function RunKpis({ result, runMeta, className = '' }) {
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
    <div className={`dashboard-kpis ${className}`.trim()}>
      <StatChip
        label="Silhouette"
        value={silhouette != null ? Number(silhouette).toFixed(2) : '—'}
        icon={KPI_ICONS.silhouette}
      />
      <StatChip
        label="Davies-Bouldin"
        value={daviesBouldin != null ? Number(daviesBouldin).toFixed(2) : '—'}
        icon={KPI_ICONS.davies}
      />
      <StatChip
        label="Clusters"
        value={nClusters != null ? String(nClusters) : '—'}
        icon={KPI_ICONS.clusters}
      />
      <StatChip label="Outliers" value={String(outliersCount)} icon={KPI_ICONS.outliers} />
      <StatChip
        label="% outliers"
        value={outPct != null ? `${outPct.toFixed(1)}%` : '—'}
        icon={KPI_ICONS.outliers}
      />
      {nSamples != null ? (
        <StatChip label="Puntos" value={String(nSamples)} icon={KPI_ICONS.points} />
      ) : null}
    </div>
  )
}
