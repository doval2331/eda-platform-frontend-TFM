const STRATEGY_ID_TITLES = {
  feature_mix: 'Formar los grupos',
  cluster_explanation_variables: 'Explicar cada grupo',
  cluster_sampling: 'Ejemplos a revisar',
  metric_review: 'Calidad del agrupamiento',
}

const STRATEGY_TOKEN_ES = {
  interpretation: 'interpretacion',
  segmentation: 'segmentacion',
  sampling: 'muestreo',
  validation: 'validacion',
  service: 'servicio',
  priority: 'prioridad',
  text: 'texto',
  operational: 'operativo',
  risk: 'riesgo',
  resolution: 'resolucion',
  metric: 'metricas',
  metrics: 'metricas',
  review: 'revision',
  cluster: 'grupo',
  explanation: 'explicacion',
  feature: 'variables',
  mix: 'combinacion',
  analyst: 'analista',
  trustworthiness: 'fiabilidad',
  algorithm: 'algoritmo',
  quality: 'calidad',
  stability: 'estabilidad',
  variable: 'variable',
  variables: 'variables',
  llm: 'ia',
}

function titleFromKeywordPatterns(key) {
  if (/service.*priority|priority.*service/.test(key)) return 'Prioridad por servicio'
  if (/text.*operational|operational.*text|segmentation.*text/.test(key)) {
    return 'Segmentar por texto y operacion'
  }
  if (/risk.*resolution|resolution.*risk/.test(key)) return 'Riesgo y tiempos de resolucion'
  if (/metric.*review|review.*metric|trustworthiness/.test(key)) {
    return 'Revision de metricas'
  }
  if (/explanation|interpret/.test(key) && /service/.test(key)) return 'Explicar por servicio'
  if (/explanation|interpret/.test(key) && /risk/.test(key)) return 'Explicar riesgo e impacto'
  if (/explanation|interpret/.test(key) && /text/.test(key)) return 'Explicar por texto del ticket'
  if (/segment/.test(key) && /operational/.test(key)) return 'Segmentar por datos operativos'
  if (/segment/.test(key)) return 'Formar los grupos'
  if (/sampl|example|evidence/.test(key)) return 'Ejemplos a revisar'
  if (/valid|analyst|human/.test(key)) return 'Validacion del analista'
  if (/algorithm|clustering|hdbscan/.test(key)) return 'Calidad del agrupamiento'
  return ''
}

function titleFromStrategyType(type) {
  const key = normalizeStrategyVariableName(type)
  if (key === 'segmentation') return 'Formar los grupos'
  if (key === 'interpretation') return 'Explicar cada grupo'
  if (key === 'sampling') return 'Ejemplos a revisar'
  if (key === 'validation') return 'Validacion del analista'
  return ''
}

function translateStrategyTokens(rawId) {
  const tokens = normalizeStrategyVariableName(rawId)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !/^\d+$/.test(token) && token !== 'strategy' && !token.startsWith('llm'))

  if (!tokens.length) return ''

  const translated = tokens
    .map((token) => STRATEGY_TOKEN_ES[token] ?? token)
    .filter(Boolean)

  if (!translated.length) return ''

  const phrase = translated.join(' ')
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}

export function formatStrategyTitle(id) {
  const normalized = normalizeStrategyVariableName(id)
  const fromPatterns = titleFromKeywordPatterns(normalized)
  if (fromPatterns) return fromPatterns

  const translated = translateStrategyTokens(id)
  if (translated) return translated

  return String(id ?? 'Recomendacion')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function strategyKey(item) {
  return String(item?.strategy_id ?? item?.strategy_type ?? '').toLowerCase()
}

export function businessStrategyTitle(item) {
  const key = strategyKey(item)
  const type = String(item?.strategy_type ?? '').toLowerCase()
  const idKey = normalizeStrategyVariableName(item?.strategy_id)

  if (STRATEGY_ID_TITLES[idKey]) return STRATEGY_ID_TITLES[idKey]

  const fromPatterns = titleFromKeywordPatterns(key)
  if (fromPatterns) return fromPatterns

  if (key.includes('feature_mix')) return 'Formar los grupos'
  if (key.includes('explanation')) return 'Explicar cada grupo'
  if (key.includes('sampling') || key.includes('cluster_sampling')) return 'Ejemplos a revisar'
  if (key.includes('algorithm') || key.includes('metric_review')) return 'Calidad del agrupamiento'
  if (key.includes('validation')) return 'Validacion del analista'

  const fromType = titleFromStrategyType(type)
  if (fromType && !/^llm_strategy_\d+$/.test(idKey)) return fromType

  return formatStrategyTitle(item?.strategy_id ?? item?.strategy_type)
}

export function normalizeStrategyVariableName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function businessVariableLabel(variableName) {
  const text = normalizeStrategyVariableName(variableName)
  if (/preview|descripcion|description|texto|summary|observacion|detalle/.test(text)) {
    return 'texto o descripcion del ticket'
  }
  if (/categoria|category|catalogo|subcategoria/.test(text)) return 'categoria'
  if (/urgencia|urgency/.test(text)) return 'urgencia'
  if (/prioridad|priority/.test(text)) return 'prioridad'
  if (/severity|severidad/.test(text)) return 'severidad'
  if (/affected_service|servicio_afectado|service|business_service/.test(text)) {
    return 'servicio afectado'
  }
  if (/assignment_group|grupo|responsable|assigned/.test(text)) return 'grupo responsable'
  if (/sla|breach|incumpl/.test(text)) return 'SLA'
  if (/resolution|resolucion|duracion|duration|tiempo|time|hours|minutes/.test(text)) {
    return 'tiempos de atencion'
  }
  if (/risk|riesgo|impact|impacto|valor|score/.test(text)) return 'impacto o riesgo'
  if (/cluster_label/.test(text)) return 'grupo detectado'
  if (/evidence_id|incident|numero|id/.test(text)) return 'identificador del ticket'
  return String(variableName ?? '')
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function uniqueBusinessVariables(variables) {
  const seen = new Set()
  return (variables ?? [])
    .map(businessVariableLabel)
    .filter(Boolean)
    .filter((label) => {
      const key = normalizeStrategyVariableName(label)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function parseVariables(value) {
  if (Array.isArray(value)) return value.map(String)
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

export function strategyItemKey(item) {
  return String(item?.strategy_id ?? item?.trace_id ?? item?.strategy_type ?? 'strategy')
}

export function buildStrategyVariableSelection(items) {
  return Object.fromEntries(
    (items ?? []).map((item) => [strategyItemKey(item), parseVariables(item.variables_used)]),
  )
}

export function isHighPriorityLevel(level) {
  const key = normalizeStrategyVariableName(level)
  return /alto|alta|high/.test(key)
}

export function priorityClassName(level) {
  const key = normalizeStrategyVariableName(level)
  if (/alto|alta|high/.test(key)) return 'high'
  if (/medio|media|medium/.test(key)) return 'medium'
  if (/bajo|baja|low/.test(key)) return 'low'
  return 'neutral'
}

export function priorityLabel(level) {
  const className = priorityClassName(level)
  if (className === 'high') return 'Alta'
  if (className === 'medium') return 'Media'
  if (className === 'low') return 'Baja'
  return 'Por revisar'
}

export function buildStrategyStepModel(item, selectedVariables = null) {
  const variables = parseVariables(item.variables_used)
  const confirmed = selectedVariables ?? variables
  return {
    id: strategyItemKey(item),
    title: businessStrategyTitle(item),
    priority: item.priority,
    variables,
    selectedVariables: confirmed,
    selectedCount: confirmed.length,
    totalCount: variables.length,
    summaryOriginal: item.summary ?? null,
    recommendationOriginal: item.recommendation ?? null,
    justificationOriginal: item.justification ?? null,
  }
}

export function buildStrategyOverview(recommendations, selectedStrategyVariables = {}) {
  const items = recommendations ?? []
  const allVariableKeys = new Set()
  let highPriorityCount = 0

  items.forEach((item) => {
    if (isHighPriorityLevel(item.priority)) highPriorityCount += 1
    const key = strategyItemKey(item)
    const vars = selectedStrategyVariables[key] ?? parseVariables(item.variables_used)
    vars.forEach((name) => allVariableKeys.add(normalizeStrategyVariableName(name)))
  })

  return {
    stepCount: items.length,
    variableCount: allVariableKeys.size,
    highPriorityCount,
    nextHint: 'Interpretar grupos',
    statsLine: `${items.length} pasos · ${allVariableKeys.size} variables · ${highPriorityCount} alta prioridad`,
  }
}

export const STRATEGY_GUIDE_STEPS = [
  { title: 'Marca variables', text: 'En cada paso, deja activas solo las columnas que quieres confirmar.' },
  { title: 'Confirma', text: 'Pulsa Confirmar variables al final de la lista para registrar tu seleccion.' },
  { title: 'Interpreta', text: 'Despues, pulsa Interpretar grupos para ver hallazgos de negocio.' },
]

export function strategyGuideSteps() {
  return STRATEGY_GUIDE_STEPS
}
