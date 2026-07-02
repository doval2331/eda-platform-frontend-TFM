import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { LoadingPanel, LoadingSlot } from '@/ui'
import { clusterDisplayName, clusterLegendName } from '@/utils/businessLabels'
import {
  buildDensityTrace,
  buildDetailedTraces,
  buildUnifiedTrace,
  computeClusterStats,
  defaultShowMode,
  isPointVisible,
  SHOW_MODES,
  SIZE_PRESETS,
  VIZ_MODE,
} from '@/utils/scatterViz'
import '@/styles/scatter-viz.css'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

const SOURCE_LABELS = {
  tabular: 'CSV de incidencias',
  it_ops: 'Demo incidencias IT',
  texto: 'Texto',
  imagen: 'Imagen',
  multimodal: 'Multimodal',
}

function buildHoverCustom(meta, clusterId) {
  const clusterLabel = clusterDisplayName(clusterId)

  if (!meta) {
    return { cluster: clusterLabel }
  }

  const hasStructured =
    meta.sector != null ||
    meta.service_line != null ||
    meta.monthly_tickets != null

  if (hasStructured) {
    return {
      id: meta.id ?? '—',
      source: SOURCE_LABELS[meta.source] ?? meta.source ?? '—',
      sector: meta.sector ?? meta.category ?? '—',
      service: meta.service_line ?? meta.affected_service ?? '—',
      priority: meta.priority ?? meta.severity ?? '—',
      tickets:
        meta.monthly_tickets != null ? String(meta.monthly_tickets) : '—',
      sla:
        meta.sla_breach_rate != null
          ? `${(Number(meta.sla_breach_rate) * 100).toFixed(1)}%`
          : '—',
      resolution:
        meta.avg_resolution_hours != null
          ? `${Number(meta.avg_resolution_hours).toFixed(1)} h`
          : '—',
      risk:
        meta.operational_risk_score != null
          ? Number(meta.operational_risk_score).toFixed(1)
          : '—',
      cluster: clusterLabel,
    }
  }

  const preview = (meta.preview ?? '').replace(/^\[Outlier\]\s*/i, '')
  return {
    id: meta.id ?? '—',
    source: SOURCE_LABELS[meta.source] ?? meta.source ?? '—',
    detail: preview || '—',
    cluster: clusterLabel,
  }
}

const HOVER_IT_OPS =
  '<b>%{customdata.id}</b><br>' +
  'Grupo: %{customdata.cluster}<br>' +
  'Categoría: %{customdata.sector}<br>' +
  'Servicio: %{customdata.service}<br>' +
  'Prioridad: %{customdata.priority}<br>' +
  'Incumplimiento SLA: %{customdata.sla}<br>' +
  'Tiempo resolución: %{customdata.resolution}<br>' +
  'Riesgo operativo: %{customdata.risk}<extra></extra>'

const HOVER_LEGACY =
  '<b>%{customdata.id}</b><br>' +
  'Grupo: %{customdata.cluster}<br>' +
  '%{customdata.detail}<extra></extra>'

function ScatterToolbar({
  showMode,
  onShowModeChange,
  highlightId,
  onHighlightChange,
  viewMode,
  onViewModeChange,
  sizePreset,
  onSizePresetChange,
  stats,
  showControls,
  showDensityOption,
}) {
  if (!showControls) return null

  const highlightOptions = stats.rankedClusters.slice(0, 25)

  return (
    <div className="scatter-viz-toolbar" role="region" aria-label="Controles del mapa visual">
      <label className="scatter-viz-control">
        <span className="scatter-viz-control__label">Mostrar</span>
        <select
          className="scatter-viz-control__select field-input"
          value={showMode}
          onChange={(e) => onShowModeChange(e.target.value)}
        >
          <option value={SHOW_MODES.ALL}>Todos los grupos</option>
          <option value={SHOW_MODES.TOP10}>Top 10 por volumen</option>
          <option value={SHOW_MODES.OUTLIERS}>Solo atípicos</option>
        </select>
      </label>

      <label className="scatter-viz-control">
        <span className="scatter-viz-control__label">Resaltar</span>
        <select
          className="scatter-viz-control__select field-input"
          value={highlightId}
          onChange={(e) => onHighlightChange(e.target.value)}
        >
          <option value="">Ninguno</option>
          {highlightOptions.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {clusterLegendName(item.id)} ({item.size})
            </option>
          ))}
        </select>
      </label>

      <div className="scatter-viz-control scatter-viz-control--size">
        <span className="scatter-viz-control__label">Tamaño</span>
        <div className="scatter-viz-size-toggle" role="group" aria-label="Tamaño de puntos">
          {Object.entries(SIZE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className={`scatter-viz-size-toggle__btn${
                sizePreset === key ? ' scatter-viz-size-toggle__btn--active' : ''
              }`}
              onClick={() => onSizePresetChange(key)}
              aria-pressed={sizePreset === key}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {showDensityOption ? (
        <label className="scatter-viz-control">
          <span className="scatter-viz-control__label">Vista</span>
          <select
            className="scatter-viz-control__select field-input"
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value)}
          >
            <option value="scatter">Puntos</option>
            <option value="density">Densidad</option>
          </select>
        </label>
      ) : null}
    </div>
  )
}

function ClusterQuickTable({ rankedClusters, highlightId, onHighlightChange, maxRows = 12 }) {
  const rows = rankedClusters.slice(0, maxRows)

  return (
    <div className="scatter-viz-table-wrap">
      <p className="scatter-viz-table__title">Grupos principales por volumen</p>
      <div className="scatter-viz-table-scroll">
        <table className="scatter-viz-table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Incidencias</th>
              <th>%</th>
              <th aria-label="Acción" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = String(row.id) === highlightId
              return (
                <tr key={row.id} className={active ? 'scatter-viz-table__row--active' : ''}>
                  <td>{clusterLegendName(row.id)}</td>
                  <td>{row.size}</td>
                  <td>{row.pct.toFixed(1)}%</td>
                  <td>
                    <button
                      type="button"
                      className="scatter-viz-table__btn"
                      onClick={() => onHighlightChange(active ? '' : String(row.id))}
                    >
                      {active ? 'Quitar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Scatter2D({ X_2d, clusterLabels, metadata, loading = false }) {
  const stats = useMemo(
    () => (clusterLabels?.length ? computeClusterStats(clusterLabels) : null),
    [clusterLabels],
  )

  const [showMode, setShowMode] = useState(SHOW_MODES.ALL)
  const [highlightId, setHighlightId] = useState('')
  const [viewMode, setViewMode] = useState('scatter')
  const [sizePreset, setSizePreset] = useState('auto')
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  useEffect(() => {
    if (!stats || defaultsApplied) return
    setShowMode(defaultShowMode(stats))
    setDefaultsApplied(true)
  }, [stats, defaultsApplied])

  useEffect(() => {
    setDefaultsApplied(false)
    setHighlightId('')
    setViewMode('scatter')
    setSizePreset('auto')
  }, [clusterLabels])

  const sampleMeta = metadata?.[0]
  const useStructured =
    sampleMeta?.sector != null || sampleMeta?.service_line != null
  const hovertemplate = useStructured ? HOVER_IT_OPS : HOVER_LEGACY

  const plotData = useMemo(() => {
    if (!X_2d?.length || !clusterLabels?.length || !stats) return []

    const common = {
      X_2d,
      clusterLabels,
      metadata,
      buildHoverCustom,
      hovertemplate,
      showMode,
      highlightId,
      stats,
      sizePreset,
    }

    if (viewMode === 'density' && stats.showDensityOption) {
      const indices = []
      for (let i = 0; i < clusterLabels.length; i++) {
        const label = clusterLabels[i]
        if (!isPointVisible(label, showMode, stats)) continue
        if (highlightId && Number(highlightId) !== label) continue
        indices.push(i)
      }
      return [buildDensityTrace({ X_2d, indices })]
    }

    const useDetailed =
      stats.vizMode === VIZ_MODE.DETAILED ||
      (stats.vizMode === VIZ_MODE.MAP_TABLE &&
        highlightId === '' &&
        showMode === SHOW_MODES.ALL)

    if (useDetailed) {
      return buildDetailedTraces({
        ...common,
        clusterLegendName,
      })
    }

    return [buildUnifiedTrace(common)]
  }, [
    X_2d,
    clusterLabels,
    metadata,
    stats,
    showMode,
    highlightId,
    viewMode,
    sizePreset,
    hovertemplate,
  ])

  const showLegend =
    stats &&
    stats.vizMode !== VIZ_MODE.MAP_PAGINATED &&
    plotData.length > 1 &&
    viewMode === 'scatter' &&
    highlightId === '' &&
    showMode === SHOW_MODES.ALL

  const layout = useMemo(
    () => ({
      autosize: true,
      height: stats?.vizMode === VIZ_MODE.MAP_PAGINATED ? 480 : 520,
      margin: {
        l: 44,
        r: viewMode === 'density' ? 48 : 20,
        t: 24,
        b: showLegend ? 72 : 44,
      },
      xaxis: { title: 'Dimensión resumida 1', zeroline: true, gridcolor: '#eef2f7' },
      yaxis: { title: 'Dimensión resumida 2', zeroline: true, gridcolor: '#eef2f7' },
      showlegend: showLegend,
      legend: showLegend
        ? { orientation: 'h', y: -0.22, font: { size: 11 } }
        : undefined,
      hovermode: viewMode === 'density' ? false : 'closest',
      uirevision: 'scatter-viz',
      hoverlabel: {
        align: 'left',
        bgcolor: 'rgba(255,255,255,0.97)',
        bordercolor: '#cbd5e1',
        font: { family: 'Inter, system-ui, sans-serif', size: 13, color: '#1b2540' },
      },
    }),
    [showLegend, stats?.vizMode, viewMode],
  )

  if (loading) {
    return (
      <LoadingSlot variant="chart">
        <LoadingPanel bare compact title="Analizando incidencias…" />
      </LoadingSlot>
    )
  }

  if (!X_2d || !clusterLabels || X_2d.length === 0 || !stats) {
    return (
      <div className="empty-state empty-state--chart">
        <div className="empty-state-icon" aria-hidden>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="6" cy="14" r="2.5" fill="currentColor" opacity="0.7" />
            <circle cx="12" cy="8" r="2.5" fill="currentColor" />
            <circle cx="18" cy="15" r="2.5" fill="currentColor" opacity="0.85" />
            <circle cx="15" cy="18" r="2" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        <h3>Sin resultados todavía</h3>
        <p>
          Prepara tus datos y pulsa &laquo;Analizar incidencias&raquo; para ver el mapa de grupos
          similares.
        </p>
      </div>
    )
  }

  return (
    <div className="scatter-viz">
      <ScatterToolbar
        showMode={showMode}
        onShowModeChange={setShowMode}
        highlightId={highlightId}
        onHighlightChange={setHighlightId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sizePreset={sizePreset}
        onSizePresetChange={setSizePreset}
        stats={stats}
        showControls={stats.showControls}
        showDensityOption={stats.showDensityOption}
      />

      <div className="plot-container plot-container--scatter">
        <Plot
          data={plotData}
          layout={layout}
          style={{ width: '100%', height: '100%' }}
          config={{
            responsive: true,
            displaylogo: false,
            scrollZoom: true,
            modeBarButtonsToRemove: ['toImage', 'lasso2d', 'select2d', 'autoScale2d'],
          }}
        />
      </div>

      {stats.vizMode === VIZ_MODE.MAP_PAGINATED ? (
        <ClusterQuickTable
          rankedClusters={stats.rankedClusters}
          highlightId={highlightId}
          onHighlightChange={setHighlightId}
        />
      ) : null}
    </div>
  )
}

Scatter2D.propTypes = {
  X_2d: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  clusterLabels: PropTypes.arrayOf(PropTypes.number),
  metadata: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
}
