import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import { buildDimensionTreemapData } from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationDimensionTreemap({ insights, className = '' }) {
  const treemap = buildDimensionTreemapData(insights)
  if (!treemap) return null

  return (
    <Card className={`decision-chart-card conv-dimension-treemap-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Mapa de evidencia por dimensión</h2>
          <p>Tamaño proporcional al volumen de incidencias respaldadas en cada segmento.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            type: 'treemap',
            labels: treemap.labels,
            parents: treemap.parents,
            values: treemap.values,
            customdata: treemap.customdata,
            branchvalues: 'total',
            marker: {
              colors: treemap.labels.map((label, index) => {
                const meta = treemap.customdata[index]
                if (meta?.kind === 'root') return '#e2e8f0'
                if (meta?.kind === 'dimension') return '#2563eb'
                return '#60a5fa'
              }),
              line: { color: '#ffffff', width: 1.5 },
            },
            hovertemplate:
              '<b>%{label}</b><br>%{value} incidencias<extra></extra>',
            textinfo: 'label+value',
            textfont: { size: 12 },
          },
        ]}
        layout={{
          autosize: true,
          height: 360,
          margin: { l: 8, r: 8, t: 8, b: 8 },
          paper_bgcolor: 'rgba(0,0,0,0)',
        }}
        style={{ width: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </Card>
  )
}

ConversationDimensionTreemap.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  className: PropTypes.string,
}
