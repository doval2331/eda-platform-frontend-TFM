import { useState } from 'react'
import { Box, Collapse } from '@mui/material'
import { MetricCard, Button, ClusteringCompareTable } from '@/ui'
import { countClusters, outliersPercent } from '@/utils/runMetrics'
import { buildClusteringCompareRows } from '@/utils/clusteringCompareRows'
import {
  METRIC_HINTS,
  qualityFromSilhouette,
  stabilityLabel,
} from '@/utils/businessLabels'
import '@/ui/results.css'

const GROUPS_TOOLTIP =
  'N\u00famero de patrones de incidencias detectados autom\u00e1ticamente. En esta vista, cada grupo o cluster re\u00fane incidencias IT con patrones similares detectados por HDBSCAN; no representa usuarios ni equipos de trabajo.'

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
  calinski: (
    <KpiIcon>
      <path
        d="M4 20V10M12 20V4M20 20V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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
  ari: (
    <KpiIcon>
      <path
        d="M7 7h10v10H7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </KpiIcon>
  ),
  stability: (
    <KpiIcon>
      <path
        d="M12 3v18M3 12h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </KpiIcon>
  ),
}

function metricValue(result, runMeta, key, digits = 2) {
  const raw = result?.metrics?.[key] ?? runMeta?.metrics?.[key] ?? null
  if (raw == null) return '—'
  return Number(raw).toFixed(digits)
}

function hasTechnicalMetrics(result, runMeta) {
  if (result?.baseline_metrics) return true
  const keys = ['davies_bouldin', 'calinski_harabasz', 'ari', 'nmi', 'cluster_stability']
  return keys.some((key) => {
    const v = result?.metrics?.[key] ?? runMeta?.metrics?.[key]
    return v != null
  })
}

export function RunKpis({ result, runMeta, className = '', advancedMode = false }) {
  const [showSecondary, setShowSecondary] = useState(false)
  const outliersCount = result?.outliers_count ?? runMeta?.outliers_count ?? 0
  const nSamples = runMeta?.n_samples ?? result?.cluster_labels?.length ?? null
  const nClusters =
    result?.metrics?.n_clusters ??
    runMeta?.metrics?.n_clusters ??
    countClusters(result?.cluster_labels)
  const noisePct =
    result?.metrics?.noise_pct ??
    runMeta?.metrics?.noise_pct ??
    outliersPercent(outliersCount, nSamples)
  const silhouetteRaw = result?.metrics?.silhouette ?? runMeta?.metrics?.silhouette ?? null
  const quality = qualityFromSilhouette(silhouetteRaw)
  const stabilityRaw = result?.metrics?.cluster_stability ?? runMeta?.metrics?.cluster_stability
  const hasResults = Boolean(result || runMeta)

  if (!hasResults) return null

  const secondaryVisible = advancedMode || showSecondary
  const showToggle = !advancedMode && hasTechnicalMetrics(result, runMeta)
  const baselineAlgorithm = result?.baseline_algorithm ?? 'DBSCAN'
  const compareRows = buildClusteringCompareRows(
    result?.metrics ?? runMeta?.metrics,
    result?.baseline_metrics,
  )

  return (
    <Box className={`dashboard-kpis-wrap ${className}`.trim()}>
      <div className="dashboard-kpis-grid">
        <MetricCard
          label="Grupos (clusters)"
          value={nClusters != null ? String(nClusters) : '—'}
          icon={KPI_ICONS.clusters}
          hint={GROUPS_TOOLTIP}
        />
        <MetricCard
          label="Incidencias analizadas"
          value={nSamples != null ? String(nSamples) : '—'}
          icon={KPI_ICONS.points}
          hint="Cantidad de registros incluidos en este análisis."
        />
        <MetricCard
          label="Casos atípicos"
          value={String(outliersCount)}
          icon={KPI_ICONS.outliers}
          hint="Incidencias que no encajan claramente en ningún grupo."
        />
        <MetricCard
          label="Calidad del agrupamiento"
          value={quality?.label ?? '—'}
          icon={KPI_ICONS.silhouette}
          hint={METRIC_HINTS.silhouette}
        />
      </div>

      {showToggle ? (
        <div className="kpi-advanced-toggle">
          <Button
            variant="text"
            size="small"
            startIcon={secondaryVisible ? 'ExpandLess' : 'ExpandMore'}
            onClick={() => setShowSecondary((value) => !value)}
          >
            {secondaryVisible ? 'Ocultar métricas adicionales' : 'Ver métricas adicionales'}
          </Button>
        </div>
      ) : null}

      <Collapse in={secondaryVisible}>
        <div className="dashboard-kpis-grid dashboard-kpis-grid--secondary">
          <MetricCard
            label="Sin patrón claro"
            value={noisePct != null ? `${Number(noisePct).toFixed(1)}%` : '—'}
            icon={KPI_ICONS.outliers}
            hint={METRIC_HINTS.noise_pct}
          />
          <MetricCard
            label="¿El patrón se repite?"
            value={stabilityLabel(stabilityRaw)}
            icon={KPI_ICONS.stability}
            hint={METRIC_HINTS.cluster_stability}
          />
          <MetricCard
            label="Silhouette"
            value={metricValue(result, runMeta, 'silhouette')}
            icon={KPI_ICONS.silhouette}
            hint={METRIC_HINTS.silhouette}
          />
          <MetricCard
            label="Davies-Bouldin"
            value={metricValue(result, runMeta, 'davies_bouldin')}
            icon={KPI_ICONS.davies}
            hint={METRIC_HINTS.davies_bouldin}
          />
          <MetricCard
            label="Calinski-Harabasz"
            value={metricValue(result, runMeta, 'calinski_harabasz', 0)}
            icon={KPI_ICONS.calinski}
            hint={METRIC_HINTS.calinski_harabasz}
          />
          <MetricCard
            label="ARI"
            value={metricValue(result, runMeta, 'ari')}
            icon={KPI_ICONS.ari}
            hint={METRIC_HINTS.ari}
          />
          <MetricCard
            label="NMI"
            value={metricValue(result, runMeta, 'nmi')}
            icon={KPI_ICONS.ari}
            hint={METRIC_HINTS.nmi}
          />
          <MetricCard
            label="Trustworthiness"
            value={metricValue(result, runMeta, 'trustworthiness')}
            icon={KPI_ICONS.silhouette}
            hint="Proporción de vecinos en la proyección 2D que también eran vecinos en el espacio original. Rango [0, 1] — valores más altos indican mejor preservación de la estructura local."
          />
          <MetricCard
            label="Varianza PCA (%)"
            value={
              (result?.metrics?.pca_variance_explained ?? runMeta?.metrics?.pca_variance_explained) != null
                ? `${Number(result?.metrics?.pca_variance_explained ?? runMeta?.metrics?.pca_variance_explained).toFixed(1)}%`
                : '—'
            }
            icon={KPI_ICONS.calinski}
            hint="Porcentaje de varianza total del dataset capturada por los dos primeros componentes principales de PCA. Solo aplica cuando la reducción seleccionada es PCA."
          />
        </div>
        <ClusteringCompareTable
          title={`Comparativa con ${baselineAlgorithm} (baseline)`}
          baselineLabel={`${baselineAlgorithm} (baseline)`}
          rows={compareRows}
        />
      </Collapse>
    </Box>
  )
}
