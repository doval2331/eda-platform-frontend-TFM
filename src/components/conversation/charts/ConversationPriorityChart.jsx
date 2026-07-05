import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import { buildPriorityBreakdown } from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

const PRIORITY_COLORS = {
  alta: '#dc2626',
  media: '#d97706',
  baja: '#16a34a',
}

const PRIORITY_LABELS = {
  alta: 'Prioridad alta',
  media: 'Prioridad media',
  baja: 'Prioridad baja',
}

export function ConversationPriorityChart({ insights, className = '' }) {
  const breakdown = buildPriorityBreakdown(insights)
  if (!breakdown.length) return null

  return (
    <Card className={`decision-chart-card conv-priority-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Distribución de prioridad</h2>
          <p>Cuántos hallazgos guardados son de prioridad alta, media o baja.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            type: 'bar',
            x: breakdown.map(([level]) => PRIORITY_LABELS[level] ?? level),
            y: breakdown.map(([, value]) => value),
            marker: {
              color: breakdown.map(([level]) => PRIORITY_COLORS[level] ?? '#64748b'),
            },
            hovertemplate: '<b>%{x}</b><br>%{y} hallazgos<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 280,
          margin: { l: 40, r: 16, t: 8, b: 48 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          yaxis: { title: 'Hallazgos', gridcolor: '#e2e8f0', dtick: 1 },
          xaxis: { automargin: true },
          showlegend: false,
        }}
        style={{ width: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </Card>
  )
}

ConversationPriorityChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  className: PropTypes.string,
}
