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

  return (
    <Card className="decision-chart-card">
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
            hole: 0.58,
            labels: kinds.map(kindLabel),
            values: kinds.map((kind) => counts[kind]),
            marker: { colors: kinds.map((kind) => KIND_COLORS[kind] ?? KIND_COLORS.Metrica) },
            textinfo: 'label+percent',
            hovertemplate: '<b>%{label}</b><br>%{value} insights<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 320,
          margin: { l: 12, r: 12, t: 8, b: 8 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          showlegend: false,
        }}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </Card>
  )
}

ConversationMetricMixChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
}
