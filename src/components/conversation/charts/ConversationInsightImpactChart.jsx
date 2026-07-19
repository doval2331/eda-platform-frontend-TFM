import PropTypes from 'prop-types'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card } from '@/ui'
import { buildInsightImpactRows, hasInsightImpactData } from '@/utils/conversationDashboard'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function ConversationInsightImpactChart({
  insights,
  onSelect,
  className = '',
}) {
  if (!hasInsightImpactData(insights)) return null

  const rows = buildInsightImpactRows(insights)
  if (!rows.length) return null

  const labels = rows.map((row) => row.title).reverse()
  const hasSla = rows.some((row) => row.sla != null)
  const hasRisk = rows.some((row) => row.risk != null)
  const hasHours = rows.some((row) => row.hours != null)

  const traces = []
  if (hasSla) {
    traces.push({
      x: rows.map((row) => row.sla ?? 0).reverse(),
      y: labels,
      type: 'bar',
      orientation: 'h',
      name: 'SLA %',
      marker: { color: '#0f766e' },
      customdata: rows
        .map((row) => ({ key: row.key, raw: row.sla }))
        .reverse(),
      hovertemplate: '<b>%{y}</b><br>SLA: %{customdata.raw:.1f}%<extra></extra>',
    })
  }
  if (hasRisk) {
    traces.push({
      x: rows.map((row) => row.risk ?? 0).reverse(),
      y: labels,
      type: 'bar',
      orientation: 'h',
      name: 'Riesgo',
      marker: { color: '#dc2626' },
      customdata: rows
        .map((row) => ({ key: row.key, raw: row.risk }))
        .reverse(),
      hovertemplate: '<b>%{y}</b><br>Riesgo: %{customdata.raw:.1f}<extra></extra>',
    })
  }
  if (hasHours) {
    traces.push({
      x: rows.map((row) => row.hours ?? 0).reverse(),
      y: labels,
      type: 'bar',
      orientation: 'h',
      name: 'Horas resolución',
      marker: { color: '#7c3aed' },
      customdata: rows
        .map((row) => ({ key: row.key, raw: row.hours }))
        .reverse(),
      hovertemplate: '<b>%{y}</b><br>Resolución: %{customdata.raw:.1f} h<extra></extra>',
    })
  }

  return (
    <Card className={`decision-chart-card conv-insight-impact-card ${className}`.trim()}>
      <div className="decision-card-title">
        <div>
          <h2>Impacto por hallazgo</h2>
          <p>SLA, riesgo y tiempo de resolución asociados a cada insight guardado.</p>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: Math.max(280, rows.length * 48),
          barmode: 'group',
          margin: { l: 160, r: 16, t: 8, b: 40 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          xaxis: { title: 'Valor', gridcolor: '#e2e8f0' },
          yaxis: { automargin: true },
          legend: { orientation: 'h', y: 1.08, x: 0 },
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

ConversationInsightImpactChart.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelect: PropTypes.func,
  className: PropTypes.string,
}
