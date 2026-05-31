import { useMemo, useState } from 'react'
import { selectRunInsight } from '../api/conversation'
import { Button, Feedback } from '../ui'

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function average(values) {
  const numbers = values.map(toNumber).filter((value) => value != null)
  if (!numbers.length) return null
  return numbers.reduce((acc, value) => acc + value, 0) / numbers.length
}

function averageByFields(items, fields) {
  for (const field of fields) {
    const value = average(items.map((item) => item?.[field]))
    if (value != null) return value
  }
  return null
}

function formatPct(value) {
  if (value == null) return 'sin dato'
  return `${(value * 100).toFixed(1)}%`
}

function formatHours(value) {
  if (value == null) return 'sin dato'
  return `${value.toFixed(1)} h`
}

function formatNumber(value) {
  if (value == null) return 'sin dato'
  if (Math.abs(value) >= 100) return value.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

function topValue(items, field) {
  const counts = new Map()
  items.forEach((item) => {
    const value = item?.[field]
    if (!value) return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })
  if (!counts.size) return null
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function topValueByFields(items, fields) {
  for (const field of fields) {
    const value = topValue(items, field)
    if (value) return value
  }
  return null
}

function priorityLabel(score) {
  if (score >= 85) return 'Alta'
  if (score >= 45) return 'Media'
  return 'Baja'
}

function priorityClass(score) {
  if (score >= 85) return 'cluster-priority--high'
  if (score >= 45) return 'cluster-priority--medium'
  return 'cluster-priority--low'
}

function clusterName(summary) {
  if (summary.clusterLabel === -1) return 'Casos atipicos'
  const anchor = summary.service || summary.category || `cluster ${summary.clusterLabel}`
  if ((summary.avgSla ?? 0) >= 0.14) return `SLA alto en ${anchor}`
  if ((summary.avgResolution ?? 0) >= 22) return `Resolucion lenta en ${anchor}`
  if ((summary.avgRisk ?? 0) >= 50) return `Riesgo operativo en ${anchor}`
  if (summary.count >= 100) return `Alto volumen en ${anchor}`
  return `Grupo similar de ${anchor}`
}

function recommendation(summary) {
  if (summary.clusterLabel === -1) {
    return 'Accion recomendada: revisar individualmente estas incidencias porque no siguen el patron comun.'
  }
  if ((summary.avgSla ?? 0) >= 0.14) {
    return 'Accion recomendada: revisar acuerdos de SLA, capacidad del equipo y reglas de escalamiento.'
  }
  if ((summary.avgResolution ?? 0) >= 22) {
    return 'Accion recomendada: buscar cuellos de botella, automatizacion posible y transferencias entre equipos.'
  }
  if ((summary.avgRisk ?? 0) >= 50) {
    return 'Accion recomendada: analizar dependencias criticas antes de planificar cambios.'
  }
  return 'Accion recomendada: usarlo como grupo de referencia y compararlo contra clusters mas criticos.'
}

function buildSummaries(result) {
  const labels = result?.cluster_labels ?? []
  const metadata = result?.metadata ?? []
  if (!labels.length) return []

  const grouped = labels.reduce((acc, label, index) => {
    const clusterLabel = Number(label)
    if (!acc.has(clusterLabel)) acc.set(clusterLabel, [])
    acc.get(clusterLabel).push(metadata[index] ?? {})
    return acc
  }, new Map())

  return [...grouped.entries()].map(([clusterLabel, items]) => {
    const avgSla = averageByFields(items, ['sla_breach_rate', 'sla_incumplido', 'sla_breached'])
    const avgResolution = averageByFields(items, [
      'tiempo_resolucion_horas',
      'avg_resolution_hours',
    ])
    const avgRisk = averageByFields(items, ['operational_risk_score', 'business_impact_score'])
    const avgTickets = average(items.map((item) => item.monthly_tickets))
    const criticalIncidents = average(items.map((item) => item.critical_incidents))
    const service = topValueByFields(items, [
      'servicio_afectado',
      'affected_service',
      'service_line',
    ])
    const category = topValueByFields(items, ['categoria', 'category', 'sector'])
    const priority = topValueByFields(items, ['prioridad', 'severity'])
    const rootCause = topValueByFields(items, ['causa_raiz_simulada', 'root_cause'])
    const channel = topValueByFields(items, ['canal_entrada', 'support_channel'])
    const score =
      (avgSla ?? 0) * 120 +
      (avgResolution ?? 0) * 1.8 +
      (avgRisk ?? 0) +
      (criticalIncidents ?? 0) * 4 +
      (clusterLabel === -1 ? 15 : 0)

    const summary = {
      clusterLabel,
      count: items.length,
      avgSla,
      avgResolution,
      avgRisk,
      avgTickets,
      criticalIncidents,
      service,
      category,
      priority,
      rootCause,
      channel,
      score,
    }

    summary.name = clusterName(summary)
    summary.priority = priorityLabel(score)
    summary.recommendation = recommendation(summary)
    summary.explanation =
      clusterLabel === -1
        ? `Este grupo contiene ${items.length} incidencias atipicas. No se parecen lo suficiente al patron principal y conviene revisarlas como excepciones.`
        : `Este cluster agrupa ${items.length} incidencias similares. El patron dominante es ${service || category || 'un comportamiento comun'}${priority ? ` con prioridad ${priority}` : ''}${rootCause ? ` y causa raiz ${rootCause}` : ''}. Por que importa: combina SLA ${formatPct(avgSla)}, resolucion ${formatHours(avgResolution)} y riesgo ${formatNumber(avgRisk)}.`
    return summary
  })
}

function insightFromSummary(runId, summary) {
  return {
    id: `cluster-${runId}-${summary.clusterLabel}`,
    title: summary.name,
    description: `${summary.explanation} Recomendacion: ${summary.recommendation}`,
    metric_label: 'cluster_critical_score',
    metric_value: Number(summary.score.toFixed(2)),
    dimension: 'cluster_label',
    filter_kind: 'cluster_label',
    filter_value: String(summary.clusterLabel),
  }
}

export function ClusterInterpretationPanel({ result, run }) {
  const [filter, setFilter] = useState('priority')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const summaries = useMemo(() => buildSummaries(result), [result])
  const ranked = useMemo(() => {
    const sorted = [...summaries].sort((a, b) => b.score - a.score)
    if (filter === 'outliers') return sorted.filter((item) => item.clusterLabel === -1)
    if (filter === 'sla') return sorted.sort((a, b) => (b.avgSla ?? 0) - (a.avgSla ?? 0))
    if (filter === 'time') {
      return sorted.sort((a, b) => (b.avgResolution ?? 0) - (a.avgResolution ?? 0))
    }
    return sorted
  }, [filter, summaries])

  const top = ranked[0]

  async function addCluster(summary) {
    if (!run?.id) {
      setError('Ejecuta y guarda una corrida antes de agregar clusters al dashboard.')
      return
    }
    const insight = insightFromSummary(run.id, summary)
    try {
      await selectRunInsight(run.id, insight)
      setSelectedIds((current) => new Set([...current, insight.id]))
      setMessage(`${summary.name} agregado al dashboard conversacional.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cluster')
    }
  }

  if (!result?.cluster_labels?.length) {
    return (
      <section className="cluster-insights cluster-insights--empty">
        <h3>Lectura guiada de clusters</h3>
        <p>Ejecuta el pipeline para ver una interpretacion automatica de las incidencias agrupadas.</p>
      </section>
    )
  }

  return (
    <section className="cluster-insights">
      <div className="cluster-insights-header">
        <div>
          <h3>Lectura guiada de clusters</h3>
          <p>
            Cada punto es una incidencia. Los puntos cercanos se parecen entre si. Los
            colores muestran grupos de incidencias similares y los grises son casos atipicos.
          </p>
        </div>
        {top ? (
          <div className={`cluster-priority ${priorityClass(top.score)}`}>
            <span>Cluster prioritario</span>
            <strong>{top.name}</strong>
          </div>
        ) : null}
      </div>

      {message ? <Feedback variant="success" message={message} /> : null}
      {error ? <Feedback variant="danger" message={error} /> : null}

      <div className="cluster-filter-row" aria-label="Filtros de clusters">
            <button
              type="button"
              className={filter === 'priority' ? 'cluster-filter--active' : ''}
              onClick={() => setFilter('priority')}
            >
              Mayor prioridad
            </button>
            <button
              type="button"
              className={filter === 'sla' ? 'cluster-filter--active' : ''}
              onClick={() => setFilter('sla')}
            >
              Mayor SLA
            </button>
            <button
              type="button"
              className={filter === 'time' ? 'cluster-filter--active' : ''}
              onClick={() => setFilter('time')}
            >
              Mayor tiempo
            </button>
            <button
              type="button"
              className={filter === 'outliers' ? 'cluster-filter--active' : ''}
              onClick={() => setFilter('outliers')}
            >
              Outliers
            </button>
          </div>

          <div className="cluster-summary-list">
            {ranked.slice(0, 5).map((summary) => {
              const insightId = run?.id ? `cluster-${run.id}-${summary.clusterLabel}` : ''
              const selected = selectedIds.has(insightId)
              return (
                <article className="cluster-summary-card" key={summary.clusterLabel}>
                  <div className="cluster-summary-title">
                    <div>
                      <span>
                        {summary.clusterLabel === -1
                          ? 'Outliers'
                          : `Cluster ${summary.clusterLabel}`}
                      </span>
                      <h4>{summary.name}</h4>
                    </div>
                    <strong className={priorityClass(summary.score)}>{summary.priority}</strong>
                  </div>

                  <p>{summary.explanation}</p>

                  <div className="cluster-metrics-grid">
                    <div>
                      <span>Incidencias</span>
                      <strong>{summary.count}</strong>
                    </div>
                    <div>
                      <span>SLA</span>
                      <strong>{formatPct(summary.avgSla)}</strong>
                    </div>
                    <div>
                      <span>Resolucion</span>
                      <strong>{formatHours(summary.avgResolution)}</strong>
                    </div>
                    <div>
                      <span>Riesgo</span>
                      <strong>{formatNumber(summary.avgRisk)}</strong>
                    </div>
                  </div>

                  <div className="cluster-action-row">
                    <p>{summary.recommendation}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="btn-sm"
                      disabled={selected}
                      onClick={() => addCluster(summary)}
                    >
                      {selected ? 'Agregado' : 'Agregar al dashboard'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
    </section>
  )
}
