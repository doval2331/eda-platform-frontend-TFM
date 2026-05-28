import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { fetchConversationDashboard } from '../api/conversation'
import { listRuns } from '../api/pipeline'
import { Button, Card, Feedback, SectionHeader } from '../ui'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

const KIND_COLORS = {
  Riesgo: '#dc2626',
  SLA: '#0f766e',
  Volumen: '#2563eb',
  Tiempo: '#7c3aed',
  Metrica: '#ca8a04',
}

const KIND_LABELS = {
  Riesgo: 'Riesgo',
  SLA: 'SLA',
  Volumen: 'Volumen',
  Tiempo: 'Tiempo',
  Metrica: 'M\u00e9trica',
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  try {
    return new Date(value).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

function numericValue(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value)
}

function formatMetric(label, value) {
  const number = numericValue(value)
  if (number == null) return 'Sin dato'
  const cleanLabel = String(label ?? '').toLowerCase()
  if (cleanLabel.includes('sla') || cleanLabel.includes('rate')) {
    return `${(number * 100).toFixed(1)}%`
  }
  if (cleanLabel.includes('hours')) {
    return `${number.toFixed(1)} h`
  }
  if (Math.abs(number) >= 100) {
    return number.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  }
  return number.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

function metricKind(label = '') {
  const clean = label.toLowerCase()
  if (clean.includes('sla')) return 'SLA'
  if (clean.includes('resolution') || clean.includes('hours')) return 'Tiempo'
  if (clean.includes('count')) return 'Volumen'
  if (clean.includes('risk') || clean.includes('priority')) return 'Riesgo'
  return 'Metrica'
}

function kindLabel(kind) {
  return KIND_LABELS[kind] ?? kind
}

function insightKey(item) {
  return `${item.run_id}-${item.id}`
}

function truncate(text = '', maxLength = 34) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}...`
}

function insightRisk(item) {
  const kind = metricKind(item.metric_label)
  const metric = numericValue(item.metric_value)
  if (kind === 'Riesgo' && metric != null) return metric
  return numericValue(item.avg_risk) ?? 0
}

function insightSla(item) {
  const kind = metricKind(item.metric_label)
  const metric = numericValue(item.metric_value)
  if (kind === 'SLA' && metric != null) return metric <= 1 ? metric * 100 : metric
  const avgSla = numericValue(item.avg_sla_breach_rate)
  return avgSla != null ? avgSla * 100 : 0
}

function buildMaxByKind(insights) {
  return insights.reduce((acc, item) => {
    const kind = metricKind(item.metric_label)
    const value = Math.abs(numericValue(item.metric_value) ?? 0)
    acc[kind] = Math.max(acc[kind] ?? 0, value)
    return acc
  }, {})
}

function insightScore(item, maxByKind) {
  const kind = metricKind(item.metric_label)
  const label = String(item.metric_label ?? '').toLowerCase()
  const value = Math.abs(numericValue(item.metric_value) ?? 0)
  if (label.includes('sla') || label.includes('rate')) {
    return Math.min(100, value <= 1 ? value * 100 : value)
  }
  if (label.includes('hours')) {
    return Math.min(100, value * 3)
  }
  if (kind === 'Riesgo') {
    return Math.min(100, value)
  }
  const max = maxByKind[kind] || value || 1
  return Math.min(100, (value / max) * 100)
}

function summarize(insights) {
  const kinds = new Set(insights.map((item) => metricKind(item.metric_label)))
  const runs = new Set(insights.map((item) => item.run_id))
  const avgSlaValues = insights
    .map((item) => item.avg_sla_breach_rate)
    .filter((value) => value != null)
  const avgRiskValues = insights
    .map((item) => item.avg_risk)
    .filter((value) => value != null)
  const avg = (values) =>
    values.length ? values.reduce((acc, value) => acc + Number(value), 0) / values.length : null

  return {
    insightCount: insights.length,
    runCount: runs.size,
    kindCount: kinds.size,
    avgSla: avg(avgSlaValues),
    avgRisk: avg(avgRiskValues),
  }
}

function buildDecisionReading(insights, activeInsight) {
  if (!insights.length) return null
  const maxByKind = buildMaxByKind(insights)
  const topByScore = [...insights].sort(
    (a, b) => insightScore(b, maxByKind) - insightScore(a, maxByKind),
  )[0]
  const topSla = [...insights].sort((a, b) => insightSla(b) - insightSla(a))[0]
  const topRisk = [...insights].sort((a, b) => insightRisk(b) - insightRisk(a))[0]
  const focused = activeInsight ?? topByScore

  return {
    focused,
    topByScore,
    topSla,
    topRisk,
    focusRisk: insightRisk(focused),
    focusSla: insightSla(focused),
  }
}

function DecisionScatter({ insights, activeKey, onSelect }) {
  const maxByKind = buildMaxByKind(insights)
  const kinds = Array.from(new Set(insights.map((item) => metricKind(item.metric_label))))
  const maxSla = Math.max(20, ...insights.map(insightSla))
  const maxRisk = Math.max(100, ...insights.map(insightRisk))

  const traces = kinds.map((kind) => {
    const items = insights.filter((item) => metricKind(item.metric_label) === kind)
    return {
      x: items.map(insightRisk),
      y: items.map(insightSla),
      type: 'scatter',
      mode: 'markers',
      name: kindLabel(kind),
      customdata: items.map((item) => ({
        key: insightKey(item),
        title: item.title,
        kind: kindLabel(kind),
        value: formatMetric(item.metric_label, item.metric_value),
        dimension: item.dimension || 'run',
        filter: item.filter_value || item.filter_kind || 'general',
      })),
      marker: {
        color: KIND_COLORS[kind] ?? KIND_COLORS.Metrica,
        size: items.map((item) => 18 + insightScore(item, maxByKind) * 0.28),
        opacity: items.map((item) => (insightKey(item) === activeKey ? 1 : 0.72)),
        line: {
          color: items.map((item) => (insightKey(item) === activeKey ? '#061b31' : '#ffffff')),
          width: items.map((item) => (insightKey(item) === activeKey ? 3 : 1)),
        },
      },
      hovertemplate:
        '<b>%{customdata.title}</b><br>' +
        'Tipo: %{customdata.kind}<br>' +
        'Valor consultado: %{customdata.value}<br>' +
        'Riesgo/impacto: %{x:.1f}<br>' +
        'SLA estimado: %{y:.1f}%<br>' +
        'Dimension: %{customdata.dimension}<br>' +
        'Filtro: %{customdata.filter}<extra></extra>',
    }
  })

  return (
    <Card className="decision-chart-card decision-impact-map">
      <div className="decision-card-title">
        <div>
          <h2>Mapa de decisi&oacute;n</h2>
          <p>
            Arriba hay mayor incumplimiento de SLA; a la derecha hay mayor riesgo o impacto.
          </p>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: 420,
          margin: { l: 54, r: 24, t: 16, b: 58 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: '#ffffff',
          xaxis: {
            title: 'Riesgo / impacto',
            range: [0, maxRisk * 1.08],
            gridcolor: '#e2e8f0',
            zeroline: false,
          },
          yaxis: {
            title: 'Incumplimiento SLA (%)',
            range: [0, maxSla * 1.18],
            gridcolor: '#e2e8f0',
            zeroline: false,
          },
          legend: { orientation: 'h', y: -0.24 },
          shapes: [
            {
              type: 'line',
              x0: 50,
              x1: 50,
              y0: 0,
              y1: maxSla * 1.18,
              line: { color: '#cbd5e1', width: 1, dash: 'dot' },
            },
            {
              type: 'line',
              x0: 0,
              x1: maxRisk * 1.08,
              y0: 15,
              y1: 15,
              line: { color: '#cbd5e1', width: 1, dash: 'dot' },
            },
          ],
          annotations: [
            {
              x: maxRisk * 0.82,
              y: maxSla * 1.08,
              text: 'Priorizar',
              showarrow: false,
              font: { color: '#991b1b', size: 12 },
              bgcolor: '#fef2f2',
              bordercolor: '#fecaca',
              borderpad: 4,
            },
            {
              x: maxRisk * 0.22,
              y: 5,
              text: 'Monitorear',
              showarrow: false,
              font: { color: '#166534', size: 12 },
              bgcolor: '#f0fdf4',
              bordercolor: '#bbf7d0',
              borderpad: 4,
            },
          ],
          hoverlabel: {
            align: 'left',
            bgcolor: 'rgba(255,255,255,0.98)',
            bordercolor: '#cbd5e1',
            font: { family: 'Inter, system-ui, sans-serif', size: 13, color: '#10243e' },
          },
        }}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
        onClick={(event) => {
          const selected = event?.points?.[0]?.customdata
          if (selected?.key) onSelect(selected.key)
        }}
      />
    </Card>
  )
}

function RankingChart({ insights, activeKey, onSelect }) {
  const maxByKind = buildMaxByKind(insights)
  const ranked = [...insights]
    .sort((a, b) => insightScore(b, maxByKind) - insightScore(a, maxByKind))
    .slice(0, 8)
    .reverse()

  return (
    <Card className="decision-chart-card">
      <div className="decision-card-title">
        <div>
          <h2>Ranking visual</h2>
          <p>Ordena los hallazgos seleccionados por intensidad relativa.</p>
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
            text: ranked.map((item) => formatMetric(item.metric_label, item.metric_value)),
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
          height: 320,
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
          if (selected?.key) onSelect(selected.key)
        }}
      />
    </Card>
  )
}

function MetricMixChart({ insights }) {
  const counts = insights.reduce((acc, item) => {
    const kind = metricKind(item.metric_label)
    acc[kind] = (acc[kind] ?? 0) + 1
    return acc
  }, {})
  const kinds = Object.keys(counts)

  return (
    <Card className="decision-chart-card">
      <div className="decision-card-title">
        <div>
          <h2>Agrupaci&oacute;n de intereses</h2>
          <p>Resume qu&eacute; tipo de preguntas hizo o guard&oacute; el usuario.</p>
        </div>
      </div>
      <Plot
        data={[
          {
            type: 'pie',
            hole: 0.58,
            labels: kinds.map(kindLabel),
            values: kinds.map((kind) => counts[kind]),
            marker: { colors: kinds.map((kind) => KIND_COLORS[kind] ?? KIND_COLORS.Metrica) },
            textinfo: 'label+percent',
            hovertemplate: '<b>%{label}</b><br>%{value} insights<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 320,
          margin: { l: 12, r: 12, t: 8, b: 8 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          showlegend: false,
        }}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </Card>
  )
}

function DecisionReading({ reading }) {
  if (!reading?.focused) return null
  return (
    <Card className="decision-reading-card">
      <span className="decision-reading-eyebrow">Lectura guiada</span>
      <h2>{reading.focused.title}</h2>
      <p>{reading.focused.description}</p>
      <div className="decision-reading-grid">
        <div>
          <span>Riesgo / impacto</span>
          <strong>{reading.focusRisk.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</strong>
        </div>
        <div>
          <span>SLA estimado</span>
          <strong>{reading.focusSla.toFixed(1)}%</strong>
        </div>
      </div>
      <ul className="decision-reading-list">
        <li>
          Prioridad mayor:{' '}
          <strong>{reading.topByScore?.title ?? 'sin hallazgo destacado'}</strong>.
        </li>
        <li>
          Mayor SLA observado: <strong>{reading.topSla?.title ?? 'sin dato'}</strong>.
        </li>
        <li>
          Mayor riesgo observado: <strong>{reading.topRisk?.title ?? 'sin dato'}</strong>.
        </li>
      </ul>
      <p className="decision-reading-action">
        Recomendaci&oacute;n: usar este tablero para elegir qu&eacute; dimensi&oacute;n investigar primero y
        luego volver a la exploraci&oacute;n para pedir causas, servicios afectados o clusters
        relacionados.
      </p>
    </Card>
  )
}

export function ConversationDashboardPage() {
  const [selectedRunId, setSelectedRunId] = useState('')
  const [metricFilter, setMetricFilter] = useState('all')
  const [activeInsightKey, setActiveInsightKey] = useState('')
  const [runs, setRuns] = useState([])
  const [dashboard, setDashboard] = useState({ total: 0, insights: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async (runId = '') => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardData, runsData] = await Promise.all([
        fetchConversationDashboard(runId || undefined),
        listRuns(50),
      ])
      setDashboard(dashboardData)
      setRuns(runsData)
      setActiveInsightKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => loadDashboard(''))
  }, [loadDashboard])

  const insights = useMemo(() => dashboard.insights ?? [], [dashboard.insights])
  const metricKinds = useMemo(() => {
    return Array.from(new Set(insights.map((item) => metricKind(item.metric_label))))
  }, [insights])
  const filteredInsights = useMemo(() => {
    if (metricFilter === 'all') return insights
    return insights.filter((item) => metricKind(item.metric_label) === metricFilter)
  }, [insights, metricFilter])
  const summary = useMemo(() => summarize(filteredInsights), [filteredInsights])
  const activeInsight = useMemo(() => {
    return (
      filteredInsights.find((item) => insightKey(item) === activeInsightKey) ??
      filteredInsights[0] ??
      null
    )
  }, [filteredInsights, activeInsightKey])
  const reading = useMemo(
    () => buildDecisionReading(filteredInsights, activeInsight),
    [filteredInsights, activeInsight],
  )
  const groupedByRun = useMemo(() => {
    return filteredInsights.reduce((acc, item) => {
      const key = item.run_id
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [filteredInsights])

  function onRunChange(event) {
    const nextRunId = event.target.value
    setSelectedRunId(nextRunId)
    loadDashboard(nextRunId)
  }

  function onMetricFilterChange(kind) {
    setMetricFilter(kind)
    setActiveInsightKey('')
  }

  return (
    <div className="conversation-dashboard-page">
      <Card as="header" className="shell-header">
        <SectionHeader
          titleAs="h1"
          eyebrow="Dashboard conversacional"
          title={<>M&eacute;tricas seleccionadas por el usuario</>}
          description={
            <>
              Vista interactiva de los hallazgos guardados desde la exploraci&oacute;n
              conversacional.
            </>
          }
          rightSlot={
            <Button type="button" variant="secondary" onClick={() => loadDashboard(selectedRunId)}>
              Actualizar
            </Button>
          }
        />
      </Card>

      {error ? <Feedback variant="danger" message={error} /> : null}

      <div className="decision-toolbar">
        <label className="field decision-filter">
          <span>Filtrar por ejecuci&oacute;n</span>
          <select value={selectedRunId} onChange={onRunChange}>
            <option value="">Todas las ejecuciones</option>
            {runs.map((run) => (
              <option value={run.id} key={run.id}>
                {formatDate(run.created_at)} - {run.modality} - {run.reduction_method}
              </option>
            ))}
          </select>
        </label>
        <Link to="/" className="decision-link">
          Volver a explorar
        </Link>
        <Link to="/metabase" className="decision-link">
          Ver Metabase BI
        </Link>
      </div>

      {insights.length > 0 ? (
        <div className="decision-kind-filters" aria-label="Filtrar por tipo de metrica">
          <button
            type="button"
            className={metricFilter === 'all' ? 'decision-chip decision-chip--active' : 'decision-chip'}
            onClick={() => onMetricFilterChange('all')}
          >
            Todas
          </button>
          {metricKinds.map((kind) => (
            <button
              type="button"
              key={kind}
              className={
                metricFilter === kind ? 'decision-chip decision-chip--active' : 'decision-chip'
              }
              onClick={() => onMetricFilterChange(kind)}
            >
              {kindLabel(kind)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="decision-kpis">
        <Card className="decision-kpi">
          <span>Insights</span>
          <strong>{summary.insightCount}</strong>
        </Card>
        <Card className="decision-kpi">
          <span>Ejecuciones</span>
          <strong>{summary.runCount}</strong>
        </Card>
        <Card className="decision-kpi">
          <span>Tipos de m&eacute;trica</span>
          <strong>{summary.kindCount}</strong>
        </Card>
        <Card className="decision-kpi">
          <span>SLA promedio</span>
          <strong>{formatMetric('sla_breach_rate', summary.avgSla)}</strong>
        </Card>
        <Card className="decision-kpi">
          <span>Riesgo promedio</span>
          <strong>{formatMetric('avg_risk', summary.avgRisk)}</strong>
        </Card>
      </div>

      {loading ? (
        <Card className="decision-empty">Cargando m&eacute;tricas seleccionadas...</Card>
      ) : insights.length === 0 ? (
        <Card className="decision-empty">
          Todav&iacute;a no hay insights seleccionados. Ejecuta el pipeline, pregunta en el chat y
          usa el bot&oacute;n Seleccionar sobre los hallazgos relevantes.
        </Card>
      ) : filteredInsights.length === 0 ? (
        <Card className="decision-empty">
          No hay insights para el filtro seleccionado.
        </Card>
      ) : (
        <>
          <div className="decision-visual-grid">
            <DecisionScatter
              insights={filteredInsights}
              activeKey={activeInsight ? insightKey(activeInsight) : activeInsightKey}
              onSelect={setActiveInsightKey}
            />
            <DecisionReading reading={reading} />
          </div>

          <div className="decision-secondary-grid">
            <RankingChart
              insights={filteredInsights}
              activeKey={activeInsight ? insightKey(activeInsight) : activeInsightKey}
              onSelect={setActiveInsightKey}
            />
            <MetricMixChart insights={filteredInsights} />
          </div>

          <div className="decision-run-groups">
            {Object.entries(groupedByRun).map(([runId, items]) => (
              <section className="decision-run-group" key={runId}>
                <div className="decision-run-heading">
                  <div>
                    <h2>Detalle agrupado - Run {runId.slice(0, 8)}</h2>
                    <p>
                      {formatDate(items[0]?.run_created_at)} - {items[0]?.modality} -{' '}
                      {items[0]?.reduction_method}
                    </p>
                  </div>
                  <span>{items.length} m&eacute;tricas</span>
                </div>

                <div className="decision-grid">
                  {items.map((item) => {
                    const maxByKind = buildMaxByKind(items)
                    const barWidth = insightScore(item, maxByKind)
                    const itemKey = insightKey(item)
                    return (
                      <Card
                        className={`decision-card ${
                          activeInsightKey === itemKey ? 'decision-card--active' : ''
                        }`}
                        key={itemKey}
                      >
                        <button
                          type="button"
                          className="decision-card-button"
                          onClick={() => setActiveInsightKey(itemKey)}
                        >
                          <div className="decision-card-head">
                            <span>{kindLabel(metricKind(item.metric_label))}</span>
                            <strong>{formatMetric(item.metric_label, item.metric_value)}</strong>
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.description}</p>
                          <div className="decision-bar" aria-hidden>
                            <span style={{ width: `${barWidth}%` }} />
                          </div>
                          <dl>
                            <div>
                              <dt>Dimensi&oacute;n</dt>
                              <dd>{item.dimension || 'run'}</dd>
                            </div>
                            <div>
                              <dt>Filtro</dt>
                              <dd>{item.filter_value || item.filter_kind || 'general'}</dd>
                            </div>
                            <div>
                              <dt>Evidencias</dt>
                              <dd>{item.evidence_count ?? 'sin dato'}</dd>
                            </div>
                          </dl>
                        </button>
                      </Card>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
