import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import {
  buildMaxByKind,
  formatMetric,
  insightKey,
  insightRisk,
  insightScore,
  insightSla,
  kindLabel,
  KIND_COLORS,
  metricKind,
} from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationScatterChart({ insights, activeKey, onSelect }) {
  const maxByKind = buildMaxByKind(insights)
  const kinds = Array.from(new Set(insights.map((item) => metricKind(item.metric_label))))
  const maxSla = Math.max(20, ...insights.map(insightSla))
  const maxRisk = Math.max(100, ...insights.map(insightRisk))

  const traces = kinds.map((kind) => {
    const items = insights.filter((item) => metricKind(item.metric_label) === kind)
    return {
      x: items.map(insightRisk),
      y: items.map(insightSla),
      type: 'scatter',
      mode: 'markers',
      name: kindLabel(kind),
      customdata: items.map((item) => ({
        key: insightKey(item),
        title: item.title,
        kind: kindLabel(kind),
        value: formatMetric(item.metric_label, item.metric_value),
        dimension: item.dimension || 'run',
        filter: item.filter_value || item.filter_kind || 'general',
      })),
      marker: {
        color: KIND_COLORS[kind] ?? KIND_COLORS.Metrica,
        size: items.map((item) => 18 + insightScore(item, maxByKind) * 0.28),
        opacity: items.map((item) => (insightKey(item) === activeKey ? 1 : 0.72)),
        line: {
          color: items.map((item) => (insightKey(item) === activeKey ? '#061b31' : '#ffffff')),
          width: items.map((item) => (insightKey(item) === activeKey ? 3 : 1)),
        },
      },
      hovertemplate:
        '<b>%{customdata.title}</b><br>' +
        'Tipo: %{customdata.kind}<br>' +
        'Valor consultado: %{customdata.value}<br>' +
        'Riesgo/impacto: %{x:.1f}<br>' +
        'SLA estimado: %{y:.1f}%<br>' +
        'Dimension: %{customdata.dimension}<br>' +
        'Filtro: %{customdata.filter}<extra></extra>',
    }
  })

  return (
    <Card className="decision-chart-card decision-impact-map">
      <div className="decision-card-title">
        <div>
          <h2>Mapa de decisi&oacute;n</h2>
          <p>
            Arriba hay mayor incumplimiento de SLA; a la derecha hay mayor impacto o criticidad.
          </p>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: 420,
          margin: { l: 54, r: 24, t: 16, b: 58 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: '#ffffff',
          xaxis: {
            title: 'Riesgo / impacto',
            range: [0, maxRisk * 1.08],
            gridcolor: '#e2e8f0',
            zeroline: false,
          },
          yaxis: {
            title: 'Incumplimiento SLA (%)',
            range: [0, maxSla * 1.18],
            gridcolor: '#e2e8f0',
            zeroline: false,
          },
          legend: { orientation: 'h', y: -0.24 },
          shapes: [
            {
              type: 'line',
              x0: 50,
              x1: 50,
              y0: 0,
              y1: maxSla * 1.18,
              line: { color: '#cbd5e1', width: 1, dash: 'dot' },
            },
            {
              type: 'line',
              x0: 0,
              x1: maxRisk * 1.08,
              y0: 15,
              y1: 15,
              line: { color: '#cbd5e1', width: 1, dash: 'dot' },
            },
          ],
          annotations: [
            {
              x: maxRisk * 0.82,
              y: maxSla * 1.08,
              text: 'Priorizar',
              showarrow: false,
              font: { color: '#991b1b', size: 12 },
              bgcolor: '#fef2f2',
              bordercolor: '#fecaca',
              borderpad: 4,
            },
            {
              x: maxRisk * 0.22,
              y: 5,
              text: 'Monitorear',
              showarrow: false,
              font: { color: '#166534', size: 12 },
              bgcolor: '#f0fdf4',
              bordercolor: '#bbf7d0',
              borderpad: 4,
            },
          ],
          hoverlabel: {
            align: 'left',
            bgcolor: 'rgba(255,255,255,0.98)',
            bordercolor: '#cbd5e1',
            font: { family: 'Inter, system-ui, sans-serif', size: 13, color: '#10243e' },
          },
        }}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
        onClick={(event) => {
          const selected = event?.points?.[0]?.customdata
          if (selected?.key) onSelect?.(selected.key)
        }}
      />
    </Card>
  )
}

ConversationScatterChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
}
