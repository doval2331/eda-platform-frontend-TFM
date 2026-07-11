import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import { buildDimensionBreakdown, hasSegmentedDimensionData } from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationDimensionChart({ insights, className = '' }) {
  if (!hasSegmentedDimensionData(insights)) return null

  const groups = buildDimensionBreakdown(insights)
  if (!groups.length) return null

  const labels = groups.map((group) => `${group.label} (${group.dimension})`).reverse()

  return (
    <Card className={`decision-chart-card conv-dimension-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Concentración por dimensión</h2>
          <p>Cuántas evidencias guardadas hay por servicio, categoría o filtro.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            x: groups.map((group) => group.count).reverse(),
            y: labels,
            type: 'bar',
            orientation: 'h',
            name: 'Evidencias',
            marker: { color: '#2563eb' },
            hovertemplate: '%{y}<br>%{x} evidencias<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: Math.max(260, groups.length * 36),
          margin: { l: 140, r: 16, t: 8, b: 32 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          xaxis: { title: 'Evidencias guardadas', gridcolor: '#e2e8f0' },
          yaxis: { automargin: true },
        }}
        style={{ width: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </Card>
  )
}

ConversationDimensionChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  className: PropTypes.string,
}
