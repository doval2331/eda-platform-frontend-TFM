import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationCorrelationChart({ correlations = [], className = '' }) {
  const pairs = correlations.slice(0, 12)
  if (!pairs.length) return null

  const labels = pairs.map((pair) => `${pair.column_a} vs ${pair.column_b}`).reverse()
  const values = pairs.map((pair) => pair.coefficient).reverse()
  const colors = values.map((value) => (value >= 0 ? '#2563eb' : '#dc2626'))

  return (
    <Card className={`decision-chart-card conv-correlation-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Correlaciones destacadas</h2>
          <p>Relaciones fuertes entre variables numericas del dataset.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            x: values,
            y: labels,
            type: 'bar',
            orientation: 'h',
            marker: { color: colors },
            hovertemplate: '%{y}<br>r = %{x:.2f}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: Math.max(240, pairs.length * 34),
          margin: { l: 160, r: 16, t: 8, b: 32 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          xaxis: { title: 'Coeficiente', range: [-1, 1], gridcolor: '#e2e8f0', zeroline: true },
          yaxis: { automargin: true },
        }}
        style={{ width: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </Card>
  )
}

ConversationCorrelationChart.propTypes = {
  correlations: PropTypes.arrayOf(PropTypes.object),
  className: PropTypes.string,
}
