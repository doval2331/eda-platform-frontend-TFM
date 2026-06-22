import { isLlmEnrichedInsight } from '@/components/LlmVisual'
import { normalizeStrategyVariableName, uniqueBusinessVariables } from './strategyPresentation'

function parseJsonList(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cleanInsightText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function titleCase(value) {
  const text = cleanInsightText(value)
  if (!text) return ''
  return text
    .split(' ')
    .map((word) => (word.length <= 3 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join(' ')
}

function isWeakInsightValue(value) {
  const text = normalizeStrategyVariableName(value)
  return (
    !text ||
    /^0(\.0+)?$/.test(text) ||
    /sin .*dominante|sin dato|no disponible|none|null|undefined|nan/.test(text)
  )
}

function parseCharacteristicsText(value) {
  const facts = {}
  const rawItems = cleanInsightText(value)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  rawItems.forEach((part) => {
    const [rawKey, ...rest] = part.split(':')
    if (rest.length) {
      facts[normalizeStrategyVariableName(rawKey)] = cleanInsightText(rest.join(':'))
      return
    }
    const count = part.match(/(\d[\d.,]*)\s+(evidencias|registros|tickets|incidencias)/i)
    if (count) facts.count = count[1]
  })
  return facts
}

function firstUsefulFact(facts, patterns) {
  for (const [key, value] of Object.entries(facts)) {
    if (patterns.some((pattern) => pattern.test(key)) && !isWeakInsightValue(value)) return value
  }
  return ''
}

export function insightFacts(item) {
  const facts = parseCharacteristicsText(item.main_characteristics)
  const summary = cleanInsightText(item.summary)
  if (!facts.count) {
    const count = summary.match(/con\s+(\d[\d.,]*)\s+(evidencias|registros|tickets|incidencias)/i)
    if (count) facts.count = count[1]
  }
  return {
    count: facts.count || item.sample_size || '',
    category: firstUsefulFact(facts, [/categoria/, /category/, /catalogo/, /sector/]),
    service: firstUsefulFact(facts, [/servicio/, /service/, /aplicacion/, /sistema/]),
    criticality: firstUsefulFact(facts, [/urgencia/, /prioridad/, /severity/, /severidad/, /critic/]),
    assignmentGroup: firstUsefulFact(facts, [/assignment/, /responsable/, /grupo/]),
    sla: firstUsefulFact(facts, [/sla/]),
    resolution: firstUsefulFact(facts, [/resolucion/, /duracion/, /tiempo/]),
    risk: firstUsefulFact(facts, [/riesgo/, /risk/, /impacto/, /impact/]),
  }
}

function insightRiskText(level) {
  const key = normalizeStrategyVariableName(level)
  if (/alto|alta|high/.test(key)) return 'prioridad alta'
  if (/medio|media|medium/.test(key)) return 'prioridad media'
  if (/bajo|baja|low/.test(key)) return 'prioridad baja'
  return 'prioridad por revisar'
}

function friendlyCriticality(value) {
  const text = cleanInsightText(value)
  const key = normalizeStrategyVariableName(text)
  if (!text || isWeakInsightValue(text)) return ''
  if (/critica|critico|critical/.test(key)) return 'criticidad critica'
  if (/alto|alta|high/.test(key)) return 'urgencia alta'
  if (/medio|media|medium/.test(key)) return 'urgencia media'
  if (/bajo|baja|low/.test(key)) return 'urgencia baja'
  return text.toLowerCase()
}

export function businessInsightTitle(item) {
  const facts = insightFacts(item)
  const isOutlier =
    Number(item.cluster_label) === -1 || normalizeStrategyVariableName(item.cluster_name).includes('outlier')
  if (isOutlier) return 'Casos atipicos para revisar'

  const category = titleCase(facts.category)
  const service = titleCase(facts.service)
  const criticality = friendlyCriticality(facts.criticality)

  if (category && criticality) return `${category} con ${criticality}`
  if (category && service) return `${category} en ${service}`
  if (service) return `Incidencias en ${service}`
  if (category) return `Incidencias de ${category}`
  return facts.count ? `Patron similar (${facts.count} tickets)` : 'Patron sin etiqueta clara'
}

export function businessInsightLead(item) {
  const facts = insightFacts(item)
  const countText = facts.count ? `${facts.count} registros` : 'varios registros'
  const anchor = [facts.category, facts.service].filter(Boolean).join(' / ')
  const riskText = insightRiskText(item.risk_level)
  if (anchor) {
    return `Este grupo reune ${countText} con un patron parecido. La senal principal detectada es ${anchor}. La app lo marca como ${riskText}.`
  }
  return `La app encontro ${countText} que se parecen entre si. Todavia no hay una etiqueta de negocio clara, por eso conviene revisar algunos ejemplos antes de sacar conclusiones.`
}

export function businessInsightWhy(item) {
  const facts = insightFacts(item)
  const riskText = insightRiskText(item.risk_level)
  const timeText = facts.resolution && !isWeakInsightValue(facts.resolution) ? ` Tiempo medio: ${facts.resolution}.` : ''
  const slaText = facts.sla && !isWeakInsightValue(facts.sla) ? ` SLA: ${facts.sla}.` : ''
  if (/alta/.test(riskText)) {
    return `Por que importa: puede concentrar casos urgentes o de mayor impacto.${slaText}${timeText}`
  }
  if (/media/.test(riskText)) {
    return `Por que importa: ayuda a detectar recurrencias que conviene monitorear.${slaText}${timeText}`
  }
  if (facts.category || facts.service) {
    return `Por que importa: sirve como perfil de referencia y para comparar contra grupos mas criticos.${slaText}${timeText}`
  }
  return `Por que importa: puede revelar un patron que las columnas actuales no nombran bien.${slaText}${timeText}`
}

export function businessInsightAction(item) {
  const facts = insightFacts(item)
  const genericRecommendation = cleanInsightText(item.recommendations)
  const weakRecommendation = /sin categoria dominante|sin servicio dominante/i.test(genericRecommendation)
  if (genericRecommendation && !weakRecommendation) return genericRecommendation
  const anchor = [facts.category, facts.service, facts.assignmentGroup].filter(Boolean).join(' / ')
  if (anchor) {
    return `Revisar muestra de tickets de ${anchor} y confirmar si comparten causa.`
  }
  return 'Abrir ejemplos del grupo y validar si el patron tiene sentido de negocio.'
}

export function businessInsightMetrics(item) {
  const facts = insightFacts(item)
  return [
    { label: 'Tema', value: [facts.category, facts.service].filter(Boolean).join(' / ') },
    { label: 'Urgencia', value: friendlyCriticality(facts.criticality) || insightRiskText(item.risk_level) },
    { label: 'SLA', value: facts.sla },
    { label: 'Tiempo', value: facts.resolution },
  ].filter((metric) => metric.value && !isWeakInsightValue(metric.value))
}

export function businessInsightVariables(item) {
  return uniqueBusinessVariables(parseJsonList(item.highlighted_variables)).slice(0, 8)
}

function numericInsightValue(value) {
  const match = cleanInsightText(value).replace(',', '.').match(/-?\d+(\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : 0
}

export function insightRiskRank(item) {
  const key = normalizeStrategyVariableName(item?.risk_level)
  if (/alto|alta|high/.test(key)) return 3
  if (/medio|media|medium/.test(key)) return 2
  if (/bajo|baja|low/.test(key)) return 1
  return 0
}

function insightRecordCount(item) {
  const facts = insightFacts(item)
  return numericInsightValue(facts.count) || Number(item.sample_size ?? 0) || 0
}

export function insightHasClearSignal(item) {
  const facts = insightFacts(item)
  return Boolean(facts.category || facts.service || facts.criticality || facts.risk)
}

export function insightPriorityScore(item) {
  const facts = insightFacts(item)
  return (
    insightRiskRank(item) * 100000 +
    (insightHasClearSignal(item) ? 10000 : 0) +
    numericInsightValue(facts.risk) * 100 +
    numericInsightValue(facts.sla) * 10 +
    numericInsightValue(facts.resolution) +
    insightRecordCount(item)
  )
}

export function sortInsightsByBusinessPriority(items) {
  return [...items].sort((a, b) => {
    const scoreDiff = insightPriorityScore(b) - insightPriorityScore(a)
    if (scoreDiff !== 0) return scoreDiff
    return Number(a.cluster_label ?? 0) - Number(b.cluster_label ?? 0)
  })
}

export function insightIdentity(runId, item) {
  return item.cluster_insight_id ?? `agent-${runId}-${item.cluster_label}`
}

export function chatPromptForInsight(item) {
  return [
    `Analiza este grupo de incidencias: ${businessInsightTitle(item)}.`,
    businessInsightLead(item),
    businessInsightWhy(item),
    businessInsightAction(item),
    `Grupo tecnico: ${item.cluster_label}.`,
    'Explicamelo en lenguaje de negocio, dime que patron puede representar, que ejemplos conviene revisar y que accion recomiendas.',
  ]
    .filter(Boolean)
    .join(' ')
}

export function buildInsightRowModel(runId, item) {
  const sampleIds = parseJsonList(item.sample_evidence_ids)
  const ticketCount = insightRecordCount(item)
  return {
    id: insightIdentity(runId, item),
    clusterLabel: item.cluster_label,
    title: businessInsightTitle(item),
    risk: item.risk_level,
    ticketCount,
    ticketLabel: `${ticketCount} tickets`,
    actionLine: businessInsightAction(item),
    metrics: businessInsightMetrics(item),
    variables: businessInsightVariables(item),
    llmEnriched: isLlmEnrichedInsight(item),
    lead: businessInsightLead(item),
    why: businessInsightWhy(item),
    mainCharacteristics: item.main_characteristics ?? null,
    possibleCauses: item.possible_causes ?? null,
    recommendations: item.recommendations ?? null,
    businessConclusion: item.business_conclusion ?? null,
    sampleIds,
    sampleSize: item.sample_size ?? sampleIds.length,
    raw: item,
  }
}

export function buildInsightsOverview(insights, selectedCount = 0) {
  const items = insights ?? []
  const highPriorityCount = items.filter((item) => insightRiskRank(item) >= 3).length
  return {
    groupCount: items.length,
    highPriorityCount,
    selectedCount,
    statsLine: `${items.length} grupos · ${highPriorityCount} alta prioridad · ${selectedCount} seleccionados`,
  }
}

export const INSIGHT_FILTER_OPTIONS = [
  { value: 'recommended', label: 'Recomendados' },
  { value: 'medium_high', label: 'Alta / Media' },
  { value: 'clear_signal', label: 'Con tema claro' },
  { value: 'low', label: 'Baja prioridad' },
  { value: 'all', label: 'Todos' },
  { value: 'llm', label: 'Solo Azure AI' },
]

export function filterInsightsForList(items, filter = 'recommended') {
  const list = items ?? []
  if (filter === 'llm') {
    return list.filter((item) => isLlmEnrichedInsight(item))
  }
  if (filter === 'medium_high') {
    return list.filter((item) => insightRiskRank(item) >= 2)
  }
  if (filter === 'clear_signal') {
    return list.filter((item) => insightHasClearSignal(item))
  }
  if (filter === 'low') {
    return list.filter((item) => insightRiskRank(item) === 1)
  }
  if (filter === 'all') {
    return list
  }
  return list.slice(0, 30)
}

export function paginateInsightList(items, page = 0, pageSize = 40) {
  const safePage = Math.max(0, page)
  const start = safePage * pageSize
  return items.slice(start, start + pageSize)
}
