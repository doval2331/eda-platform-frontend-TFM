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

const PRIORITY_ORDER = ['alta', 'media', 'baja']

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

function priorityTickStep(maxValue) {
  if (maxValue <= 8) return 1
  if (maxValue <= 20) return 2
  if (maxValue <= 50) return 5
  return 10
}

export function ConversationPriorityChart({ insights, className = '' }) {
  const breakdown = buildPriorityBreakdown(insights)
  if (!breakdown.length) return null

  const counts = Object.fromEntries(breakdown)
  const rows = PRIORITY_ORDER.filter((level) => (counts[level] ?? 0) > 0).map((level) => ({
    level,
    label: PRIORITY_LABELS[level],
    value: counts[level],
  }))

  const maxValue = Math.max(...rows.map((row) => row.value), 1)
  const tickStep = priorityTickStep(maxValue)
  const labels = rows.map((row) => row.label).reverse()

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
            orientation: 'h',
            x: rows.map((row) => row.value).reverse(),
            y: labels,
            marker: {
              color: rows.map((row) => PRIORITY_COLORS[row.level]).reverse(),
            },
            hovertemplate: '<b>%{y}</b><br>%{x} hallazgos<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: Math.max(180, rows.length * 56),
          margin: { l: 120, r: 16, t: 8, b: 32 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          xaxis: {
            title: 'Hallazgos',
            gridcolor: '#e2e8f0',
            dtick: tickStep,
            rangemode: 'tozero',
          },
          yaxis: { automargin: true, categoryorder: 'array', categoryarray: labels },
          bargap: 0.28,
          showlegend: false,
        }}
        style={{ width: '100%' }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
      />
    </Card>
  )
}

ConversationPriorityChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  className: PropTypes.string,
}
