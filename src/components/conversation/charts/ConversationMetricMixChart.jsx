import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import { kindLabel, KIND_COLORS, metricKind } from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationMetricMixChart({ insights }) {
  const counts = insights.reduce((acc, item) => {
    const kind = metricKind(item.metric_label)
    acc[kind] = (acc[kind] ?? 0) + 1
    return acc
  }, {})
  const kinds = Object.keys(counts)

  if (!kinds.length) return null

  const labels = kinds.map(kindLabel)

  return (
    <Card className="decision-chart-card conv-metric-mix-card">
      <div className="decision-card-title">
        <div>
          <h2>Agrupaci&oacute;n de intereses</h2>
          <p>Resume qu&eacute; tipo de hallazgos guard&oacute; el usuario.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            type: 'pie',
            hole: kinds.length === 1 ? 0.45 : 0.52,
            labels,
            values: kinds.map((kind) => counts[kind]),
            marker: { colors: kinds.map((kind) => KIND_COLORS[kind] ?? KIND_COLORS.Metrica) },
            textinfo: kinds.length === 1 ? 'none' : 'percent',
            textposition: 'outside',
            automargin: true,
            hovertemplate: '<b>%{label}</b><br>%{value} insights (%{percent})<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: kinds.length === 1 ? 280 : 360,
          margin: { l: 16, r: 16, t: 16, b: 16 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          showlegend: true,
          legend: {
            orientation: 'h',
            y: -0.08,
            x: 0.5,
            xanchor: 'center',
            font: { size: 14 },
          },
          annotations:
            kinds.length === 1
              ? [
                  {
                    text: `<b>${labels[0]}</b><br>${counts[kinds[0]]} hallazgo${counts[kinds[0]] === 1 ? '' : 's'}`,
                    showarrow: false,
                    font: { size: 16, color: '#334155' },
                    x: 0.5,
                    y: 0.5,
                    xref: 'paper',
                    yref: 'paper',
                  },
                ]
              : [],
        }}
        config={{ responsive: true, displaylogo: false }}
        style={{ width: '100%', minHeight: kinds.length === 1 ? 280 : 360 }}
        useResizeHandler
      />
    </Card>
  )
}

ConversationMetricMixChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
}
