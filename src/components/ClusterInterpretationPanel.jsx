import { useMemo, useState } from 'react'
import { selectRunInsight } from '../api/conversation'
import { Button, Feedback } from '../ui'

const FALLBACK_FIELDS = [
  'sla_breach_rate',
  'sla_incumplido',
  'sla_breached',
  'tiempo_resolucion_horas',
  'avg_resolution_hours',
  'resolution_minutes',
  'operational_risk_score',
  'business_impact_score',
  'prioridad',
  'priority',
  'severity',
  'categoria',
  'category',
  'servicio_afectado',
  'affected_service',
  'assignment_group',
  'status',
]

function toNumber(value) {
  if (value === true) return 1
  if (value === false) return 0
  if (typeof value === 'string') {
    const cleaned = value.replace('%', '').replace(',', '.').trim()
    if (!cleaned) return null
    const number = Number(cleaned)
    return Number.isFinite(number) ? number : null
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function average(values) {
  const numbers = values.map(toNumber).filter((value) => value != null)
  if (!numbers.length) return null
  return numbers.reduce((acc, value) => acc + value, 0) / numbers.length
}

function cleanText(value) {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function humanizeField(field) {
  return cleanText(field)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function featureValue(item, field) {
  if (item?.features && Object.prototype.hasOwnProperty.call(item.features, field)) {
    return item.features[field]
  }
  return item?.[field]
}

function formatPct(value) {
  if (value == null) return 'sin dato'
  const pct = Math.abs(value) <= 1 ? value * 100 : value
  return `${pct.toFixed(1)}%`
}

function formatNumber(value) {
  if (value == null) return 'sin dato'
  if (Math.abs(value) >= 100) return value.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

function formatFieldValue(field, value) {
  if (value == null) return 'sin dato'
  const role = fieldRole(field)
  const norm = normalizeText(field)
  if (role === 'sla') return formatPct(value)
  if (role === 'time') {
    if (norm.includes('minute') || norm.includes('minuto')) return `${formatNumber(value)} min`
    return `${formatNumber(value)} h`
  }
  return formatNumber(value)
}

function topValue(items, field) {
  const counts = new Map()
  items.forEach((item) => {
    const value = cleanText(featureValue(item, field))
    if (!value) return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })
  if (!counts.size) return null
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function severityScore(value) {
  const text = normalizeText(value)
  if (!text) return null
  const leadingNumber = text.match(/^\s*(\d+)/)?.[1]
  if (leadingNumber) {
    const numeric = Number(leadingNumber)
    if (numeric === 1) return 100
    if (numeric === 2) return 80
    if (numeric === 3) return 55
    if (numeric === 4) return 30
    if (numeric >= 5) return 15
  }
  if (/crit|urgent|blocker|alta|high|severa|grave/.test(text)) return 90
  if (/media|medium|moderad/.test(text)) return 55
  if (/baja|low|menor|minor|planif/.test(text)) return 25
  return null
}

function fieldRole(field) {
  const text = normalizeText(field)
  if (/sla|breach|incumpl|cumpl/.test(text)) return 'sla'
  if (/prioridad|priority|urgencia|severity|critic/.test(text)) return 'criticality'
  if (/impacto|impact|riesgo|risk|valor|cost|coste|downtime|caida/.test(text)) return 'risk'
  if (/tiempo|duracion|duration|resolution|resolucion|resuelto|work|trabajo|hora|minut/.test(text)) {
    return 'time'
  }
  return 'generic'
}

function collectFieldCatalog(metadata) {
  const fields = new Set(FALLBACK_FIELDS)
  metadata.forEach((item) => {
    Object.keys(item?.features ?? {}).forEach((field) => fields.add(field))
  })

  const numericFields = []
  const categoricalFields = []
  for (const field of fields) {
    const values = metadata
      .map((item) => featureValue(item, field))
      .filter((value) => cleanText(value) !== '')
    if (!values.length) continue

    const numbers = values.map(toNumber).filter((value) => value != null)
    const unique = new Set(values.map((value) => cleanText(value))).size
    const mostlyNumeric = numbers.length >= Math.max(3, Math.ceil(values.length * 0.6))
    if (mostlyNumeric && unique > 1) {
      const min = Math.min(...numbers)
      const max = Math.max(...numbers)
      numericFields.push({
        field,
        label: humanizeField(field),
        role: fieldRole(field),
        min,
        max,
      })
    } else if (unique > 1 && unique <= 60) {
      categoricalFields.push({
        field,
        label: humanizeField(field),
        role: fieldRole(field),
      })
    }
  }

  return { numericFields, categoricalFields }
}

function groupedByCluster(result) {
  const labels = result?.cluster_labels ?? []
  const metadata = result?.metadata ?? []
  return labels.reduce((acc, label, index) => {
    const clusterLabel = Number(label)
    if (!acc.has(clusterLabel)) acc.set(clusterLabel, [])
    acc.get(clusterLabel).push(metadata[index] ?? {})
    return acc
  }, new Map())
}

function buildSummaries(result, catalog) {
  const grouped = groupedByCluster(result)
  return [...grouped.entries()].map(([clusterLabel, items]) => {
    const numericStats = {}
    for (const fieldInfo of catalog.numericFields) {
      const avg = average(items.map((item) => featureValue(item, fieldInfo.field)))
      if (avg != null) numericStats[fieldInfo.field] = avg
    }

    const categoricalStats = {}
    for (const fieldInfo of catalog.categoricalFields) {
      const top = topValue(items, fieldInfo.field)
      const scored = items
        .map((item) => severityScore(featureValue(item, fieldInfo.field)))
        .filter((value) => value != null)
      const scoreAvg = scored.length
        ? scored.reduce((acc, value) => acc + value, 0) / scored.length
        : null
      if (top) categoricalStats[fieldInfo.field] = { top, scoreAvg }
    }

    const anchorFields = [
      'servicio_afectado',
      'affected_service',
      'Catálogo',
      'Catalogo',
      'categoria',
      'category',
    ]
    const anchor =
      anchorFields.map((field) => categoricalStats[field]?.top).find(Boolean) ||
      Object.values(categoricalStats)[0]?.top ||
      `cluster ${clusterLabel}`

    return {
      clusterLabel,
      count: items.length,
      numericStats,
      categoricalStats,
      anchor,
    }
  })
}

function normalizeMetric(value, min, max) {
  if (value == null) return 0
  if (max === min) return value ? 50 : 0
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

function buildCriteria(summaries, catalog) {
  const criteria = []
  const usedFields = new Set()

  function addNumeric(fieldInfo, customLabel = null) {
    if (!fieldInfo || usedFields.has(fieldInfo.field)) return
    usedFields.add(fieldInfo.field)
    criteria.push({
      id: `num:${fieldInfo.field}`,
      label: customLabel ?? `Mayor ${fieldInfo.label}`,
      shortLabel: fieldInfo.label,
      field: fieldInfo.field,
      value: (summary) => summary.numericStats[fieldInfo.field],
      normalized: (summary) =>
        normalizeMetric(summary.numericStats[fieldInfo.field], fieldInfo.min, fieldInfo.max),
      display: (summary) => formatFieldValue(fieldInfo.field, summary.numericStats[fieldInfo.field]),
    })
  }

  function addCategorical(fieldInfo, customLabel = null) {
    if (!fieldInfo || usedFields.has(fieldInfo.field)) return
    const hasScore = summaries.some(
      (summary) => summary.categoricalStats[fieldInfo.field]?.scoreAvg != null,
    )
    if (!hasScore) return
    usedFields.add(fieldInfo.field)
    criteria.push({
      id: `cat:${fieldInfo.field}`,
      label: customLabel ?? `Mayor ${fieldInfo.label}`,
      shortLabel: fieldInfo.label,
      field: fieldInfo.field,
      value: (summary) => summary.categoricalStats[fieldInfo.field]?.scoreAvg,
      normalized: (summary) => summary.categoricalStats[fieldInfo.field]?.scoreAvg ?? 0,
      display: (summary) => summary.categoricalStats[fieldInfo.field]?.top ?? 'sin dato',
    })
  }

  const byRole = (role) => ({
    numeric: catalog.numericFields.find((field) => field.role === role),
    categorical: catalog.categoricalFields.find((field) => field.role === role),
  })

  const criticality = byRole('criticality')
  addCategorical(criticality.categorical, 'Mayor criticidad')
  addNumeric(criticality.numeric, 'Mayor criticidad')

  const risk = byRole('risk')
  addNumeric(risk.numeric, 'Mayor impacto/riesgo')
  addCategorical(risk.categorical, 'Mayor impacto/riesgo')

  const sla = byRole('sla')
  addNumeric(sla.numeric, 'Mayor SLA')
  addCategorical(sla.categorical, 'Mayor SLA')

  const time = byRole('time')
  addNumeric(time.numeric, 'Mayor tiempo')

  catalog.numericFields
    .filter((field) => !usedFields.has(field.field))
    .slice(0, 2)
    .forEach((field) => addNumeric(field))

  const maxCount = Math.max(1, ...summaries.map((summary) => summary.count))
  criteria.push({
    id: 'volume',
    label: 'Mas casos',
    shortLabel: 'Incidencias',
    value: (summary) => summary.count,
    normalized: (summary) => (summary.count / maxCount) * 100,
    display: (summary) => String(summary.count),
  })

  const outlierCriterion = summaries.some((summary) => summary.clusterLabel === -1)
    ? {
      id: 'outliers',
      label: 'Outliers',
      shortLabel: 'Outliers',
      value: (summary) => (summary.clusterLabel === -1 ? summary.count : null),
      normalized: (summary) => (summary.clusterLabel === -1 ? 100 : 0),
      display: (summary) => (summary.clusterLabel === -1 ? String(summary.count) : 'sin dato'),
      filter: (summary) => summary.clusterLabel === -1,
    }
    : null

  const visibleCriteria = criteria.slice(0, outlierCriterion ? 5 : 6)
  return outlierCriterion ? [...visibleCriteria, outlierCriterion] : visibleCriteria
}

function priorityLabel(score) {
  if (score >= 70) return 'Alta'
  if (score >= 35) return 'Media'
  return 'Baja'
}

function priorityClass(score) {
  if (score >= 70) return 'cluster-priority--high'
  if (score >= 35) return 'cluster-priority--medium'
  return 'cluster-priority--low'
}

function lowercaseValue(value) {
  return cleanText(value).toLowerCase()
}

function readableLevel(value) {
  const text = normalizeText(value)
  if (/alta|alto|high|critical|critica|critico|urgent|urgente|grave|severa|severo/.test(text)) {
    return 'alta'
  }
  if (/media|medio|medium|moderada|moderado/.test(text)) return 'media'
  if (/baja|bajo|low|menor|minor/.test(text)) return 'baja'
  return lowercaseValue(value)
}

function anchorPhrase(anchor) {
  const value = cleanText(anchor)
  const text = normalizeText(value)
  if (!value || text.startsWith('cluster ')) return 'con comportamiento similar'

  const known = {
    industrial: 'industriales',
    industria: 'industriales',
    energia: 'de energia',
    energetico: 'de energia',
    energetica: 'de energia',
    cloud: 'de cloud',
    backup: 'de backup',
    seguridad: 'de seguridad',
    red: 'de red',
    redes: 'de red',
    infraestructura: 'de infraestructura',
    usuarios: 'de usuarios',
  }
  if (known[text]) return known[text]
  return `relacionadas con ${lowercaseValue(value)}`
}

function anchorExplanation(anchor) {
  const value = cleanText(anchor)
  const text = normalizeText(value)
  if (!value || text.startsWith('cluster ')) return 'con un patron comun'
  return `asociados a ${value}`
}

function businessCriterionPhrase(summary, criterion) {
  if (!criterion || criterion.id === 'volume') return 'mayor volumen de casos'
  if (criterion.id === 'outliers') return 'casos atipicos'

  const role = fieldRole(criterion.field)
  const field = normalizeText(criterion.shortLabel)
  const displayedValue = criterion.display(summary)
  const level = readableLevel(displayedValue)

  if (role === 'criticality') {
    if (field.includes('urgencia')) return `urgencia ${level}`
    if (field.includes('prioridad')) return `prioridad ${level}`
    if (field.includes('severity') || field.includes('severidad')) return `severidad ${level}`
    return `criticidad ${level}`
  }
  if (role === 'risk') {
    if (field.includes('impact')) return `impacto ${level}`
    if (field.includes('riesgo') || field.includes('risk')) return `riesgo ${level}`
    return `impacto o riesgo ${level}`
  }
  if (role === 'sla') return 'posible incumplimiento de SLA'
  if (role === 'time') return 'mayor tiempo de atencion'
  return `${lowercaseValue(criterion.shortLabel)}: ${displayedValue}`
}

function clusterName(summary, criterion) {
  if (summary.clusterLabel === -1) return 'Casos atipicos a revisar'
  if (!criterion || criterion.id === 'volume') {
    return `Grupo de incidencias ${anchorPhrase(summary.anchor)}`
  }
  return `Grupo de incidencias ${anchorPhrase(summary.anchor)} con ${businessCriterionPhrase(summary, criterion)}`
}

function recommendation(summary, criterion) {
  if (summary.clusterLabel === -1) {
    return 'Accion recomendada: revisar estos casos uno por uno, porque no siguen el patron comun del resto de incidencias.'
  }
  if (!criterion || criterion.id === 'volume') {
    return 'Accion recomendada: comparar este grupo con los demas para entender por que concentra tantos casos.'
  }

  const role = fieldRole(criterion.field)
  const phrase = businessCriterionPhrase(summary, criterion)
  if (role === 'criticality') {
    return `Accion recomendada: revisar una muestra de tickets de este grupo para entender por que aparecen con ${phrase} y definir si requieren priorizacion operativa.`
  }
  if (role === 'risk') {
    return `Accion recomendada: validar los servicios o areas afectadas para confirmar si el ${phrase} requiere una accion correctiva.`
  }
  if (role === 'time') {
    return 'Accion recomendada: revisar algunos tickets del grupo para identificar causas de demora y posibles cuellos de botella.'
  }
  if (role === 'sla') {
    return 'Accion recomendada: comprobar los compromisos de SLA de este grupo y priorizar los casos con mayor incumplimiento.'
  }
  return `Accion recomendada: revisar una muestra de tickets para confirmar el patron observado en ${lowercaseValue(criterion.shortLabel)}.`
}

function explanation(summary, criterion, score) {
  if (summary.clusterLabel === -1) {
    return `Este grupo contiene ${summary.count} casos atipicos. No se parecen lo suficiente al patron principal y conviene revisarlos como excepciones.`
  }
  const metricText = criterion && criterion.id !== 'volume'
    ? ` La senal mas importante es ${businessCriterionPhrase(summary, criterion)}.`
    : ''
  return `Este grupo reune ${summary.count} incidencias similares, principalmente ${anchorExplanation(summary.anchor)}.${metricText}`
}

function metricCards(summary, criteria, activeCriterion) {
  const cards = [{ label: 'Registros', value: String(summary.count) }]
  const metricCriteria = [
    activeCriterion,
    ...criteria.filter((criterion) => criterion.id !== activeCriterion?.id),
  ]
    .filter((criterion) => criterion && criterion.id !== 'outliers' && criterion.id !== 'volume')
    .slice(0, 3)

  for (const criterion of metricCriteria) {
    cards.push({
      label: criterion.shortLabel,
      value: criterion.display(summary),
    })
  }

  if (cards.length < 4) {
    for (const [field, stat] of Object.entries(summary.categoricalStats)) {
      if (cards.length >= 4) break
      if (!stat?.top) continue
      const label = humanizeField(field)
      if (cards.some((card) => card.label === label)) continue
      cards.push({ label, value: stat.top })
    }
  }

  return cards.slice(0, 4)
}

function insightFromSummary(runId, summary) {
  return {
    id: `cluster-${runId}-${summary.clusterLabel}`,
    title: summary.name,
    description: `${summary.explanation} Recomendacion: ${summary.recommendation}`,
    metric_label: summary.activeCriterion?.shortLabel ?? 'cluster_score',
    metric_value: Number((summary.activeScore ?? 0).toFixed(2)),
    dimension: 'cluster_label',
    filter_kind: 'cluster_label',
    filter_value: String(summary.clusterLabel),
  }
}

export function ClusterInterpretationPanel({ result, run }) {
  const [filter, setFilter] = useState('auto')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const metadata = result?.metadata ?? []
  const catalog = useMemo(() => collectFieldCatalog(metadata), [metadata])
  const summaries = useMemo(() => buildSummaries(result, catalog), [result, catalog])
  const criteria = useMemo(() => buildCriteria(summaries, catalog), [summaries, catalog])
  const activeFilter = criteria.some((criterion) => criterion.id === filter)
    ? filter
    : criteria[0]?.id
  const activeCriterion = criteria.find((criterion) => criterion.id === activeFilter)

  const ranked = useMemo(() => {
    if (!activeCriterion) return summaries
    return [...summaries]
      .filter((summary) => (activeCriterion.filter ? activeCriterion.filter(summary) : true))
      .map((summary) => {
        const activeScore = activeCriterion.normalized(summary)
        const name = clusterName(summary, activeCriterion)
        const recommendationText = recommendation(summary, activeCriterion)
        return {
          ...summary,
          activeScore,
          activeCriterion,
          name,
          priority: priorityLabel(activeScore),
          recommendation: recommendationText,
          explanation: explanation(summary, activeCriterion, activeScore),
          metricCards: metricCards(summary, criteria, activeCriterion),
        }
      })
      .sort((a, b) => b.activeScore - a.activeScore || b.count - a.count)
  }, [activeCriterion, criteria, summaries])

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
        <h3>Lectura guiada de grupos</h3>
        <p>Ejecuta el pipeline para ver una interpretacion automatica de las incidencias agrupadas.</p>
      </section>
    )
  }

  return (
    <section className="cluster-insights">
      <div className="cluster-insights-header">
        <div>
          <h3>Lectura guiada de grupos</h3>
          <p>
            Los criterios se calculan con las columnas detectadas en la fuente cargada y los
            resultados del agrupamiento. Si una variable no existe, no se muestra como filtro.
          </p>
        </div>
        {top ? (
          <div className={`cluster-priority ${priorityClass(top.activeScore)}`}>
            <span>Grupo destacado</span>
            <strong>{top.name}</strong>
          </div>
        ) : null}
      </div>

      {message ? <Feedback variant="success" message={message} /> : null}
      {error ? <Feedback variant="danger" message={error} /> : null}

      <div className="cluster-filter-row" aria-label="Criterios dinamicos de grupos">
        {criteria.map((criterion) => (
          <button
            key={criterion.id}
            type="button"
            className={activeFilter === criterion.id ? 'cluster-filter--active' : ''}
            onClick={() => setFilter(criterion.id)}
          >
            {criterion.label}
          </button>
        ))}
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
                    {summary.clusterLabel === -1 ? 'Casos atipicos' : `Grupo ${summary.clusterLabel}`}
                  </span>
                  <h4>{summary.name}</h4>
                </div>
                <strong className={priorityClass(summary.activeScore)}>{summary.priority}</strong>
              </div>

              <p>{summary.explanation}</p>

              <div className="cluster-metrics-grid">
                {summary.metricCards.map((card) => (
                  <div key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </div>
                ))}
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
