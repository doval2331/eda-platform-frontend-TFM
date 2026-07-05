import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import {
  buildClusterMapRows,
  buildMaxByKind,
  formatMetric,
  hasClusterMapData,
  hasSlaRiskMapData,
  insightKey,
  insightRisk,
  insightScore,
  insightSla,
  isClusterInsight,
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

function ClusterMapChart({ insights, activeKey, onSelect }) {
  const rows = buildClusterMapRows(insights)
  const maxRisk = Math.max(100, ...rows.map((row) => row.risk))
  const maxSize = Math.max(10, ...rows.map((row) => row.size))

  return (
    <Card className="decision-chart-card decision-impact-map conv-cluster-map-card">
      <div className="decision-card-title">
        <div>
          <h2>Mapa de clusters guardados</h2>
          <p>
            Arriba hay grupos con más registros; a la derecha, mayor criticidad según el agente.
          </p>
        </div>
      </div>
      <Plot
        data={[
          {
            x: rows.map((row) => row.risk),
            y: rows.map((row) => row.size),
            type: 'scatter',
            mode: 'markers',
            name: 'Clusters',
            customdata: rows.map((row) => ({
              key: row.key,
              title: row.title,
            })),
            marker: {
              color: '#4338ca',
              size: rows.map((row) => 16 + (row.size / maxSize) * 28),
              opacity: rows.map((row) => (row.key === activeKey ? 1 : 0.75)),
              line: {
                color: rows.map((row) => (row.key === activeKey ? '#061b31' : '#ffffff')),
                width: rows.map((row) => (row.key === activeKey ? 3 : 1)),
              },
            },
            hovertemplate:
              '<b>%{customdata.title}</b><br>Riesgo: %{x:.0f}<br>Registros: %{y}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 420,
          margin: { l: 54, r: 24, t: 16, b: 58 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: '#ffffff',
          xaxis: {
            title: 'Criticidad',
            range: [0, maxRisk * 1.08],
            gridcolor: '#e2e8f0',
            zeroline: false,
          },
          yaxis: {
            title: 'Registros en el grupo',
            range: [0, maxSize * 1.15],
            gridcolor: '#e2e8f0',
            zeroline: false,
          },
          showlegend: false,
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

ClusterMapChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
}

function SlaRiskMapChart({ insights, activeKey, onSelect }) {
  const maxByKind = buildMaxByKind(insights)
  const businessInsights = insights.filter((item) => !isClusterInsight(item))
  const kinds = Array.from(
    new Set(businessInsights.map((item) => metricKind(item.metric_label))),
  )
  const maxSla = Math.max(20, ...businessInsights.map(insightSla))
  const maxRisk = Math.max(100, ...businessInsights.map(insightRisk))

  const traces = kinds.map((kind) => {
    const items = businessInsights.filter((item) => metricKind(item.metric_label) === kind)
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
          <h2>Mapa de decisión</h2>
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

SlaRiskMapChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
}

export function ConversationScatterChart({ insights, activeKey, onSelect }) {
  const clusterMode =
    hasClusterMapData(insights) &&
    insights.filter(isClusterInsight).length >= insights.length * 0.5

  if (clusterMode) {
    return <ClusterMapChart insights={insights} activeKey={activeKey} onSelect={onSelect} />
  }

  if (!hasSlaRiskMapData(insights)) return null

  return <SlaRiskMapChart insights={insights} activeKey={activeKey} onSelect={onSelect} />
}

ConversationScatterChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
}
