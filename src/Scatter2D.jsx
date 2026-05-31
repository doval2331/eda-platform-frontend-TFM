import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { clusterDisplayName, clusterLegendName } from './utils/businessLabels'

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

export function Scatter2D({ X_2d, clusterLabels, metadata, loading = false }) {
  if (loading) {
    return (
      <div
        className="empty-state empty-state--loading"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="plot-loader" aria-hidden>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.2"
            />
            <path
              d="M24 4a20 20 0 0120 20"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h3>Analizando incidencias&hellip;</h3>
        <p>Agrupando registros similares. Esto puede tardar unos segundos.</p>
      </div>
    )
  }

  if (!X_2d || !clusterLabels || X_2d.length === 0) {
    return (
      <div className="empty-state">
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

  const sampleMeta = metadata?.[0]
  const useStructured =
    sampleMeta?.sector != null || sampleMeta?.service_line != null
  const hovertemplate = useStructured ? HOVER_IT_OPS : HOVER_LEGACY

  const uniqueLabels = Array.from(new Set(clusterLabels)).sort((a, b) => a - b)

  const traces = uniqueLabels.map((c) => {
    const isOutlier = c === -1
    const xs = []
    const ys = []
    const customdata = []

    for (let i = 0; i < clusterLabels.length; i++) {
      if (clusterLabels[i] !== c) continue
      xs.push(X_2d[i][0])
      ys.push(X_2d[i][1])
      customdata.push(buildHoverCustom(metadata?.[i], c))
    }

    return {
      x: xs,
      y: ys,
      type: 'scattergl',
      mode: 'markers',
      name: clusterLegendName(c),
      marker: isOutlier
        ? { color: 'rgba(120,120,120,0.9)', size: 7, symbol: 'x' }
        : { size: 8 },
      customdata,
      hovertemplate,
    }
  })

  return (
    <div className="plot-container">
      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: 520,
          margin: { l: 40, r: 20, t: 24, b: 40 },
          xaxis: { title: 'Dimensión resumida 1' },
          yaxis: { title: 'Dimensión resumida 2' },
          legend: { orientation: 'h', y: -0.18 },
          hovermode: 'closest',
          hoverlabel: {
            align: 'left',
            bgcolor: 'rgba(255,255,255,0.97)',
            bordercolor: '#cbd5e1',
            font: { family: 'Inter, system-ui, sans-serif', size: 13, color: '#1b2540' },
          },
        }}
        style={{ width: '100%', height: '100%' }}
        config={{
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: [
            'toImage',
            'lasso2d',
            'select2d',
            'autoScale2d',
          ],
        }}
      />
    </div>
  )
}
