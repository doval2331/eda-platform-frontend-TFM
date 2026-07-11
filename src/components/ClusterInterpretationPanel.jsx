import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton, Stack, Tooltip, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { fetchRunSelectedInsights, selectRunInsight, selectRunInsights } from '@/api/conversation'
import { insightSavedMessage, insightsSavedMessage } from '@/utils/biFlow'
import {
  AlertBanner,
  Button,
  ClusterInsightCard,
  ClusterInsightDetailDialog,
  Dialog,
  Feedback,
  FilterChips,
  LoadingPanel,
  LoadingSlot,
} from '@/ui'
import '@/ui/results.css'

const GROUPS_TOOLTIP =
  'Grupo o cluster: conjunto de incidencias IT con patrones similares detectado autom\u00e1ticamente por HDBSCAN. No representa usuarios ni equipos de trabajo. Los criterios se calculan con las columnas detectadas en la fuente cargada; si una variable no existe, no aparece como filtro.'

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

function shortClusterTitle(summary) {
  if (summary.clusterLabel === -1) return 'Casos atípicos'
  const anchor = cleanText(summary.anchor)
  const text = normalizeText(anchor)
  if (!anchor || text.startsWith('cluster ')) return `Patrón ${summary.clusterLabel}`
  return anchor
}

function recommendation(summary, criterion) {
  if (summary.clusterLabel === -1) {
    return 'Revisar estos casos uno por uno, porque no siguen el patrón común del resto de incidencias.'
  }
  if (!criterion || criterion.id === 'volume') {
    return 'Comparar este grupo con los demás para entender por qué concentra tantos casos.'
  }

  const role = fieldRole(criterion.field)
  const phrase = businessCriterionPhrase(summary, criterion)
  if (role === 'criticality') {
    return `Revisar una muestra de tickets de este grupo para entender por qué aparecen con ${phrase} y definir si requieren priorización operativa.`
  }
  if (role === 'risk') {
    return `Validar los servicios o áreas afectadas para confirmar si el ${phrase} requiere una acción correctiva.`
  }
  if (role === 'time') {
    return 'Revisar algunos tickets del grupo para identificar causas de demora y posibles cuellos de botella.'
  }
  if (role === 'sla') {
    return 'Comprobar los compromisos de SLA de este grupo y priorizar los casos con mayor incumplimiento.'
  }
  return `Revisar una muestra de tickets para confirmar el patrón observado en ${lowercaseValue(criterion.shortLabel)}.`
}

function anchorExplanation(anchor) {
  const value = cleanText(anchor)
  const text = normalizeText(value)
  if (!value || text.startsWith('cluster ')) return 'con un patrón común'
  return `asociados a ${value}`
}

function explanation(summary, criterion) {
  if (summary.clusterLabel === -1) {
    return `Este grupo contiene ${summary.count} casos atípicos. No se parecen lo suficiente al patrón principal y conviene revisarlos como excepciones.`
  }
  const metricText =
    criterion && criterion.id !== 'volume'
      ? ` La señal más importante es ${businessCriterionPhrase(summary, criterion)}.`
      : ''
  return `Este grupo reúne ${summary.count} incidencias similares, principalmente ${anchorExplanation(summary.anchor)}.${metricText}`
}

function compactMetricChips(summary, criteria, activeCriterion) {
  const chips = [{ label: 'Casos', value: String(summary.count) }]

  if (activeCriterion && activeCriterion.id !== 'volume' && activeCriterion.id !== 'outliers') {
    chips.push({
      label: activeCriterion.shortLabel,
      value: activeCriterion.display(summary),
    })
  }

  for (const [field, stat] of Object.entries(summary.categoricalStats)) {
    if (chips.length >= 3 || !stat?.top) continue
    const label = humanizeField(field)
    if (chips.some((chip) => chip.label === label)) continue
    chips.push({ label, value: stat.top })
  }

  for (const criterion of criteria) {
    if (chips.length >= 3) break
    if (!criterion || criterion.id === activeCriterion?.id) continue
    if (criterion.id === 'outliers' || criterion.id === 'volume') continue
    if (chips.some((chip) => chip.label === criterion.shortLabel)) continue
    chips.push({
      label: criterion.shortLabel,
      value: criterion.display(summary),
    })
  }

  return chips.slice(0, 3)
}

function fullDetailMetrics(summary, activeCriterion) {
  const metrics = [{ label: 'Registros', value: String(summary.count) }]

  if (activeCriterion && activeCriterion.id !== 'outliers' && activeCriterion.id !== 'volume') {
    metrics.push({
      label: activeCriterion.shortLabel,
      value: activeCriterion.display(summary),
    })
  }

  for (const [field, stat] of Object.entries(summary.categoricalStats ?? {})) {
    if (!stat?.top) continue
    const label = humanizeField(field)
    if (metrics.some((metric) => metric.label === label)) continue
    metrics.push({ label, value: stat.top })
  }

  for (const [field, value] of Object.entries(summary.numericStats ?? {})) {
    const label = humanizeField(field)
    if (metrics.some((metric) => metric.label === label)) continue
    metrics.push({ label, value: formatFieldValue(field, value) })
  }

  return metrics
}

function summaryInsightId(runId, summary) {
  if (!runId || !summary) return ''
  return `cluster-${runId}-${summary.clusterLabel}`
}

function insightFromSummary(runId, summary) {
  return {
    id: summaryInsightId(runId, summary),
    title: summary.name ?? summary.shortTitle,
    description: summary.recommendation,
    metric_label: summary.activeCriterion?.shortLabel ?? 'cluster_score',
    metric_value: Number((summary.activeScore ?? 0).toFixed(2)),
    dimension: 'cluster_label',
    filter_kind: 'cluster_label',
    filter_value: String(summary.clusterLabel),
  }
}

export function ClusterInterpretationPanel({ result, run, loading = false }) {
  const navigate = useNavigate()
  const runId = run?.id ?? ''
  const [filter, setFilter] = useState('auto')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [detailSummary, setDetailSummary] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [profilesVisible, setProfilesVisible] = useState(true)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [savedInsights, setSavedInsights] = useState([])
  const [savedDialogOpen, setSavedDialogOpen] = useState(false)

  const metadata = useMemo(() => result?.metadata ?? [], [result])
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
          shortTitle: shortClusterTitle(summary),
          priority: priorityLabel(activeScore),
          recommendation: recommendationText,
          explanation: explanation(summary, activeCriterion),
          criterionLabel: activeCriterion?.label,
          metricChips: compactMetricChips(summary, criteria, activeCriterion),
          detailMetrics: fullDetailMetrics(summary, activeCriterion),
        }
      })
      .sort((a, b) => b.activeScore - a.activeScore || b.count - a.count)
  }, [activeCriterion, criteria, summaries])

  const top = ranked[0]
  const visibleSummaries = ranked.slice(0, 5)
  const availableVisibleIds = runId
    ? visibleSummaries
        .map((summary) => summaryInsightId(runId, summary))
        .filter((id) => id && !selectedIds.has(id))
    : []
  const checkedCurrentIds = runId
    ? ranked
        .map((summary) => summaryInsightId(runId, summary))
        .filter((id) => id && checkedIds.has(id) && !selectedIds.has(id))
    : []
  const checkedCount = checkedCurrentIds.length
  const visibleSavedCount = visibleSummaries.filter((summary) =>
    selectedIds.has(summaryInsightId(runId, summary)),
  ).length
  const hasSavedInsights = savedInsights.length > 0
  const allVisibleChecked =
    availableVisibleIds.length > 0 && availableVisibleIds.every((id) => checkedIds.has(id))

  useEffect(() => {
    let active = true
    if (!runId) {
      setSelectedIds(new Set())
      setCheckedIds(new Set())
      setSavedInsights([])
      return () => {
        active = false
      }
    }

    fetchRunSelectedInsights(runId)
      .then((response) => {
        if (!active) return
        const savedIds = new Set((response?.insights ?? []).map((item) => item.id).filter(Boolean))
        setSavedInsights(response?.insights ?? [])
        setSelectedIds(savedIds)
        setCheckedIds((current) => {
          const next = new Set(current)
          savedIds.forEach((id) => next.delete(id))
          return next
        })
      })
      .catch(() => {
        if (!active) return
        setSelectedIds(new Set())
        setSavedInsights([])
      })

    return () => {
      active = false
    }
  }, [runId])

  function handleFilterChange(nextFilter) {
    setFilter(nextFilter)
    setCheckedIds(new Set())
  }

  function toggleClusterSelection(summary) {
    if (!runId) {
      setError('Ejecuta y guarda una corrida antes de seleccionar grupos.')
      return
    }
    const id = summaryInsightId(runId, summary)
    if (!id || selectedIds.has(id)) return
    setCheckedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleVisibleSelection() {
    if (!runId) {
      setError('Ejecuta y guarda una corrida antes de seleccionar grupos.')
      return
    }
    if (!availableVisibleIds.length) return
    setCheckedIds((current) => {
      const next = new Set(current)
      if (availableVisibleIds.every((id) => next.has(id))) {
        availableVisibleIds.forEach((id) => next.delete(id))
      } else {
        availableVisibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function addCluster(summary) {
    if (!runId) {
      setError('Ejecuta y guarda una corrida antes de agregar clusters al dashboard.')
      return
    }
    const insight = insightFromSummary(runId, summary)
    try {
      await selectRunInsight(runId, insight)
      setSavedInsights((current) =>
        current.some((item) => item.id === insight.id) ? current : [{ ...insight }, ...current],
      )
      setSelectedIds((current) => new Set([...current, insight.id]))
      setCheckedIds((current) => {
        const next = new Set(current)
        next.delete(insight.id)
        return next
      })
      setMessage(insightSavedMessage(summary.shortTitle))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cluster')
    }
  }

  async function addSelectedClusters() {
    if (!runId) {
      setError('Ejecuta y guarda una corrida antes de agregar grupos al dashboard.')
      return
    }
    const pending = ranked.filter((summary) => {
      const id = summaryInsightId(runId, summary)
      return id && checkedIds.has(id) && !selectedIds.has(id)
    })
    if (!pending.length) {
      setMessage('Los grupos seleccionados ya estaban agregados al dashboard.')
      setCheckedIds(new Set())
      return
    }

    setBulkSaving(true)
    setError(null)
    try {
      const insights = pending.map((summary) => insightFromSummary(runId, summary))
      const response = await selectRunInsights(runId, insights)
      const savedIds = insights.map((insight) => insight.id)
      setSavedInsights((current) => {
        const existingIds = new Set(current.map((item) => item.id))
        const next = insights.filter((insight) => !existingIds.has(insight.id))
        return next.length ? [...next, ...current] : current
      })
      setSelectedIds((current) => new Set([...current, ...savedIds]))
      setCheckedIds((current) => {
        const next = new Set(current)
        savedIds.forEach((id) => next.delete(id))
        return next
      })
      setMessage(insightsSavedMessage(response?.saved ?? savedIds.length))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los grupos seleccionados')
    } finally {
      setBulkSaving(false)
    }
  }

  if (loading) {
    return (
      <LoadingSlot variant="panel">
        <LoadingPanel bare compact title="Analizando incidencias…" />
      </LoadingSlot>
    )
  }

  if (!result?.cluster_labels?.length) {
    return (
      <section className="cluster-insights cluster-insights--empty">
        <Typography variant="h6" component="h3">
          Lectura guiada de grupos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ejecuta el pipeline para ver una interpretación automática de las incidencias agrupadas.
        </Typography>
      </section>
    )
  }

  return (
    <section className="cluster-insights-premium">
      <div className="cluster-insights-premium__header">
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="h6" component="h3">
            Lectura guiada de grupos
          </Typography>
          <Tooltip title={GROUPS_TOOLTIP} arrow>
            <IconButton size="small" aria-label="Información sobre grupos y criterios">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Tooltip
          title={profilesVisible ? 'Ocultar lectura de grupos' : 'Mostrar lectura de grupos'}
          arrow
        >
          <IconButton
            size="small"
            aria-label={profilesVisible ? 'Ocultar lectura de grupos' : 'Mostrar lectura de grupos'}
            onClick={() => {
              setProfilesVisible((visible) => !visible)
              setDetailSummary(null)
            }}
          >
            {profilesVisible ? (
              <VisibilityOffOutlinedIcon fontSize="small" />
            ) : (
              <VisibilityOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </div>

      {profilesVisible ? (
        <>
      <Feedback
        open={Boolean(message)}
        variant="success"
        message={message ?? ''}
        position="top-center"
        onClose={() => setMessage(null)}
      />
      <Feedback
        open={Boolean(error)}
        variant="danger"
        message={error ?? ''}
        position="top-center"
        onClose={() => setError(null)}
      />

      {top ? (
        <AlertBanner severity="info">
          <strong>Destacado:</strong>{' '}
          {top.clusterLabel === -1
            ? `Casos atípicos · ${top.count} incidencias · Prioridad ${top.priority}`
            : `Grupo ${top.clusterLabel} · ${top.shortTitle} · ${top.count} incidencias · Prioridad ${top.priority}`}
        </AlertBanner>
      ) : null}

      {hasSavedInsights ? (
        <div className="cluster-insights-premium__next-step" role="status">
          <div>
            <strong>{savedInsights.length} hallazgos listos para consolidar</strong>
            <span>
              Revisa el Dashboard Conversacional con estos hallazgos como base de evidencia.
            </span>
          </div>
          <Button type="button" size="small" onClick={() => navigate('/?step=consolidate')}>
            Ir al Dashboard Conversacional
          </Button>
        </div>
      ) : null}
      <div className="cluster-insights-premium__filter-row">
      <FilterChips
        options={criteria.map((criterion) => ({
          value: criterion.id,
          label: criterion.label,
        }))}
        value={activeFilter}
        onChange={handleFilterChange}
        ariaLabel="Criterios dinámicos de grupos"
      />

        <Button
          type="button"
          variant="secondary"
          size="small"
          disabled={!runId}
          onClick={() => setSavedDialogOpen(true)}
        >
          Grupos guardados ({savedInsights.length})
        </Button>
      </div>

      <div className="cluster-insights-premium__bulk" role="group" aria-label="Seleccion multiple de grupos">
        <div>
          <strong>
            {checkedCount > 0
              ? `${checkedCount} grupo${checkedCount === 1 ? '' : 's'} seleccionado${checkedCount === 1 ? '' : 's'}`
              : 'Seleccion multiple'}
          </strong>
          <span>
            {checkedCount > 0
              ? 'Agrega los grupos marcados al dashboard conversacional.'
              : visibleSavedCount > 0
                ? `${visibleSavedCount} de ${visibleSummaries.length} grupos visibles ya estan guardados en el dashboard conversacional.`
                : 'Marca algunos grupos o selecciona todos los visibles del criterio actual.'}
          </span>
        </div>
        <div className="cluster-insights-premium__bulk-actions">
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={!runId || bulkSaving || availableVisibleIds.length === 0}
            onClick={toggleVisibleSelection}
          >
            {allVisibleChecked ? 'Quitar visibles' : `Seleccionar visibles (${availableVisibleIds.length})`}
          </Button>
          <Button
            type="button"
            size="small"
            disabled={!runId || bulkSaving || checkedCount === 0}
            onClick={addSelectedClusters}
          >
            {bulkSaving ? 'Agregando...' : `Agregar seleccionados (${checkedCount})`}
          </Button>
        </div>
      </div>

      <div className="cluster-insights-premium__list">
        {visibleSummaries.map((summary) => {
          const insightId = summaryInsightId(runId, summary)
          const selected = selectedIds.has(insightId)
          const checked = checkedIds.has(insightId)
          return (
            <ClusterInsightCard
              key={summary.clusterLabel}
              clusterLabel={summary.clusterLabel}
              title={summary.shortTitle}
              priority={summary.priority}
              score={summary.activeScore}
              metricChips={summary.metricChips}
              selectable
              selected={checked}
              selectionDisabled={!runId || selected || bulkSaving}
              onSelectChange={() => toggleClusterSelection(summary)}
              onViewDetail={() => setDetailSummary(summary)}
              saved={selected}
              actionLabel={selected ? 'Agregado' : 'Agregar al dashboard'}
              actionDisabled={selected || bulkSaving}
              onAction={() => addCluster(summary)}
            />
          )
        })}
      </div>

      <ClusterInsightDetailDialog
        open={Boolean(detailSummary)}
        onClose={() => setDetailSummary(null)}
        clusterLabel={detailSummary?.clusterLabel ?? 0}
        title={detailSummary?.shortTitle ?? ''}
        fullTitle={detailSummary?.name}
        priority={detailSummary?.priority ?? 'Baja'}
        score={detailSummary?.activeScore ?? 0}
        criterionLabel={detailSummary?.criterionLabel}
        summary={detailSummary?.explanation}
        recommendation={detailSummary?.recommendation}
        metrics={detailSummary?.detailMetrics ?? []}
        onAddToDashboard={
          detailSummary && runId
            ? () => {
                void addCluster(detailSummary)
                setDetailSummary(null)
              }
            : undefined
        }
        addDisabled={
          detailSummary && runId
            ? selectedIds.has(summaryInsightId(runId, detailSummary))
            : false
        }
        addLabel={
          detailSummary && runId && selectedIds.has(summaryInsightId(runId, detailSummary))
            ? 'Agregado'
            : 'Agregar al dashboard'
        }
      />
      <Dialog
        open={savedDialogOpen}
        onClose={() => setSavedDialogOpen(false)}
        title="Grupos guardados"
        description="Estos grupos ya fueron enviados como hallazgos al Dashboard Conversacional."
        size="wide"
      >
        {savedInsights.length ? (
          <div className="cluster-saved-list">
            {savedInsights.map((insight) => (
              <article className="cluster-saved-list__item" key={insight.id}>
                <div>
                  <strong>{insight.title}</strong>
                  <span>{insight.description || 'Sin descripcion disponible.'}</span>
                </div>
                <div className="cluster-saved-list__meta">
                  {insight.filter_value ? <span>Grupo {insight.filter_value}</span> : null}
                  {insight.metric_label ? <span>{insight.metric_label}</span> : null}
                  {insight.metric_value != null ? <span>{insight.metric_value}</span> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="cluster-saved-list__empty">
            Todavia no hay grupos guardados para esta ejecucion.
          </p>
        )}
      </Dialog>
        </>
      ) : null}
    </section>
  )
}
