import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import {
  buildMaxByKind,
  formatMetric,
  insightKey,
  insightScore,
  kindLabel,
  KIND_COLORS,
  metricKind,
  truncate,
} from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationRankingChart({ insights, activeKey, onSelect }) {
  const maxByKind = buildMaxByKind(insights)
  const ranked = [...insights]
    .sort((a, b) => insightScore(b, maxByKind) - insightScore(a, maxByKind))
    .slice(0, 8)
    .reverse()

  return (
    <Card className="decision-chart-card conv-ranking-card">
      <div className="decision-card-title conv-ranking-card__head">
        <div>
          <h2>Ranking visual</h2>
          <p>Ordena las evidencias seleccionadas por intensidad relativa.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            x: ranked.map((item) => insightScore(item, maxByKind)),
            y: ranked.map((item) => truncate(item.title)),
            type: 'bar',
            orientation: 'h',
            customdata: ranked.map((item) => ({
              key: insightKey(item),
              title: item.title,
              kind: kindLabel(metricKind(item.metric_label)),
              value: formatMetric(item.metric_label, item.metric_value),
            })),
            text: ranked.map((item) => formatMetric(item.metric_label, item.metric_value) ?? ''),
            textposition: 'auto',
            marker: {
              color: ranked.map((item) => KIND_COLORS[metricKind(item.metric_label)]),
              line: {
                color: ranked.map((item) =>
                  insightKey(item) === activeKey ? '#061b31' : '#ffffff',
                ),
                width: ranked.map((item) => (insightKey(item) === activeKey ? 2 : 1)),
              },
            },
            hovertemplate:
              '<b>%{customdata.title}</b><br>' +
              'Tipo: %{customdata.kind}<br>' +
              'Valor: %{customdata.value}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 300,
          margin: { l: 150, r: 24, t: 12, b: 36 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: '#ffffff',
          xaxis: {
            title: 'Intensidad normalizada',
            range: [0, 105],
            gridcolor: '#e2e8f0',
            zeroline: false,
          },
          yaxis: { automargin: true },
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

ConversationRankingChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
}
