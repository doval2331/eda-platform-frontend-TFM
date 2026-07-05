import { formatModality } from './runMetrics'
import { sourceTypeLabel } from './projectLabels'

export const DASHBOARD_PAGE_SIZE = 12

export const KIND_COLORS = {
  Riesgo: '#dc2626',
  SLA: '#0f766e',
  Volumen: '#2563eb',
  Tiempo: '#7c3aed',
  Prioridad: '#b45309',
  'Causa raiz': '#0e7490',
  Anomalia: '#be123c',
  Cluster: '#4338ca',
  Decision: '#16a34a',
  Metrica: '#ca8a04',
}

export const KIND_LABELS = {
  Riesgo: 'Riesgo',
  SLA: 'SLA',
  Volumen: 'Volumen',
  Tiempo: 'Tiempo',
  Prioridad: 'Prioridad',
  'Causa raiz': 'Causa raiz',
  Anomalia: 'Anomalia',
  Cluster: 'Grupos',
  Decision: 'Decision',
  Metrica: 'M\u00e9trica',
}

export function formatDate(value) {
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

export function numericValue(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value)
}

export function formatMetric(label, value) {
  const number = numericValue(value)
  if (number == null) return null
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

export function metricKind(label = '') {
  const clean = label.toLowerCase()
  if (clean.includes('decision') || clean.includes('alternative') || clean.includes('alternativa')) {
    return 'Decision'
  }
  if (clean.includes('cluster')) return 'Cluster'
  if (clean.includes('anomaly') || clean.includes('anomalia') || clean.includes('outlier')) {
    return 'Anomalia'
  }
  if (clean.includes('root') || clean.includes('cause') || clean.includes('causa')) {
    return 'Causa raiz'
  }
  if (
    clean.includes('priority') ||
    clean.includes('prioridad') ||
    clean.includes('severity') ||
    clean.includes('severidad')
  ) {
    return 'Prioridad'
  }
  if (clean.includes('sla')) return 'SLA'
  if (clean.includes('resolution') || clean.includes('hours')) return 'Tiempo'
  if (clean.includes('count')) return 'Volumen'
  if (clean.includes('risk') || clean.includes('priority')) return 'Riesgo'
  return 'Metrica'
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] ?? kind
}

export function insightKey(item) {
  return `${item.run_id}-${item.id}`
}

export function truncate(text = '', maxLength = 34) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}...`
}

export function insightRisk(item) {
  const kind = metricKind(item.metric_label)
  const metric = numericValue(item.metric_value)
  if (['Riesgo', 'Cluster', 'Anomalia', 'Decision'].includes(kind) && metric != null) return metric
  return numericValue(item.avg_risk) ?? 0
}

export function insightSla(item) {
  const kind = metricKind(item.metric_label)
  const metric = numericValue(item.metric_value)
  if (kind === 'SLA' && metric != null) return metric <= 1 ? metric * 100 : metric
  const avgSla = numericValue(item.avg_sla_breach_rate)
  return avgSla != null ? avgSla * 100 : 0
}

export function buildMaxByKind(insights) {
  return insights.reduce((acc, item) => {
    const kind = metricKind(item.metric_label)
    const value = Math.abs(numericValue(item.metric_value) ?? 0)
    acc[kind] = Math.max(acc[kind] ?? 0, value)
    return acc
  }, {})
}

export function insightScore(item, maxByKind) {
  const kind = metricKind(item.metric_label)
  const label = String(item.metric_label ?? '').toLowerCase()
  const value = Math.abs(numericValue(item.metric_value) ?? 0)
  if (label.includes('sla') || label.includes('rate')) {
    return Math.min(100, value <= 1 ? value * 100 : value)
  }
  if (label.includes('hours')) {
    return Math.min(100, value * 3)
  }
  if (['Riesgo', 'Cluster', 'Anomalia', 'Decision'].includes(kind)) {
    return Math.min(100, value)
  }
  if (['Prioridad', 'Causa raiz'].includes(kind)) {
    const max = maxByKind[kind] || value || 1
    return Math.min(100, (value / max) * 100)
  }
  const max = maxByKind[kind] || value || 1
  return Math.min(100, (value / max) * 100)
}

export function summarize(insights) {
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

export function countInsightsByKind(insights) {
  return insights.reduce((acc, item) => {
    const kind = metricKind(item.metric_label)
    acc[kind] = (acc[kind] ?? 0) + 1
    return acc
  }, {})
}

export function buildDecisionReading(insights, activeInsight) {
  if (!insights.length) return null
  const maxByKind = buildMaxByKind(insights)
  const topByScore = [...insights].sort(
    (a, b) => insightScore(b, maxByKind) - insightScore(a, maxByKind),
  )[0]
  const topSla = [...insights].sort((a, b) => insightSla(b) - insightSla(a))[0]
  const topRisk = [...insights].sort((a, b) => insightRisk(b) - insightRisk(a))[0]
  const focused = activeInsight ?? topByScore
  const focusRisk = insightRisk(focused)
  const focusSla = insightSla(focused)

  return {
    focused,
    topByScore,
    topSla: insightSla(topSla) > 0 ? topSla : null,
    topRisk: insightRisk(topRisk) > 0 ? topRisk : null,
    focusRisk: focusRisk > 0 ? focusRisk : null,
    focusSla: focusSla > 0 ? focusSla : null,
  }
}

export function runDisplayName(run) {
  if (!run) return 'Ejecuci\u00f3n'
  return (
    run.project_name ??
    run.source_name ??
    (run.source_type ? sourceTypeLabel(run.source_type) : null) ??
    formatModality(run.modality)
  )
}

export function runOptionLabel(run) {
  return `${runDisplayName(run)} \u00b7 ${formatDate(run.created_at ?? run.run_created_at)}`
}

export function buildRunsForFilter(runs, insights) {
  const byId = new Map(runs.map((run) => [run.id, run]))
  const runIds = [...new Set(insights.map((item) => item.run_id).filter(Boolean))]
  return runIds
    .map((id) => {
      const run = byId.get(id)
      if (run) return run
      const sample = insights.find((item) => item.run_id === id)
      return {
        id,
        created_at: sample?.run_created_at,
        modality: sample?.modality,
        reduction_method: sample?.reduction_method,
      }
    })
    .sort((a, b) => {
      const left = new Date(a.created_at ?? 0).getTime()
      const right = new Date(b.created_at ?? 0).getTime()
      return right - left
    })
}

export function paginateDashboardList(items, page = 0, pageSize = DASHBOARD_PAGE_SIZE) {
  const start = page * pageSize
  return items.slice(start, start + pageSize)
}

export function buildChatPrompt(insights) {
  const list = Array.isArray(insights) ? insights : [insights].filter(Boolean)
  if (!list.length) return ''
  if (list.length === 1) {
    const item = list[0]
    return `Quiero profundizar en este hallazgo guardado: "${item.title}". ${item.description ?? ''}`.trim()
  }
  const titles = list.map((item) => `"${item.title}"`).join(', ')
  return `Quiero profundizar en estos hallazgos guardados: ${titles}. Ayudame a priorizarlos y encontrar causas relacionadas.`
}

export function insightPriorityLevel(item, maxByKind) {
  const score = insightScore(item, maxByKind)
  if (score >= 70) return 'alta'
  if (score >= 40) return 'media'
  return 'baja'
}

export function insightSubtitle(item) {
  const text = String(item.description ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= 72) return text
  return `${text.slice(0, 71)}…`
}

const TECHNICAL_DIMENSIONS = new Set([
  'cluster_label',
  'cluster',
  'id',
  'preview',
  'source',
  'run',
  'run_id',
  'index',
  'row_id',
])

function normalizeDimensionName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function ticketCountFromTitle(title) {
  const match = String(title ?? '').match(/\((\d[\d.,]*)\s+tickets?\)/i)
  if (!match) return null
  const parsed = Number(match[1].replace(/[.,]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function clusterSizeFromDescription(description) {
  const match = String(description ?? '').match(/(\d[\d.,]*)\s+registros/i)
  if (!match) return null
  const parsed = Number(match[1].replace(/[.,]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function isClusterInsight(item) {
  const dimension = normalizeDimensionName(item?.dimension || item?.filter_kind)
  return dimension === 'cluster_label' || dimension.startsWith('cluster')
}

export function isTechnicalDimension(item) {
  return isClusterInsight(item) || TECHNICAL_DIMENSIONS.has(
    normalizeDimensionName(item?.dimension || item?.filter_kind),
  )
}

export function isBusinessInsight(item) {
  if (isTechnicalDimension(item)) return false
  const dimension = normalizeDimensionName(item?.dimension || item?.filter_kind)
  const label = String(item?.filter_value ?? '').trim()
  if (!dimension || dimension === 'general') {
    return Boolean(label) && !/^\d+$/.test(label)
  }
  return true
}

export function insightClusterLabel(item) {
  const label = item?.filter_value
  if (label == null || label === '') return null
  return `Grupo ${label}`
}

export function insightClusterSize(item) {
  if (!isClusterInsight(item)) return null
  return (
    ticketCountFromTitle(item.title) ??
    clusterSizeFromDescription(item.description) ??
    null
  )
}

export function insightTicketCount(item) {
  if (isClusterInsight(item)) {
    return insightClusterSize(item)
  }

  const evidence = numericValue(item.evidence_count)
  if (evidence != null && evidence > 0) return evidence
  const label = String(item.metric_label ?? '').toLowerCase()
  if (label.includes('count') || label.includes('volumen') || label.includes('ticket')) {
    const metric = numericValue(item.metric_value)
    if (metric != null && metric > 0) return Math.round(metric)
  }
  return null
}

export function insightSharePercent(item, allItems = []) {
  const tickets = insightTicketCount(item)
  if (tickets == null) return null
  const total = allItems.reduce((sum, entry) => sum + (insightTicketCount(entry) ?? 0), 0)
  if (total <= 0) return null
  return (tickets / total) * 100
}

export function buildDimensionBreakdown(insights) {
  const groups = new Map()
  for (const item of insights) {
    if (!isBusinessInsight(item)) continue

    const dimension = item.dimension || item.filter_kind || 'General'
    const label = item.filter_value || dimension
    const key = `${dimension}::${label}`
    const current = groups.get(key) ?? {
      dimension,
      label,
      count: 0,
      evidence: 0,
    }
    current.count += 1
    current.evidence += insightTicketCount(item) ?? 0
    groups.set(key, current)
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.evidence - a.evidence)
    .slice(0, 10)
}

export function hasClusterInsightData(insights) {
  return insights.some(isClusterInsight)
}

export function hasSegmentedDimensionData(insights) {
  const groups = buildDimensionBreakdown(insights)
  if (!groups.length) return false
  if (groups.length >= 2) return true
  return groups[0].count >= 2
}

export function hasDimensionEvidenceData(insights) {
  const entries = insights
    .filter((item) => isBusinessInsight(item))
    .map((item) => ({ item, tickets: insightTicketCount(item) }))
    .filter((entry) => entry.tickets != null && entry.tickets > 0)

  if (!entries.length) return false
  if (entries.length === 1) return true

  const uniqueCounts = new Set(entries.map((entry) => entry.tickets))
  if (uniqueCounts.size > 1) return true

  const sharedCount = entries[0].tickets
  return !entries.every(
    (entry) => numericValue(entry.item.evidence_count) === sharedCount,
  )
}

export function hasInsightImpactData(insights) {
  const rows = buildInsightImpactRows(insights.filter((item) => isBusinessInsight(item)))
  if (!rows.length) return false
  if (rows.length === 1) return true
  const signature = (row) =>
    `${row.sla ?? 'x'}|${row.risk ?? 'x'}|${row.hours ?? 'x'}`
  return new Set(rows.map(signature)).size > 1
}

export function hasSlaRiskMapData(insights) {
  const business = insights.filter((item) => !isClusterInsight(item))
  if (business.length) {
    return business.some((item) => insightSla(item) > 0 || insightRisk(item) > 0)
  }
  return hasClusterMapData(insights)
}

export function hasClusterVolumeData(insights) {
  return buildClusterVolumeRanking(insights).length > 0
}

export function hasClusterMapData(insights) {
  return buildClusterMapRows(insights).length >= 2
}

export function buildClusterVolumeRanking(insights, maxItems = 10) {
  return [...insights]
    .filter(isClusterInsight)
    .map((item) => ({
      item,
      key: insightKey(item),
      title: truncate(item.title, 42),
      clusterLabel: insightClusterLabel(item),
      size: insightClusterSize(item),
      risk: insightRisk(item),
    }))
    .filter((row) => row.size != null && row.size > 0)
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0) || (b.risk ?? 0) - (a.risk ?? 0))
    .slice(0, maxItems)
}

export function buildClusterRiskRanking(insights, maxItems = 10) {
  return [...insights]
    .filter(isClusterInsight)
    .map((item) => ({
      item,
      key: insightKey(item),
      title: truncate(item.title, 42),
      clusterLabel: insightClusterLabel(item),
      risk: insightRisk(item),
      size: insightClusterSize(item),
    }))
    .filter((row) => row.risk != null && row.risk > 0)
    .sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0) || (b.size ?? 0) - (a.size ?? 0))
    .slice(0, maxItems)
}

export function buildClusterMapRows(insights) {
  return [...insights]
    .filter(isClusterInsight)
    .map((item) => ({
      item,
      key: insightKey(item),
      title: item.title,
      risk: insightRisk(item),
      size: insightClusterSize(item) ?? 1,
    }))
    .filter((row) => row.risk > 0)
}

export function buildPriorityBreakdown(insights) {
  const maxByKind = buildMaxByKind(insights)
  const counts = { alta: 0, media: 0, baja: 0 }
  for (const item of insights) {
    const level = insightPriorityLevel(item, maxByKind)
    counts[level] = (counts[level] ?? 0) + 1
  }
  return Object.entries(counts).filter(([, value]) => value > 0)
}

export function summarizeClusterCoverage(insights) {
  const clusterRows = buildClusterVolumeRanking(insights, insights.length)
  const totalSize = clusterRows.reduce((sum, row) => sum + (row.size ?? 0), 0)
  return {
    clusterCount: clusterRows.length,
    totalRecords: totalSize > 0 ? totalSize : null,
  }
}

export function buildEvidenceRanking(insights, maxItems = 8) {
  return [...insights]
    .filter((item) => isBusinessInsight(item))
    .map((item) => ({
      item,
      key: insightKey(item),
      tickets: insightTicketCount(item),
      score: insightScore(item, buildMaxByKind(insights)),
    }))
    .filter((entry) => entry.tickets != null && entry.tickets > 0)
    .sort((a, b) => (b.tickets ?? 0) - (a.tickets ?? 0) || b.score - a.score)
    .slice(0, maxItems)
}

export function buildInsightImpactRows(insights, maxItems = 8) {
  return [...insights]
    .filter((item) => isBusinessInsight(item))
    .map((item) => ({
      item,
      key: insightKey(item),
      title: truncate(item.title, 36),
      sla:
        numericValue(item.avg_sla_breach_rate) != null
          ? numericValue(item.avg_sla_breach_rate) * 100
          : null,
      risk: numericValue(item.avg_risk),
      hours:
        numericValue(item.avg_resolution_hours) ??
        numericValue(item.avg_resolution_time_hours),
    }))
    .filter((row) => row.sla != null || row.risk != null || row.hours != null)
    .sort((a, b) => {
      const scoreA = (a.sla ?? 0) + (a.risk ?? 0) + (a.hours ?? 0) * 2
      const scoreB = (b.sla ?? 0) + (b.risk ?? 0) + (b.hours ?? 0) * 2
      return scoreB - scoreA
    })
    .slice(0, maxItems)
}

export function buildDimensionTreemapData(insights) {
  if (!hasDimensionEvidenceData(insights)) return null

  const groups = buildDimensionBreakdown(insights).filter((group) => group.evidence > 0)
  if (groups.length < 2) return null

  const byDimension = new Map()
  for (const group of groups) {
    const bucket = byDimension.get(group.dimension) ?? []
    bucket.push(group)
    byDimension.set(group.dimension, bucket)
  }

  const labels = ['Evidencia']
  const parents = ['']
  const values = [0]
  const customdata = [{ kind: 'root' }]

  for (const [dimension, items] of byDimension) {
    const dimEvidence = items.reduce((sum, item) => sum + item.evidence, 0)
    if (dimEvidence <= 0) continue

    labels.push(dimension)
    parents.push('Evidencia')
    values.push(dimEvidence)
    customdata.push({ kind: 'dimension', label: dimension })

    for (const item of items) {
      if (item.evidence <= 0) continue
      labels.push(item.label)
      parents.push(dimension)
      values.push(item.evidence)
      customdata.push({
        kind: 'segment',
        dimension,
        label: item.label,
        count: item.count,
        evidence: item.evidence,
      })
    }
  }

  if (labels.length <= 1) return null

  return { labels, parents, values, customdata }
}
