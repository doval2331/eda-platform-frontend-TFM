import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

const SOURCE_LABELS = {
  tabular: 'CSV tabular',
  it_ops: 'IT Ops',
  texto: 'Texto',
  imagen: 'Imagen',
  multimodal: 'Multimodal',
}

function buildHoverCustom(meta, clusterId) {
  const clusterLabel =
    clusterId === -1 ? 'Outlier (HDBSCAN)' : `Cluster ${clusterId}`

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
      sector: meta.sector ?? '—',
      service: meta.service_line ?? '—',
      tickets:
        meta.monthly_tickets != null ? String(meta.monthly_tickets) : '—',
      sla:
        meta.sla_breach_rate != null
          ? Number(meta.sla_breach_rate).toFixed(3)
          : '—',
      risk:
        meta.operational_risk_score != null
          ? Number(meta.operational_risk_score).toFixed(2)
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
  'Origen: %{customdata.source}<br>' +
  'Sector: %{customdata.sector}<br>' +
  'Línea de servicio: %{customdata.service}<br>' +
  'Tickets/mes: %{customdata.tickets}<br>' +
  'SLA breach: %{customdata.sla}<br>' +
  'Riesgo operativo: %{customdata.risk}<br>' +
  'Cluster: %{customdata.cluster}<extra></extra>'

const HOVER_LEGACY =
  '<b>%{customdata.id}</b><br>' +
  'Origen: %{customdata.source}<br>' +
  '%{customdata.detail}<br>' +
  'Cluster: %{customdata.cluster}<extra></extra>'

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
        <h3>Ejecutando pipeline&hellip;</h3>
        <p>Reducci&oacute;n dimensional y clustering HDBSCAN en curso. Esto puede tardar unos segundos.</p>
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
        <h3>Sin proyecci&oacute;n 2D</h3>
        <p>Configura el experimento y pulsa &laquo;Ejecutar pipeline&raquo; para generar el scatter de clusters.</p>
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
      name: isOutlier ? 'Outliers' : `Cluster ${c}`,
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
          xaxis: { title: 'Componente 1 (2D)' },
          yaxis: { title: 'Componente 2 (2D)' },
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
