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
  Cluster: 'Cluster',
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

export function insightTicketCount(item) {
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

export function insightSubtitle(item) {
  const text = String(item.description ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= 72) return text
  return `${text.slice(0, 71)}…`
}
