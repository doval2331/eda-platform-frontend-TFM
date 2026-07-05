import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import {
  buildEvidenceRanking,
  insightKey,
  truncate,
} from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationEvidenceChart({ insights, activeKey, onSelect, className = '' }) {
  const ranked = buildEvidenceRanking(insights)
  if (!ranked.length) return null

  const labels = ranked.map((entry) => truncate(entry.item.title, 42)).reverse()

  return (
    <Card className={`decision-chart-card conv-evidence-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Volumen de evidencia</h2>
          <p>Incidencias respaldadas por cada hallazgo guardado.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            x: ranked.map((entry) => entry.tickets).reverse(),
            y: labels,
            type: 'bar',
            orientation: 'h',
            customdata: ranked
              .map((entry) => ({ key: entry.key, title: entry.item.title }))
              .reverse(),
            marker: {
              color: ranked
                .map((entry) => (insightKey(entry.item) === activeKey ? '#0f766e' : '#14b8a6'))
                .reverse(),
              line: {
                color: ranked
                  .map((entry) => (insightKey(entry.item) === activeKey ? '#061b31' : '#ffffff'))
                  .reverse(),
                width: ranked
                  .map((entry) => (insightKey(entry.item) === activeKey ? 2 : 1))
                  .reverse(),
              },
            },
            hovertemplate: '<b>%{customdata.title}</b><br>%{x} incidencias<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: Math.max(260, ranked.length * 40),
          margin: { l: 150, r: 16, t: 8, b: 32 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          xaxis: { title: 'Incidencias', gridcolor: '#e2e8f0' },
          yaxis: { automargin: true },
        }}
        style={{ width: '100%' }}
        config={{ responsive: true, displaylogo: false }}
        onClick={(event) => {
          const key = event?.points?.[0]?.customdata?.key
          if (key && onSelect) onSelect(key)
        }}
      />
    </Card>
  )
}

ConversationEvidenceChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
  className: PropTypes.string,
}
