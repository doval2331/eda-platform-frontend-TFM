import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import {
  buildClusterVolumeRanking,
  hasClusterVolumeData,
  insightKey,
} from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationClusterVolumeChart({
  insights,
  activeKey,
  onSelect,
  className = '',
}) {
  if (!hasClusterVolumeData(insights)) return null

  const ranked = buildClusterVolumeRanking(insights)
  const labels = ranked.map((entry) => entry.title).reverse()

  return (
    <Card className={`decision-chart-card conv-cluster-volume-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Tamaño de grupos guardados</h2>
          <p>Registros que respaldan cada patrón o cluster que elegiste conservar.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            x: ranked.map((entry) => entry.size).reverse(),
            y: labels,
            type: 'bar',
            orientation: 'h',
            customdata: ranked
              .map((entry) => ({
                key: entry.key,
                title: entry.item.title,
                cluster: entry.clusterLabel,
              }))
              .reverse(),
            marker: {
              color: ranked
                .map((entry) => (insightKey(entry.item) === activeKey ? '#4338ca' : '#6366f1'))
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
              '<b>%{customdata.title}</b><br>%{customdata.cluster}<br>%{x} registros<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: Math.max(260, ranked.length * 42),
          margin: { l: 160, r: 16, t: 8, b: 32 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          xaxis: { title: 'Registros', gridcolor: '#e2e8f0' },
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

ConversationClusterVolumeChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
  className: PropTypes.string,
}
