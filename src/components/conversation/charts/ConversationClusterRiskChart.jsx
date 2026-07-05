import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import {
  buildClusterRiskRanking,
  hasClusterInsightData,
  insightKey,
} from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationClusterRiskChart({
  insights,
  activeKey,
  onSelect,
  className = '',
}) {
  const ranked = buildClusterRiskRanking(insights)
  if (!hasClusterInsightData(insights) || !ranked.length) return null

  const labels = ranked.map((entry) => entry.title).reverse()

  return (
    <Card className={`decision-chart-card conv-cluster-risk-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Criticidad de grupos guardados</h2>
          <p>Señal de riesgo asignada por el agente a cada hallazgo de cluster.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            x: ranked.map((entry) => entry.risk).reverse(),
            y: labels,
            type: 'bar',
            orientation: 'h',
            customdata: ranked
              .map((entry) => ({
                key: entry.key,
                title: entry.item.title,
                cluster: entry.clusterLabel,
                size: entry.size,
              }))
              .reverse(),
            marker: {
              color: ranked
                .map((entry) => {
                  const risk = entry.risk ?? 0
                  if (risk >= 70) return '#dc2626'
                  if (risk >= 40) return '#d97706'
                  return '#16a34a'
                })
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
            hovertemplate:
              '<b>%{customdata.title}</b><br>%{customdata.cluster}<br>Riesgo: %{x:.0f}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: Math.max(260, ranked.length * 42),
          margin: { l: 160, r: 16, t: 8, b: 32 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          xaxis: { title: 'Índice de riesgo', range: [0, 100], gridcolor: '#e2e8f0' },
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

ConversationClusterRiskChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
  className: PropTypes.string,
}
