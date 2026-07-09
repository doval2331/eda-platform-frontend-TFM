import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchConversationChartData,
  fetchConversationSemanticDictionary,
  saveOperationalSelection,
  sendConversationFeedback,
  trackConversationDashboardEvent,
  updateConversationSemanticDictionary,
} from '@/api/conversation'
import { AnalysisFlowStrip, MetabaseFlowCTA } from '@/components/bi'
import { FloatingChatWidget } from '@/components/chat'
import {
  ConversationDashboardFooter,
  ConversationDashboardHero,
  ConversationCorrelationChart,
  ConversationClusterRiskChart,
  ConversationClusterVolumeChart,
  ConversationDimensionChart,
  ConversationDimensionTreemap,
  ConversationEvidenceChart,
  ConversationAgentGuide,
  ConversationExecutiveSummary,
  ConversationInsightImpactChart,
  ConversationInsightTable,
  ConversationMetricMixChart,
  ConversationPriorityChart,
  ConversationRankingChart,
  ConversationReadingPanel,
  ConversationRunLinkBar,
  ConversationScatterChart,
  ConversationDashboardToolbar,
  ConversationTicketDrilldownPanel,
} from '@/components/conversation'
import { InsightListPagination } from '@/components/agent'
import { useConversationDashboard, useRunsList } from '@/hooks/queries'
import { useAnalysisUserProfile } from '@/hooks/useAnalysisUserProfile'
import { Card, Dialog, Feedback, LoadingPanel, LoadingSlot, PageNavbar } from '@/ui'
import {
  dashboardContractLabel,
  dashboardContractMessage,
  normalizeDashboardSpecContract,
} from './dashboardContract'
import {
  buildChartRequestIdentity,
  resetRunDerivedDashboardState,
  resetTicketFilterState,
  responseBelongsToRun,
  runMismatchMessage,
} from './dashboardRunScope'
import {
  evidenceModeLabel,
  normalizeOperationalReadiness,
  readinessStatusClass,
  readinessStatusLabel,
  runScopeLabel,
  trustLevelLabel,
  visibleReadinessActions,
  visibleReadinessWarnings as buildVisibleReadinessWarnings,
} from '@/components/conversation/dashboard/operationalReadiness'
import {
  buildSemanticDraftRows,
  normalizeSemanticDraftForSave,
  semanticItem,
  semanticLabel,
  semanticMapFromList,
  semanticRole,
} from '@/components/conversation/dashboard/semanticDashboard'
import {
  buildDecisionReading,
  buildDimensionTreemapData,
  buildMaxByKind,
  buildRunsForFilter,
  countInsightsByKind,
  DASHBOARD_PAGE_SIZE,
  formatMetric,
  hasClusterMapData,
  hasClusterInsightData,
  hasClusterVolumeData,
  hasDimensionEvidenceData,
  hasInsightImpactData,
  hasSlaRiskMapData,
  hasSegmentedDimensionData,
  insightPriorityLevel,
  insightKey,
  metricKind,
  paginateDashboardList,
  runOptionLabel,
  summarize,
  summarizeClusterCoverage,
} from '@/utils/conversationDashboard'
import '@/styles/llm-visual.css'

const CHART_LABELS = {
  bar: 'Barras',
  line: 'Linea',
  scatter: 'Dispersion',
  priority_matrix: 'Matriz de prioridad',
  distribution: 'Distribucion',
  ranking: 'Ranking',
  heatmap: 'Mapa de calor',
  boxplot: 'Distribucion tecnica',
}

const ACTIVE_CHART_SERIES_LIMIT = 12
const ACTIVE_CHART_INITIAL_EVIDENCE_LIMIT = 40
const EMPTY_DASHBOARD = { total: 0, insights: [], dashboard_spec: {} }

const CHART_RENDERERS = [
  {
    id: 'priority',
    label: 'Distribucion de prioridad',
    chartTypes: ['priority_matrix'],
    keywords: ['prioridad', 'priority', 'urgencia', 'severity', 'critico', 'critica'],
    canUse: ({ hasInsights }) => hasInsights,
    render: (props) => <ConversationPriorityChart {...props} />,
  },
  {
    id: 'cluster_volume',
    label: 'Tamaño de grupos',
    chartTypes: ['bar', 'ranking', 'distribution'],
    keywords: ['cluster', 'clusters', 'grupo', 'grupos', 'ticket', 'tickets', 'volumen', 'cantidad', 'muestra', 'muestras', 'count'],
    canUse: ({ hasClusterVolume }) => hasClusterVolume,
    render: (props) => <ConversationClusterVolumeChart {...props} />,
  },
  {
    id: 'cluster_risk',
    label: 'Criticidad de grupos',
    chartTypes: ['bar', 'ranking', 'priority_matrix'],
    keywords: ['riesgo', 'risk', 'criticidad', 'critico', 'critica', 'reasignacion', 'reassignment', 'complejidad'],
    canUse: ({ hasClusterCharts }) => hasClusterCharts,
    render: (props) => <ConversationClusterRiskChart {...props} />,
  },
  {
    id: 'decision_map',
    label: 'Mapa de decision',
    chartTypes: ['scatter'],
    keywords: ['scatter', 'dispersion', 'relacion', 'relacionar', 'cruzar', 'correlacion', 'mapa', 'decision'],
    canUse: ({ hasScatter }) => hasScatter,
    render: (props) => <ConversationScatterChart {...props} />,
  },
  {
    id: 'dimension_treemap',
    label: 'Mapa por dimension',
    chartTypes: ['heatmap'],
    keywords: ['heatmap', 'mapa', 'calor', 'dimension', 'concentracion', 'servicio', 'categoria', 'category', 'affected_service'],
    canUse: ({ hasDimensionTreemap }) => hasDimensionTreemap,
    render: ({ insights }) => <ConversationDimensionTreemap insights={insights} />,
  },
  {
    id: 'business_dimension',
    label: 'Concentracion por dimension',
    chartTypes: ['bar', 'distribution', 'heatmap'],
    keywords: ['servicio', 'service', 'categoria', 'category', 'dimension', 'segmento', 'segment', 'affected_service', 'business'],
    canUse: ({ hasSegmentedDimension }) => hasSegmentedDimension,
    render: ({ insights }) => <ConversationDimensionChart insights={insights} />,
  },
  {
    id: 'impact',
    label: 'Impacto por hallazgo',
    chartTypes: ['bar', 'ranking', 'heatmap'],
    keywords: ['impacto', 'impact', 'sla', 'riesgo', 'risk', 'resolucion', 'resolution', 'horas', 'hours', 'satisfaccion'],
    canUse: ({ hasInsightImpact }) => hasInsightImpact,
    render: (props) => <ConversationInsightImpactChart {...props} />,
  },
  {
    id: 'evidence',
    label: 'Volumen de evidencia',
    chartTypes: ['boxplot', 'bar'],
    keywords: ['evidencia', 'evidencias', 'registros', 'incidencias', 'volumen', 'tickets'],
    canUse: ({ hasInsights }) => hasInsights,
    render: (props) => <ConversationEvidenceChart {...props} />,
  },
  {
    id: 'metric_mix',
    label: 'Tipos de evidencia',
    chartTypes: ['distribution'],
    keywords: ['tipo', 'tipos', 'mix', 'mezcla', 'intereses', 'hallazgo', 'hallazgos'],
    canUse: ({ hasInsights }) => hasInsights,
    render: ({ insights }) => <ConversationMetricMixChart insights={insights} />,
  },
  {
    id: 'ranking',
    label: 'Ranking visual',
    chartTypes: ['ranking', 'bar', 'line'],
    keywords: ['ranking', 'top', 'mayor', 'ordenar', 'relevante', 'intensidad'],
    canUse: ({ hasInsights }) => hasInsights,
    render: (props) => <ConversationRankingChart {...props} />,
  },
]

const PRIORITY_LABELS = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function compactText(value, max = 480) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

const CHAT_BACKEND_MAX_CHARS = 4800
const CHAT_CONTEXT_MAX_CHARS = 3600

function limitChatText(value, max = CHAT_BACKEND_MAX_CHARS) {
  const text = String(value || '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 3))}...`
}

const FEEDBACK_STORAGE_PREFIX = 'conversation-dashboard-feedback'
const FEEDBACK_REASON_LABELS = {
  useful: 'Recomendacion util',
  irrelevant: 'Recomendacion irrelevante',
  wrong_variable: 'Variable incorrecta',
  chart_not_useful: 'Grafico no util',
  insufficient_evidence: 'Sin evidencia suficiente',
  needs_detail: 'Requiere mas detalle',
  action_taken: 'Termino en accion',
}

function feedbackStorageKey(runId) {
  return `${FEEDBACK_STORAGE_PREFIX}:${runId || 'global'}`
}

function readStoredFeedback(runId) {
  if (typeof window === 'undefined' || !runId) return {}
  try {
    const value = window.localStorage.getItem(feedbackStorageKey(runId))
    return value ? JSON.parse(value) : {}
  } catch {
    return {}
  }
}

function writeStoredFeedback(runId, state) {
  if (typeof window === 'undefined' || !runId) return
  try {
    window.localStorage.setItem(feedbackStorageKey(runId), JSON.stringify(state || {}))
  } catch {
    // Local persistence is only a UX aid; backend feedback remains the source of truth.
  }
}

function feedbackStateFromBackend(summary) {
  if (!summary || typeof summary !== 'object') return {}
  const result = {}
  asList(summary.useful_recommendation_ids).forEach((id) => {
    if (id) result[id] = 'useful'
  })
  asList(summary.not_useful_recommendation_ids).forEach((id) => {
    if (id) result[id] = 'not_useful'
  })
  asList(summary.recent).forEach((item) => {
    const id = String(item?.recommendation_id || item?.target_id || '').trim()
    const status = String(item?.status || '').trim()
    if (id && ['useful', 'not_useful'].includes(status)) {
      result[id] = status
    }
  })
  return result
}

function feedbackReasonStateFromBackend(summary) {
  if (!summary || typeof summary !== 'object') return {}
  const result = {}
  asList(summary.recent).forEach((item) => {
    const id = String(item?.recommendation_id || item?.target_id || '').trim()
    const reason = String(item?.reason || '').trim()
    if (id && reason) result[id] = reason
  })
  return result
}

function textForProfile(value, isExpertMode) {
  const text = String(value || '').trim()
  if (!text || isExpertMode) return text
  return text
    .replace(/\bincident_id\b/gi, 'ticket')
    .replace(/\bevidence_id\b/gi, 'evidencia')
    .replace(/\bcluster_label\b/gi, 'grupo de incidencias')
    .replace(/\bcluster_agent_risk\b/gi, 'riesgo operativo')
    .replace(/\bcluster_critical_score\b/gi, 'criticidad operativa')
    .replace(/\bmetric_value\b/gi, 'valor de la metrica')
    .replace(/\bmetric_label\b/gi, 'tipo de evidencia')
    .replace(/\bmetric\b/gi, 'indicador')
    .replace(/\bvariable tecnica\b/gi, 'dato interno')
    .replace(/\bvariable técnica\b/gi, 'dato interno')
    .replace(/\bvariables tecnicas\b/gi, 'datos internos')
    .replace(/\bvariables técnicas\b/gi, 'datos internos')
    .replace(/\bcontrato JSON\b/gi, 'validacion del sistema')
    .replace(/\bJSON\b/g, 'estructura')
    .replace(/\bschema\b/gi, 'validacion')
    .replace(/\baffected_service\b/gi, 'servicio afectado')
    .replace(/\bavg_resolution_hours\b/gi, 'tiempo promedio de resolucion')
    .replace(/\bsla_breach_rate\b/gi, 'incumplimiento de SLA')
    .replace(/\bno_of_reassignments\b/gi, 'cantidad de reasignaciones')
    .replace(/\bNo Of Reassignments\b/gi, 'cantidad de reasignaciones')
    .replace(/\bCI_Cat\b/gi, 'categoria CI')
    .replace(/\bassignment_group\b/gi, 'grupo responsable')
    .replace(/\bchart_type\b/gi, 'tipo de grafico')
    .replace(/\bgroup_by\b/gi, 'agrupacion')
    .replace(/\baggregation\b/gi, 'calculo')
    .replace(/\bHDBSCAN\b/gi, 'agrupamiento')
    .replace(/\bDBSCAN\b/gi, 'comparacion de referencia')
    .replace(/\bUMAP\b/gi, 'mapa visual')
    .replace(/\bPCA\b/gi, 'vista rapida')
    .replace(/\bDuckDB\b/gi, 'base de evidencias')
    .replace(/\bpipeline\b/gi, 'proceso de analisis')
    .replace(/\bsilhouette\b/gi, 'calidad del agrupamiento')
    .replace(/\bevidencias materializadas\b/gi, 'casos disponibles')
    .replace(/\bevidencia materializada\b/gi, 'casos disponibles')
    .replace(/\bcontrato\b/gi, 'validacion')
    .replace(/\bclusters\b/gi, 'grupos')
    .replace(/\bcluster\b/gi, 'grupo')
    .replace(/\bclustering\b/gi, 'agrupamiento')
    .replace(/\bsilhouette\b/gi, 'calidad del agrupamiento')
    .replace(/\boutliers\b/gi, 'casos atipicos')
    .replace(/\bnoise\b/gi, 'registros sin patron claro')
    .replace(/\bpipeline\b/gi, 'proceso de analisis')
    .replace(/\bDuckDB\b/g, 'datos guardados')
    .replace(/\bbackend\b/gi, 'sistema')
    .replace(/\bendpoint\b/gi, 'servicio')
    .replace(/\bLLM\b/g, 'agente')
    .replace(/\bfallback\b/gi, 'respaldo automatico')
}

function cleanEvidenceTitle(value) {
  return String(value || 'Paso de evidencia')
    .replace(/^\s*\d+[\s.)-]+/, '')
    .trim()
}

function audienceMatches(item, mode) {
  const audience = item?.audience || 'ambos'
  return audience === 'ambos' || audience === mode
}

function audienceList(items, mode) {
  const filtered = asList(items).filter((item) => audienceMatches(item, mode))
  return filtered.length ? filtered : asList(items)
}

function priorityClass(value) {
  return `dashboard-spec-priority dashboard-spec-priority--${value || 'media'}`
}

function badgeLabel(value, fallback = 'Sin dato') {
  return value ? String(value) : fallback
}

function audienceLabel(value, isExpertMode) {
  const text = String(value || 'ambos').toLowerCase()
  if (isExpertMode) return text
  if (text === 'funcional') return 'usuario funcional'
  if (text === 'experto') return 'usuario experto'
  return 'todos'
}

function formatBackendNumber(value) {
  const number = Number(value || 0)
  return number.toLocaleString('es-ES', {
    maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
  })
}

function visualizationDimensionLabel(semanticMap, visualization) {
  const rawDimension = visualization?.x || visualization?.group_by || ''
  return semanticLabel(semanticMap, rawDimension) || rawDimension || 'la variable del eje X'
}

function chartValidationMessages({ validation, warnings, visualization, backendData, semanticMap, chartIsBuildable }) {
  const messages = []
  const suggestedDimension = visualizationDimensionLabel(semanticMap, visualization)
  const resolvedDimension = semanticLabel(semanticMap, backendData?.x) || backendData?.x || ''
  const missing = asList(validation?.missing)
  const usedAlternative = warnings.some((warning) => /se uso|se us[oó]/i.test(String(warning || '')))

  if (!chartIsBuildable) {
    messages.push(`No se pudo graficar porque falta la variable "${suggestedDimension}" o no es interpretable.`)
  }
  if (validation?.possibly_invented || missing.length) {
    messages.push(`La variable sugerida no existe o no esta disponible con suficiente calidad para graficar.`)
  }
  if (usedAlternative && resolvedDimension) {
    messages.push(`Se uso una vista alternativa con "${resolvedDimension}" para evitar mostrar una tabla como grafico.`)
  }
  if (!chartIsBuildable) {
    messages.push('Solo se puede mostrar tabla de evidencia hasta que exista una dimension y una metrica graficables.')
  }

  return [...new Set(messages)]
}

function backendEvidenceTitle(item) {
  return item?.title || item?.incident_id || item?.evidence_id || 'Evidencia relacionada'
}

function backendEvidenceMeta(item) {
  return [item?.service, item?.priority, item?.category, item?.group ? `Grupo ${item.group}` : '']
    .filter(Boolean)
    .join(' · ')
}

function backendEvidenceField(item, key, fallback = 'Sin dato') {
  const value = item?.fields?.[key] ?? item?.[key]
  const text = String(value ?? '').trim()
  if (!text || ['nan', 'none', 'null'].includes(text.toLowerCase())) return fallback
  return text
}

function summarizeBackendEvidence(item) {
  return {
    ticket: compactText(backendEvidenceField(item, 'ticket', item?.incident_id || item?.evidence_id || ''), 80),
    title: compactText(backendEvidenceTitle(item), 120),
    service: compactText(backendEvidenceField(item, 'servicio', item?.service || ''), 80),
    category: compactText(backendEvidenceField(item, 'categoria', item?.category || ''), 80),
    priority: compactText(backendEvidenceField(item, 'prioridad', item?.priority || ''), 50),
    status: compactText(backendEvidenceField(item, 'estado', ''), 60),
    group: compactText(backendEvidenceField(item, 'grupo', item?.group || ''), 60),
    reassignments: compactText(backendEvidenceField(item, 'reasignaciones', ''), 40),
    meta: compactText(backendEvidenceMeta(item), 160),
    metric_value: item?.metric_value ?? null,
    preview: compactText(item?.preview, 140),
  }
}

function backendEvidenceKey(item, index = 0) {
  return (
    backendEvidenceField(item, 'ticket', '') ||
    item?.incident_id ||
    item?.evidence_id ||
    `${backendEvidenceTitle(item)}-${index}`
  )
}

function backendEvidenceSearchText(item) {
  const summary = summarizeBackendEvidence(item)
  return Object.values(summary).join(' ').toLowerCase()
}

function getBackendEvidencePriority(item) {
  return backendEvidenceField(item, 'prioridad', item?.priority || 'Sin dato')
}

function getBackendEvidenceCategory(item) {
  return backendEvidenceField(item, 'categoria', item?.category || 'Sin categoria')
}

function getBackendEvidenceStatus(item) {
  return backendEvidenceField(item, 'estado', item?.status || 'Sin estado')
}

function csvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${text.replace(/"/g, '""')}"`
}

function buildEvidenceCsv(items) {
  const headers = ['ticket', 'servicio', 'categoria', 'prioridad', 'estado', 'grupo', 'reasignaciones', 'descripcion']
  const rows = items.map((item) => {
    const summary = summarizeBackendEvidence(item)
    return headers.map((header) => csvCell(summary[header] ?? '')).join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function summarizeChartData(data) {
  if (!data) return {}
  return {
    visualization_id: data.visualization_id || '',
    title: data.title || '',
    x: data.x || '',
    metric: data.metric || '',
    aggregation: data.aggregation || '',
    total_records: data.total_records || 0,
    validation: data.validation || {},
    series: asList(data.series)
      .slice(0, 8)
      .map((point) => ({
        label: point.label || point.key,
        value: point.value,
        count: point.count,
        filter: point.filter || {},
      })),
  }
}

function visualizationGraphReadiness(visualization, chartRenderer, semanticMap, isExpertMode = false) {
  if (!visualization?.id || !chartRenderer) {
    return {
      ready: false,
      reason: 'Falta una visualizacion vinculada con un tipo de grafico soportado.',
    }
  }
  const dimension = visualization.x || visualization.group_by
  if (!dimension) {
    return {
      ready: false,
      reason: 'Falta definir una variable para el eje X.',
    }
  }
  const variables = [
    visualization.x,
    visualization.y,
    visualization.metric,
    visualization.group_by,
  ].filter((item) => item && item !== 'count')
  const unknownVariables = variables.filter((name) => !semanticItem(semanticMap, name))
  if (unknownVariables.length) {
    return {
      ready: false,
      reason: `La variable sugerida no existe o no esta reconocida: ${unknownVariables.join(', ')}.`,
    }
  }
  const technicalVariables = variables.filter((name) => {
    const role = semanticRole(semanticMap, name)
    return ['technical', 'identifier'].includes(role) || isTechnicalToken(name)
  })
  if (!isExpertMode && technicalVariables.length) {
    return {
      ready: false,
      reason: `La vista usa variables tecnicas: ${technicalVariables.join(', ')}.`,
    }
  }
  return { ready: true, reason: '' }
}

function buildRecommendationEvaluation(recommendation, visualization, chartRenderer, semanticMap, isExpertMode, spec, graphReadiness = null) {
  const actionType = recommendation?.action_type || ''
  const variables = [
    visualization?.x,
    visualization?.y,
    visualization?.metric,
    visualization?.group_by,
  ].filter((item) => item && item !== 'count')
  const readiness = graphReadiness ?? visualizationGraphReadiness(visualization, chartRenderer, semanticMap, isExpertMode)
  const unknownVariables = variables.filter((name) => !semanticItem(semanticMap, name))
  const technicalVariables = variables.filter((name) => {
    const role = semanticRole(semanticMap, name)
    return ['technical', 'identifier'].includes(role) || isTechnicalToken(name)
  })
  const items = []
  items.push({
    label: spec?.llm_used ? (isExpertMode ? 'Sugerido por LLM' : 'Sugerido por agente') : 'Respaldo automatico',
    tone: spec?.llm_used ? 'ok' : 'neutral',
  })
  if (readiness.ready) {
    items.push({ label: 'Graficable', tone: 'ok' })
    items.push({ label: isExpertMode ? 'Backend valida datos reales' : 'Se valida con datos', tone: 'ok' })
  } else if (actionType === 'chart') {
    items.push({ label: 'No graficable aun', tone: 'warning' })
    items.push({ label: readiness.reason || 'Requiere datos o vista valida', tone: 'warning' })
  } else {
    items.push({ label: actionType === 'conclusion' ? 'Va a conclusion/chat' : 'Va al chat', tone: 'neutral' })
  }
  if (visualization?.question_answered) {
    items.push({ label: 'Responde una pregunta clara', tone: 'ok' })
  } else if (chartRenderer) {
    items.push({ label: 'Falta pregunta explicita', tone: 'warning', expertOnly: !isExpertMode })
  }
  if (technicalVariables.length) {
    items.push({
      label: isExpertMode ? 'Usa variable tecnica' : 'Requiere traduccion funcional',
      tone: 'warning',
      expertOnly: false,
    })
  }
  if (unknownVariables.length) {
    items.push({ label: 'Posible invencion de variable', tone: 'warning', expertOnly: false })
  } else if (variables.length) {
    items.push({ label: 'Usa variables disponibles', tone: 'ok', expertOnly: false })
  }
  return items.filter((item) => isExpertMode || !item.expertOnly)
}

function recommendationUsesTechnicalVariables(visualization, semanticMap) {
  const variables = [
    visualization?.x,
    visualization?.y,
    visualization?.metric,
    visualization?.group_by,
  ].filter((item) => item && item !== 'count')
  return variables.some((name) => {
    const role = semanticRole(semanticMap, name)
    return ['technical', 'identifier'].includes(role) || isTechnicalToken(name)
  })
}

function shouldShowRecommendationForMode(recommendation, visualization, chartRenderer, semanticMap, isExpertMode) {
  if (isExpertMode) return true
  const actionType = recommendation?.action_type || ''
  if (actionType !== 'chart') return true
  if (!chartRenderer || !visualization) return true
  if (recommendationUsesTechnicalVariables(visualization, semanticMap) && !visualization.question_answered) {
    return false
  }
  return true
}

function recommendationFeedbackRank(feedbackValue) {
  if (feedbackValue === 'useful') return -1
  if (feedbackValue === 'not_useful') return 1
  return 0
}

function sortRecommendationsByFeedback(recommendations, feedbackState) {
  return recommendations
    .map((recommendation, index) => ({
      recommendation,
      index,
      rank: recommendationFeedbackRank(feedbackState[recommendation.id]),
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((item) => item.recommendation)
}

function isTechnicalToken(value) {
  const text = String(value || '').toLowerCase().trim()
  if (!text) return true
  if (['x', 'y', 'id', 'uuid', 'metric_value', 'metric_label', 'cluster_label'].includes(text)) {
    return true
  }
  return (
    text.includes('_id') ||
    text.endsWith('id') ||
    text.startsWith('cluster_') ||
    text.startsWith('metric_') ||
    text.includes('embedding') ||
    text.includes('umap') ||
    text.includes('pca')
  )
}

function summarizeFinding(item) {
  return {
    id: item?.id || '',
    title: item?.title || '',
    priority: item?.priority || '',
    impact: item?.impact || '',
    urgency: item?.urgency || '',
    evidence: compactText(item?.evidence, 360),
    related_variables: asList(item?.related_variables).slice(0, 6),
  }
}

function summarizeVisualization(item) {
  return {
    id: item?.id || '',
    title: item?.title || '',
    chart_type: item?.chart_type || '',
    x: item?.x || '',
    y: item?.y || '',
    metric: item?.metric || '',
    group_by: item?.group_by || '',
    aggregation: item?.aggregation || '',
    reason: compactText(item?.reason, 300),
    evidence_used: compactText(item?.evidence_used, 300),
    question_answered: compactText(item?.question_answered, 260),
  }
}

function summarizeRecommendation(item) {
  return {
    id: item?.id || '',
    title: item?.title || '',
    why_it_matters: compactText(item?.why_it_matters, 300),
    what_to_analyze: compactText(item?.what_to_analyze, 300),
    recommended_next_step: compactText(item?.recommended_next_step, 300),
    audience: item?.audience || 'ambos',
    action_type: item?.action_type || '',
    linked_visualization_id: item?.linked_visualization_id || '',
    evidence_needed: compactText(item?.evidence_needed, 260),
  }
}

function summarizeConclusion(item) {
  return {
    id: item?.id || '',
    conclusion: compactText(item?.conclusion, 420),
    evidence: compactText(item?.evidence, 520),
    related_chart: item?.related_chart || '',
    related_metric: item?.related_metric || '',
    confidence: item?.confidence || '',
    recommended_action: compactText(item?.recommended_action, 360),
    source: item?.source || '',
    evidence_quality: compactText(item?.evidence_quality, 260),
  }
}

function buildBackendPrompt({ visibleText, runId, context }) {
  const safeVisibleText = limitChatText(visibleText, 700)
  const basePayload = {
    action_label: compactText(context.label || safeVisibleText, 240),
    intent: context.intent || 'analizar seleccion del dashboard conversacional',
    run_id: runId || '',
    project_id: context.projectId || '',
    dataset_summary: context.datasetSummary || {},
    parameters: context.parameters || {},
    finding: context.finding ? summarizeFinding(context.finding) : {},
    recommendation: context.recommendation
      ? summarizeRecommendation(context.recommendation)
      : {},
    conclusion: context.conclusion ? summarizeConclusion(context.conclusion) : {},
    visualization: context.visualization ? summarizeVisualization(context.visualization) : {},
    selected_findings: asList(context.selectedFindings).slice(0, 5).map(summarizeFinding),
    visualizations_suggested: asList(context.visualizationsSuggested)
      .slice(0, 5)
      .map(summarizeVisualization),
    semantic_variables: asList(context.semanticVariables).slice(0, 20),
    chart_data: summarizeChartData(context.chartData),
    selected_segment: context.selectedSegment || '',
    selected_ticket: context.ticket ? summarizeBackendEvidence(context.ticket) : {},
    operation: {
      action: context.operation?.action || '',
      saved: Boolean(context.operation?.saved),
      ticket_count: context.operation?.ticket_count ?? asList(context.drilldownEvidence).length,
      recommended_action: compactText(context.operation?.recommended_action, 280),
      quality_score: context.operation?.quality_score ?? null,
    },
    drilldown_tickets: asList(context.drilldownEvidence).slice(0, 8).map(summarizeBackendEvidence),
    drilldown_count: asList(context.drilldownEvidence).length,
    drilldown_ticket_ids: asList(context.drilldownEvidence)
      .slice(0, 25)
      .map((item, index) => backendEvidenceKey(item, index)),
    focus_instruction:
      'Responde solo sobre la seleccion recibida. No cambies a otro hallazgo, grafico o ticket salvo que sea necesario para explicar la evidencia relacionada.',
    evidence: compactText(context.evidence, 700),
    evidence_used: compactText(context.evidenceUsed, 700),
    suggested_question: compactText(context.suggestedQuestion, 360),
    question_answered: compactText(context.questionAnswered, 360),
  }
  let payloadText = JSON.stringify(basePayload)
  if (payloadText.length > CHAT_CONTEXT_MAX_CHARS) {
    payloadText = JSON.stringify({
      action_label: basePayload.action_label,
      intent: basePayload.intent,
      run_id: basePayload.run_id,
      finding: basePayload.finding,
      recommendation: basePayload.recommendation,
      visualization: basePayload.visualization,
      chart_data: basePayload.chart_data,
      selected_segment: basePayload.selected_segment,
      selected_ticket: basePayload.selected_ticket,
      operation: basePayload.operation,
      drilldown_tickets: basePayload.drilldown_tickets.slice(0, 4),
      drilldown_count: basePayload.drilldown_count,
      drilldown_ticket_ids: basePayload.drilldown_ticket_ids.slice(0, 18),
      focus_instruction: basePayload.focus_instruction,
      evidence: compactText(basePayload.evidence, 260),
      selected_findings: basePayload.selected_findings.slice(0, 2),
    })
  }
  if (payloadText.length > CHAT_CONTEXT_MAX_CHARS) {
    payloadText = JSON.stringify({
      action_label: basePayload.action_label,
      intent: basePayload.intent,
      run_id: basePayload.run_id,
      visualization: {
        id: basePayload.visualization.id,
        title: basePayload.visualization.title,
        chart_type: basePayload.visualization.chart_type,
        question_answered: basePayload.visualization.question_answered,
      },
      selected_segment: basePayload.selected_segment,
      operation: basePayload.operation,
      drilldown_count: basePayload.drilldown_count,
      drilldown_ticket_ids: basePayload.drilldown_ticket_ids.slice(0, 12),
      drilldown_tickets: basePayload.drilldown_tickets.slice(0, 2),
      focus_instruction: basePayload.focus_instruction,
    })
  }
  return limitChatText(`DASHBOARD_CONTEXT_JSON:${payloadText}:END_DASHBOARD_CONTEXT\n${safeVisibleText}`)
}

function getSpecHasContent(spec) {
  return Boolean(
    spec?.executive_summary?.summary ||
      asList(spec?.priority_findings).length ||
      asList(spec?.agent_recommendations).length ||
      asList(spec?.suggested_visualizations).length,
  )
}

function useEstimatedDashboardProgress(active) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!active) {
      const resetTimer = window.setTimeout(() => setProgress(0), 0)
      return () => window.clearTimeout(resetTimer)
    }

    const startedAt = Date.now()
    const startTimer = window.setTimeout(() => setProgress(10), 0)
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const elapsed = Date.now() - startedAt
        const curvedProgress = 94 - 84 * Math.exp(-elapsed / 14000)
        const step = current < 60 ? 5 : current < 82 ? 2 : 1
        return Math.min(94, Math.max(current + step, Math.round(curvedProgress)))
      })
    }, 800)

    return () => {
      window.clearTimeout(startTimer)
      window.clearInterval(interval)
    }
  }, [active])

  return progress
}

function ConversationDashboardProgress({ title, progress }) {
  const boundedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className="analysis-progress-panel conv-dashboard-progress-panel">
      <LoadingPanel bare compact title={title} />
      <div className="analysis-progress-panel__summary">
        <span>Progreso estimado</span>
        <strong>{boundedProgress}%</strong>
      </div>
      <div
        className="analysis-progress-panel__bar"
        role="progressbar"
        aria-label={title}
        aria-valuenow={boundedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${boundedProgress}%` }} />
      </div>
      <p className="conv-dashboard-progress-panel__hint">
        Preparando base de evidencia, contexto del run y especificacion del dashboard.
      </p>
    </div>
  )
}

const VISUAL_MATCH_STOPWORDS = new Set([
  'accion',
  'acciones',
  'actual',
  'analisis',
  'analizar',
  'aplicar',
  'casos',
  'contexto',
  'datos',
  'dashboard',
  'evidencia',
  'evidencias',
  'grafico',
  'graficos',
  'incidencia',
  'incidencias',
  'interpretar',
  'mejor',
  'permite',
  'problema',
  'problemas',
  'recomendacion',
  'revisar',
  'vista',
  'visualizacion',
])

function normalizeForMatch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizeChartType(value) {
  const text = normalizeForMatch(value).trim().replace(/[\s-]+/g, '_')
  const compact = text.replace(/[^a-z0-9]+/g, '')
  if (['bar', 'bars', 'barra', 'barras'].includes(text)) return 'bar'
  if (['ranking', 'rank'].includes(text)) return 'ranking'
  if (['line', 'linea'].includes(text)) return 'line'
  if (['distribution', 'distribucion', 'histogram', 'histograma'].includes(text)) return 'distribution'
  if (['priority_matrix', 'matriz_prioridad', 'matriz_de_prioridad'].includes(text)) return 'priority_matrix'
  if (compact === 'prioritymatrix' || compact === 'matrizprioridad' || compact === 'matrizdeprioridad') {
    return 'priority_matrix'
  }
  if (['heatmap', 'mapa_calor', 'mapa_de_calor'].includes(text)) return 'heatmap'
  if (compact === 'mapacalor' || compact === 'mapadecalor') return 'heatmap'
  return text || 'bar'
}

function matchTokens(value) {
  return normalizeForMatch(value)
    .split(/[^a-z0-9_]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !VISUAL_MATCH_STOPWORDS.has(token))
}

function hasAnyToken(text, tokens) {
  return tokens.some((token) => text.includes(token))
}

function visualizationSearchText(visualization) {
  return normalizeForMatch([
    visualization?.id,
    visualization?.title,
    visualization?.reason,
    visualization?.question_answered,
    visualization?.evidence_used,
    visualization?.metric,
    visualization?.aggregation,
    visualization?.group_by,
    visualization?.x,
    visualization?.y,
    visualization?.chart_type,
  ].join(' '))
}

function insightSearchText(item) {
  return normalizeForMatch([
    item?.id,
    item?.title,
    item?.description,
    item?.metric_label,
    item?.filter_kind,
    item?.filter_value,
    item?.dimension,
    metricKind(item?.metric_label),
  ].join(' '))
}

function recommendationSearchText(recommendation) {
  return normalizeForMatch([
    recommendation?.title,
    recommendation?.why_it_matters,
    recommendation?.what_to_analyze,
    recommendation?.recommended_next_step,
  ].join(' '))
}

function isTextOnlyRecommendation(text) {
  const asksForNarrative =
    hasAnyToken(text, ['conclusion', 'conclusiones', 'presentable', 'ejecutivo', 'resumen', 'informe']) &&
    !hasAnyToken(text, ['grafico', 'grafica', 'visual', 'ranking', 'prioridad', 'distribucion', 'mapa'])
  return asksForNarrative
}

function scoreChartRenderer(visualization, renderer, intentText = '') {
  const text = visualizationSearchText(visualization)
  const intent = normalizeForMatch(intentText)
  const combinedText = `${text} ${intent}`
  const chartType = normalizeChartType(visualization?.chart_type)
  const keywordMatches = renderer.keywords.filter((keyword) => text.includes(keyword)).length
  const intentMatches = renderer.keywords.filter((keyword) => intent.includes(keyword)).length
  let score = keywordMatches + Math.min(intentMatches, 2)

  if (renderer.chartTypes.includes(chartType)) score += 4
  if (chartType === 'bar' && ['business_dimension', 'cluster_volume', 'cluster_risk', 'impact', 'ranking'].includes(renderer.id)) {
    score += 1
  }
  if (chartType === 'distribution' && ['metric_mix', 'business_dimension', 'cluster_volume', 'priority'].includes(renderer.id)) {
    score += 1
  }
  if (chartType === 'heatmap' && renderer.id === 'dimension_treemap') score += 2
  if (combinedText.includes('cluster') && renderer.id.startsWith('cluster')) score += 3
  if (hasAnyToken(text, ['servicio', 'service', 'categoria', 'category']) && renderer.id === 'business_dimension') score += 3
  if (hasAnyToken(text, ['prioridad', 'priority', 'urgencia']) && renderer.id === 'priority') score += 3
  if (hasAnyToken(text, ['sla', 'riesgo', 'risk', 'impacto']) && renderer.id === 'impact') score += 2
  if (hasAnyToken(combinedText, ['relacion', 'cruzar', 'dispersion', 'correlacion']) && renderer.id === 'decision_map') score += 3

  if (hasAnyToken(intent, ['variable', 'variables']) && intent.includes('negocio')) {
    if (renderer.id === 'business_dimension') score += 8
    if (renderer.id === 'dimension_treemap') score += 5
    if (renderer.id === 'cluster_volume') score -= 4
    if (renderer.id === 'cluster_risk') score -= 2
  }
  if (hasAnyToken(combinedText, ['reasignacion', 'reasignaciones', 'reassignment', 'reassignments'])) {
    if (renderer.id === 'cluster_risk') score += 8
    if (renderer.id === 'impact') score += 4
    if (renderer.id === 'cluster_volume') score -= 3
  }
  if (hasAnyToken(combinedText, ['servicio', 'service', 'affected_service', 'categoria', 'category'])) {
    if (renderer.id === 'business_dimension') score += 4
    if (renderer.id === 'cluster_volume') score -= 2
  }
  if (hasAnyToken(combinedText, ['prioridad', 'priority', 'urgencia']) && renderer.id === 'priority') {
    score += 4
  }

  return score
}

function findChartRendererById(id, dataState) {
  return CHART_RENDERERS.find((renderer) => renderer.id === id && renderer.canUse(dataState)) ?? null
}

function selectChartRenderer(visualization, dataState, intentText = '') {
  if (!visualization || !dataState?.hasInsights) return null

  const viable = CHART_RENDERERS
    .filter((renderer) => renderer.canUse(dataState))
    .map((renderer) => ({
      renderer,
      score: scoreChartRenderer(visualization, renderer, intentText),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)

  if (viable[0]) return viable[0].renderer

  const chartType = normalizeChartType(visualization.chart_type)
  if (chartType === 'scatter') {
    return CHART_RENDERERS.find((renderer) => renderer.id === 'decision_map' && renderer.canUse(dataState)) ?? null
  }
  if (chartType === 'priority_matrix') {
    return CHART_RENDERERS.find((renderer) => renderer.id === 'priority' && renderer.canUse(dataState)) ?? null
  }
  if (chartType === 'heatmap') {
    return (
      CHART_RENDERERS.find((renderer) => renderer.id === 'dimension_treemap' && renderer.canUse(dataState)) ??
      CHART_RENDERERS.find((renderer) => renderer.id === 'business_dimension' && renderer.canUse(dataState)) ??
      null
    )
  }
  if (chartType === 'distribution') {
    return CHART_RENDERERS.find((renderer) => renderer.id === 'metric_mix' && renderer.canUse(dataState)) ?? null
  }
  return CHART_RENDERERS.find((renderer) => renderer.id === 'ranking' && renderer.canUse(dataState)) ?? null
}

function findVisualizationForRecommendation(recommendation, visualizations, dataState) {
  const explicitAction = String(recommendation?.action_type || '').toLowerCase()
  if (explicitAction && explicitAction !== 'chart') return null
  const linkedId = String(recommendation?.linked_visualization_id || '').trim()
  if (linkedId) {
    const linked = asList(visualizations).find((item) => item?.id === linkedId)
    if (linked && selectChartRenderer(linked, dataState, recommendationSearchText(recommendation))) {
      return linked
    }
  }
  const recommendationText = recommendationSearchText(recommendation)
  const tokens = matchTokens(recommendationText)
  if (isTextOnlyRecommendation(recommendationText)) return null
  if (!recommendationText || !tokens.length) return null

  const scored = asList(visualizations)
    .map((item) => {
      const visualText = visualizationSearchText(item)
      const chartRenderer = selectChartRenderer(item, dataState, recommendationText)
      if (!chartRenderer) return null
      const overlap = tokens.filter((token) => visualText.includes(token))
      let score = overlap.length

      if (recommendationText.includes('prioridad') && item.chart_type === 'priority_matrix') score += 4
      if (recommendationText.includes('ranking') && item.chart_type === 'ranking') score += 4
      if (recommendationText.includes('dimension') && ['bar', 'heatmap'].includes(item.chart_type)) score += 3
      if (recommendationText.includes('servicio') && hasAnyToken(visualText, ['servicio', 'service', 'affected_service'])) score += 3
      if (recommendationText.includes('categoria') && hasAnyToken(visualText, ['categoria', 'category'])) score += 3
      if (recommendationText.includes('cluster') && hasAnyToken(visualText, ['cluster', 'scatter'])) score += 3
      if (recommendationText.includes('riesgo') && hasAnyToken(visualText, ['riesgo', 'risk'])) score += 2
      if (chartRenderer.keywords.some((keyword) => recommendationText.includes(keyword))) score += 3
      if (recommendationText.includes('muestra') && chartRenderer.id !== 'cluster_volume') score -= 2
      if (recommendationText.includes('conclusion')) score -= 4

      return { item, score, overlapCount: overlap.length, chartRenderer }
    })
    .filter(Boolean)
    .filter(({ score, overlapCount }) => score >= 3 && (overlapCount >= 1 || score >= 4))
    .sort((a, b) => b.score - a.score || b.overlapCount - a.overlapCount)

  return scored[0]?.item || null
}

function conclusionConfidenceLevel(value) {
  const text = normalizeForMatch(value)
  if (text.includes('alta') || text.includes('high')) return 'alta'
  if (text.includes('baja') || text.includes('low')) return 'baja'
  return 'media'
}

function conclusionConfidenceScore(level) {
  if (level === 'alta') return 84
  if (level === 'baja') return 34
  return 58
}

function clampScore(value, min = 12, max = 92) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function conclusionAttentionScore(conclusion, index, total) {
  const text = normalizeForMatch([
    conclusion?.conclusion,
    conclusion?.evidence,
    conclusion?.related_chart,
    conclusion?.related_metric,
    conclusion?.recommended_action,
  ].join(' '))
  const confidenceLevel = conclusionConfidenceLevel(conclusion?.confidence)
  const numericEvidence = (text.match(/\d+(?:[.,]\d+)?/g) || []).length
  let score = 42

  if (confidenceLevel === 'alta') score += 12
  if (confidenceLevel === 'baja') score -= 6
  if (hasAnyToken(text, ['critico', 'critica', 'alta', 'riesgo', 'impacto', 'urgencia'])) score += 18
  if (hasAnyToken(text, ['sla', 'incumplido', 'breach', 'reassignment', 'reasignacion'])) score += 12
  if (hasAnyToken(text, ['ruido', 'silhouette', 'calidad', 'dominante', 'categoria', 'servicio'])) score += 8
  if (hasAnyToken(text, ['baja', 'medio', 'moderada'])) score -= 3
  score += Math.min(12, numericEvidence * 3)

  const spread = total > 1 ? (index / (total - 1) - 0.5) * 10 : 0
  return clampScore(score + spread)
}

function conclusionEvidenceWeight(conclusion) {
  const text = `${conclusion?.conclusion || ''} ${conclusion?.evidence || ''}`
  const numbers = text.match(/\d+(?:[.,]\d+)?/g) || []
  const confidenceLevel = conclusionConfidenceLevel(conclusion?.confidence)
  let size = 38 + Math.min(18, numbers.length * 4)
  if (confidenceLevel === 'alta') size += 8
  if (confidenceLevel === 'baja') size -= 4
  return Math.max(34, Math.min(64, size))
}

function buildConclusionMatrixItems(conclusions) {
  const items = asList(conclusions)
  return items.map((conclusion, index) => {
    const confidenceLevel = conclusionConfidenceLevel(conclusion?.confidence)
    const id = conclusion?.id || `conclusion-${index}`
    return {
      id,
      index,
      source: conclusion,
      confidenceLevel,
      confidenceLabel: PRIORITY_LABELS[confidenceLevel] || 'Media',
      x: conclusionAttentionScore(conclusion, index, items.length),
      y: conclusionConfidenceScore(confidenceLevel),
      size: conclusionEvidenceWeight(conclusion),
    }
  })
}

function conclusionIntentProfile(conclusionText) {
  const profiles = [
    {
      id: 'reassignment',
      tokens: ['reasignacion', 'reasignaciones', 'reassignment', 'reassignments', 'asignacion'],
      rendererIds: ['cluster_risk', 'impact', 'cluster_volume'],
      visualTokens: ['reasignacion', 'reassignment', 'riesgo', 'risk', 'cluster', 'grupo'],
    },
    {
      id: 'sla',
      tokens: ['sla', 'incumplido', 'incumplimiento', 'breach'],
      rendererIds: ['impact', 'priority', 'business_dimension', 'dimension_treemap'],
      visualTokens: ['sla', 'breach', 'incumplido', 'impacto', 'prioridad', 'servicio', 'categoria'],
    },
    {
      id: 'business-dimension',
      tokens: ['servicio', 'service', 'categoria', 'category', 'dominante', 'negocio', 'aplicacion'],
      rendererIds: ['business_dimension', 'dimension_treemap', 'impact'],
      visualTokens: ['servicio', 'service', 'affected_service', 'categoria', 'category', 'dimension'],
    },
    {
      id: 'cluster-quality',
      tokens: ['cluster', 'clusters', 'clustering', 'ruido', 'silhouette', 'calidad', 'grupo', 'grupos'],
      rendererIds: ['decision_map', 'cluster_volume', 'cluster_risk'],
      visualTokens: ['cluster', 'scatter', 'dispersion', 'grupo', 'volumen', 'riesgo'],
    },
    {
      id: 'priority',
      tokens: ['prioridad', 'priority', 'urgencia', 'critico', 'critica', 'impacto'],
      rendererIds: ['priority', 'ranking', 'impact'],
      visualTokens: ['prioridad', 'priority', 'urgencia', 'impacto', 'ranking'],
    },
    {
      id: 'volume',
      tokens: ['volumen', 'tickets', 'registros', 'muestras', 'patron', 'patrones'],
      rendererIds: ['cluster_volume', 'evidence', 'ranking'],
      visualTokens: ['volumen', 'evidencia', 'registros', 'tickets', 'ranking'],
    },
  ]
  return profiles.find((profile) => profile.tokens.some((token) => conclusionText.includes(token))) ?? null
}

function findVisualizationForConclusion(conclusion, visualizations, dataState) {
  const conclusionText = normalizeForMatch([
    conclusion?.conclusion,
    conclusion?.evidence,
    conclusion?.related_chart,
    conclusion?.related_metric,
    conclusion?.recommended_action,
  ].join(' '))
  const tokens = matchTokens(conclusionText)
  const relatedChartRef = normalizeForMatch(conclusion?.related_chart)
  const relatedMetricRef = normalizeForMatch(conclusion?.related_metric)
  const genericChartRef = /^viz[-_\s]*\d+$/.test(relatedChartRef)
  const profile = conclusionIntentProfile(conclusionText)

  const scored = asList(visualizations)
    .map((item) => {
      const visualText = visualizationSearchText(item)
      const visualIdentity = normalizeForMatch([item?.id, item?.title].join(' '))
      const visualMetricText = normalizeForMatch([
        item?.x,
        item?.y,
        item?.metric,
        item?.group_by,
        item?.aggregation,
        item?.title,
        item?.reason,
      ].join(' '))
      const chartRenderer = selectChartRenderer(item, dataState, conclusionText)
      if (!chartRenderer) return null
      const overlap = tokens.filter((token) => visualText.includes(token))
      let score = overlap.length
      const rendererPreference = profile?.rendererIds?.indexOf(chartRenderer.id) ?? -1
      const exactChartMatch =
        relatedChartRef &&
        (visualIdentity === relatedChartRef ||
          visualIdentity.includes(relatedChartRef) ||
          visualText.includes(relatedChartRef))
      const metricMatch = relatedMetricRef && visualMetricText.includes(relatedMetricRef)
      const usableChartMatch = Boolean(exactChartMatch && (!genericChartRef || metricMatch || overlap.length >= 2))

      if (metricMatch) score += 10
      if (usableChartMatch) score += genericChartRef ? 2 : 8
      if (rendererPreference >= 0) score += 10 - rendererPreference * 2
      if (profile?.visualTokens?.some((token) => visualText.includes(token))) score += 4
      if (hasAnyToken(conclusionText, ['prioridad', 'urgencia', 'impacto']) && item.chart_type === 'priority_matrix') score += 4
      if (hasAnyToken(conclusionText, ['cluster', 'clusters', 'reasignacion']) && hasAnyToken(visualText, ['cluster', 'grupo', 'riesgo'])) score += 4
      if (hasAnyToken(conclusionText, ['servicio', 'categoria']) && hasAnyToken(visualText, ['servicio', 'categoria', 'dimension'])) score += 3
      if (chartRenderer.keywords.some((keyword) => conclusionText.includes(keyword))) score += 2
      if (genericChartRef && exactChartMatch && !metricMatch && overlap.length < 2) score -= 6

      return {
        item,
        score,
        overlapCount: overlap.length,
        exactChartMatch: usableChartMatch && !genericChartRef,
        metricMatch,
        rendererPreference,
      }
    })
    .filter(Boolean)
    .filter(({ score, overlapCount, exactChartMatch, metricMatch, rendererPreference }) =>
      score >= 3 || overlapCount >= 2 || exactChartMatch || metricMatch || rendererPreference >= 0,
    )
    .sort((a, b) => {
      if (a.metricMatch !== b.metricMatch) return a.metricMatch ? -1 : 1
      if (a.exactChartMatch !== b.exactChartMatch) return a.exactChartMatch ? -1 : 1
      if (a.rendererPreference !== b.rendererPreference) {
        if (a.rendererPreference < 0) return 1
        if (b.rendererPreference < 0) return -1
        return a.rendererPreference - b.rendererPreference
      }
      return b.score - a.score || b.overlapCount - a.overlapCount
    })

  if (scored[0]?.item) return scored[0].item

  if (profile?.rendererIds?.length) {
    const fallback = asList(visualizations)
      .map((item) => {
        const renderer = selectChartRenderer(item, dataState, conclusionText)
        const preference = renderer ? profile.rendererIds.indexOf(renderer.id) : -1
        return { item, preference }
      })
      .filter(({ preference }) => preference >= 0)
      .sort((a, b) => a.preference - b.preference)
    return fallback[0]?.item || null
  }

  return null
}

function conclusionGraphCandidate(conclusion, visualizations, dataState, semanticMap, isExpertMode = false) {
  const intentText = `${conclusion?.conclusion || ''} ${conclusion?.evidence || ''}`
  const visualization = findVisualizationForConclusion(conclusion, visualizations, dataState)
  const chartRenderer = selectChartRenderer(visualization, dataState, intentText)
  const readiness = visualizationGraphReadiness(visualization, chartRenderer, semanticMap, isExpertMode)
  return {
    visualization,
    chartRenderer,
    readiness,
  }
}

function filterInsightsForConclusion(insights, conclusion) {
  const conclusionText = normalizeForMatch([
    conclusion?.conclusion,
    conclusion?.evidence,
    conclusion?.related_chart,
    conclusion?.related_metric,
    conclusion?.recommended_action,
  ].join(' '))
  const baseTokens = [
    ...matchTokens(conclusionText),
    ...matchTokens(conclusion?.related_metric),
  ]
  const tokens = [...new Set(baseTokens)]
    .filter((token) => !/^viz[-_\s]*\d+$/.test(token))
    .filter((token) => !['conclusion', 'conclusiones', 'grafico', 'relacionado'].includes(token))

  if (!tokens.length) return insights

  const scored = asList(insights)
    .map((item) => {
      const text = insightSearchText(item)
      let score = tokens.filter((token) => text.includes(token)).length
      if (hasAnyToken(conclusionText, ['cluster', 'clusters', 'grupo']) && text.includes('cluster')) score += 3
      if (hasAnyToken(conclusionText, ['reasignacion', 'reasignaciones', 'reassignment']) && hasAnyToken(text, ['reasignacion', 'reassignment'])) score += 4
      if (hasAnyToken(conclusionText, ['sla', 'incumplido', 'breach']) && text.includes('sla')) score += 4
      if (hasAnyToken(conclusionText, ['prioridad', 'urgencia', 'impacto']) && hasAnyToken(text, ['prioridad', 'priority', 'urgencia', 'impacto'])) score += 3
      if (hasAnyToken(conclusionText, ['servicio', 'categoria']) && hasAnyToken(text, ['servicio', 'service', 'categoria', 'category'])) score += 3
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)

  if (scored.length >= 2) return scored
  return scored.length ? scored : insights
}

function getRecommendationActionType(recommendation, visualization, chartRenderer, graphReadiness = null) {
  const explicitAction = String(recommendation?.action_type || '').toLowerCase()
  const isGraphReady = graphReadiness?.ready ?? Boolean(visualization?.id && chartRenderer)
  if (explicitAction === 'chart') {
    return isGraphReady
      ? {
          label: 'Vista con grafico',
          hint: `Se puede representar con: ${chartRenderer.label} (${visualization.title}).`,
        }
      : {
          label: 'Revisar con agente',
          hint:
            graphReadiness?.reason ||
            recommendation?.evidence_needed ||
            'Falta una visualizacion vinculada con eje y metrica.',
        }
  }
  if (explicitAction === 'conclusion') {
    return {
      label: 'Conclusion asistida',
      hint: recommendation?.evidence_needed || 'Esta accion produce una conclusion ejecutiva con evidencia.',
    }
  }
  if (explicitAction === 'chat') {
    return {
      label: 'Pregunta al agente',
      hint: recommendation?.evidence_needed || 'Esta accion se responde mejor en el chat contextual.',
    }
  }

  if (isGraphReady) {
    return {
      label: 'Vista con grafico',
      hint: `Se puede representar con: ${chartRenderer.label} (${visualization.title}).`,
    }
  }

  const text = [
    recommendation?.title,
    recommendation?.why_it_matters,
    recommendation?.what_to_analyze,
    recommendation?.recommended_next_step,
  ]
    .join(' ')
    .toLowerCase()

  if (text.includes('conclusion') || text.includes('presentable') || text.includes('ejecutiv')) {
    return {
      label: 'Conclusion asistida',
      hint: 'Esta accion se responde mejor en el chat con evidencia y lenguaje de negocio.',
    }
  }

  return {
    label: 'Analisis guiado',
    hint: 'Esta accion orienta el analisis y puede profundizarse con el agente.',
  }
}

function recommendationChatActionLabel(recommendation) {
  const actionType = String(recommendation?.action_type || '').toLowerCase()
  if (actionType === 'conclusion') return 'Preparar conclusion'
  if (actionType === 'chat') return 'Preguntar al agente'
  return 'Preguntar al agente'
}

function relatedItemLabel(semanticMap, value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return semanticLabel(semanticMap, text) || text
}

function buildVisualizationMeaning(visualization, chartRenderer, semanticMap, spec, evidenceCount = 0, isExpertMode = false) {
  if (!visualization) return []
  const xLabel = semanticLabel(semanticMap, visualization.x || visualization.group_by)
  const metricLabel = semanticLabel(semanticMap, visualization.metric || visualization.y)
  const sourceLabel = spec?.llm_used
    ? (isExpertMode ? 'LLM' : 'Asistente')
    : (isExpertMode ? 'Reglas locales' : 'Respaldo automatico')
  const sourceDetail = isExpertMode
    ? spec?.llm_detail ||
      (spec?.llm_used ? 'Sugerencia generada por el agente.' : 'Sugerencia calculada por reglas locales.')
    : spec?.llm_used
      ? 'El asistente propuso esta lectura y el sistema la valida con los datos disponibles.'
      : 'El sistema genero esta lectura como respaldo usando datos disponibles.'
  const evidenceSuffix = evidenceCount
    ? ` Se apoya en ${evidenceCount.toLocaleString('es-ES')} evidencias guardadas del filtro actual.`
    : ''
  return [
    {
      title: 'Que estoy viendo',
      body:
        visualization.what_i_am_seeing ||
        `Una vista de ${xLabel || 'los hallazgos'} usando ${metricLabel || chartRenderer?.label || 'conteo'} como referencia.`,
    },
    {
      title: 'Por que importa',
      body: visualization.why_it_matters || visualization.reason || 'Ayuda a convertir evidencias guardadas en una lectura accionable.',
    },
    {
      title: 'Evidencia que lo respalda',
      body:
        `${visualization.evidence_used || visualization.question_answered || 'Hallazgos guardados y registros asociados a la ejecucion actual.'}${evidenceSuffix}`,
    },
    {
      title: 'Accion sugerida',
      body: visualization.suggested_action || visualization.drilldown || 'Usa el drill-down o pregunta al agente para revisar causas y acciones.',
    },
    {
      title: `Origen: ${sourceLabel}`,
      body: sourceDetail,
    },
  ]
}

function buildRelatedEvidenceItems({ activePriorityLevel, priorityDrilldownItems, activeInsightKey, chartInsights }) {
  if (activePriorityLevel) return priorityDrilldownItems.slice(0, 12)
  if (!activeInsightKey) return chartInsights.slice(0, 12)
  const selected = chartInsights.find((item) => insightKey(item) === activeInsightKey)
  if (!selected) return chartInsights.slice(0, 12)
  const selectedKind = metricKind(selected.metric_label)
  const related = chartInsights.filter((item) => {
    if (insightKey(item) === activeInsightKey) return true
    return (
      metricKind(item.metric_label) === selectedKind ||
      (selected.filter_kind && item.filter_kind === selected.filter_kind) ||
      (selected.dimension && item.dimension === selected.dimension)
    )
  })
  return related.slice(0, 12)
}

export function ConversationDashboardPage({
  embedded = false,
  toolbarHost = null,
  isExpert: isExpertProp = null,
}) {
  const { isExpert: storedIsExpert } = useAnalysisUserProfile()
  const [selectedRunId, setSelectedRunId] = useState('')
  const [metricFilter, setMetricFilter] = useState('all')
  const [activeInsightKey, setActiveInsightKey] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [listPage, setListPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [activeVisualizationId, setActiveVisualizationId] = useState('')
  const [activeChartRendererId, setActiveChartRendererId] = useState('')
  const [activeRecommendationId, setActiveRecommendationId] = useState('')
  const [activePriorityLevel, setActivePriorityLevel] = useState('')
  const [activeConclusionId, setActiveConclusionId] = useState('')
  const [activeChartConclusionId, setActiveChartConclusionId] = useState('')
  const [chartRefreshKey, setChartRefreshKey] = useState(0)
  const [chartNotice, setChartNotice] = useState('')
  const [chartEvidenceOpen, setChartEvidenceOpen] = useState(false)
  const [chartBackendData, setChartBackendData] = useState(null)
  const [chartBackendLoading, setChartBackendLoading] = useState(false)
  const [chartBackendError, setChartBackendError] = useState('')
  const [activeBackendSegmentKey, setActiveBackendSegmentKey] = useState('')
  const [ticketSearch, setTicketSearch] = useState('')
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('all')
  const [ticketServiceFilter, setTicketServiceFilter] = useState('all')
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState('all')
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all')
  const [selectedBackendTicketKeys, setSelectedBackendTicketKeys] = useState(() => new Set())
  const [feedbackState, setFeedbackState] = useState({})
  const [feedbackReasonState, setFeedbackReasonState] = useState({})
  const [savedOperationState, setSavedOperationState] = useState({ status: 'idle', key: '' })
  const [semanticDictionaryState, setSemanticDictionaryState] = useState(null)
  const [semanticDraftRows, setSemanticDraftRows] = useState([])
  const [semanticDictionaryLoading, setSemanticDictionaryLoading] = useState(false)
  const [semanticDictionarySaving, setSemanticDictionarySaving] = useState(false)
  const [semanticDictionaryError, setSemanticDictionaryError] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [savedInsightsOpen, setSavedInsightsOpen] = useState(false)
  const [chatOpenSignal, setChatOpenSignal] = useState(0)
  const [chatExternalPrompt, setChatExternalPrompt] = useState(null)
  const activeChartRef = useRef(null)
  const conclusionDetailRef = useRef(null)
  const recommendationsPresentedKeyRef = useRef('')
  const latestChartRequestRef = useRef('')

  const {
    data: aggregateDashboard = EMPTY_DASHBOARD,
    isLoading: aggregateDashboardLoading,
    error: aggregateDashboardError,
    refetch: refetchAggregateDashboard,
    isFetching: aggregateDashboardFetching,
  } = useConversationDashboard()

  const {
    data: selectedDashboard = EMPTY_DASHBOARD,
    isLoading: selectedDashboardLoading,
    error: selectedDashboardError,
    refetch: refetchSelectedDashboard,
    isFetching: selectedDashboardFetching,
  } = useConversationDashboard(selectedRunId, { enabled: Boolean(selectedRunId) })

  const {
    data: runs = [],
    isLoading: runsLoading,
    refetch: refetchRuns,
    isFetching: runsFetching,
  } = useRunsList(50)

  const dashboard = selectedRunId ? selectedDashboard : aggregateDashboard
  const dashboardLoading = selectedRunId ? selectedDashboardLoading : aggregateDashboardLoading
  const dashboardFetching = selectedRunId ? selectedDashboardFetching : aggregateDashboardFetching
  const dashboardError = selectedRunId ? selectedDashboardError : aggregateDashboardError
  const loading = dashboardLoading || runsLoading
  const isSoftLoading = refreshing || dashboardFetching || runsFetching
  const queryErrorMessage =
    dashboardError instanceof Error
      ? dashboardError.message
      : dashboardError
        ? 'No se pudo cargar el dashboard'
        : null
  const displayError = error ?? queryErrorMessage

  const dashboardContract = useMemo(
    () => normalizeDashboardSpecContract(dashboard.dashboard_spec),
    [dashboard.dashboard_spec],
  )
  const spec = dashboardContract.spec
  const executive = useMemo(() => spec.executive_summary ?? {}, [spec])
  const semanticVariables = useMemo(() => asList(spec.semantic_variables), [spec.semantic_variables])
  const semanticMap = useMemo(() => semanticMapFromList(semanticVariables), [semanticVariables])
  const expertCorrelations = useMemo(() => {
    const candidates = [
      ...asList(spec.data_quality?.correlations),
      ...asList(spec.technical_profile?.correlations),
      ...asList(dashboard.data_quality?.correlations),
      ...asList(dashboard.correlations),
    ]
    const seen = new Set()
    return candidates
      .map((pair) => {
        const columnA = pair?.column_a ?? pair?.variable_a ?? pair?.left ?? pair?.x ?? ''
        const columnB = pair?.column_b ?? pair?.variable_b ?? pair?.right ?? pair?.y ?? ''
        const coefficient = Number(pair?.coefficient ?? pair?.correlation ?? pair?.value ?? 0)
        return { column_a: columnA, column_b: columnB, coefficient }
      })
      .filter((pair) => {
        if (!pair.column_a || !pair.column_b || !Number.isFinite(pair.coefficient)) return false
        const key = `${pair.column_a}::${pair.column_b}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [dashboard.correlations, dashboard.data_quality?.correlations, spec.data_quality?.correlations, spec.technical_profile?.correlations])
  const aggregateInsights = useMemo(
    () => aggregateDashboard.insights ?? [],
    [aggregateDashboard.insights],
  )
  const allInsights = useMemo(() => dashboard.insights ?? [], [dashboard.insights])
  const insights = useMemo(() => {
    if (!selectedRunId) return allInsights
    return allInsights.filter((item) => item.run_id === selectedRunId)
  }, [allInsights, selectedRunId])
  const isPageLoading = loading || isSoftLoading
  const dashboardProgress = useEstimatedDashboardProgress(isPageLoading)
  const loadingTitle =
    refreshing || (isSoftLoading && allInsights.length > 0)
      ? 'Actualizando dashboard conversacional...'
      : 'Cargando dashboard conversacional'
  const runsForFilter = useMemo(
    () => buildRunsForFilter(runs, aggregateInsights),
    [runs, aggregateInsights],
  )
  const kindCounts = useMemo(() => countInsightsByKind(insights), [insights])
  const metricKinds = useMemo(() => {
    return Object.keys(kindCounts).sort((a, b) => kindCounts[b] - kindCounts[a])
  }, [kindCounts])
  const filteredInsights = useMemo(() => {
    if (metricFilter === 'all') return insights
    return insights.filter((item) => metricKind(item.metric_label) === metricFilter)
  }, [insights, metricFilter])
  const summary = useMemo(() => summarize(filteredInsights), [filteredInsights])
  const priorityMaxByKind = useMemo(() => buildMaxByKind(filteredInsights), [filteredInsights])
  const priorityDrilldownItems = useMemo(() => {
    if (!activePriorityLevel) return []
    return filteredInsights.filter(
      (item) => insightPriorityLevel(item, priorityMaxByKind) === activePriorityLevel,
    )
  }, [activePriorityLevel, filteredInsights, priorityMaxByKind])
  const paginatedInsights = useMemo(
    () => paginateDashboardList(filteredInsights, listPage, DASHBOARD_PAGE_SIZE),
    [filteredInsights, listPage],
  )
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
  const selectedInsights = useMemo(() => {
    return filteredInsights.filter((item) => selectedKeys.has(insightKey(item)))
  }, [filteredInsights, selectedKeys])
  const avgSlaLabel = formatMetric('sla_breach_rate', summary.avgSla)
  const avgRiskLabel = formatMetric('avg_risk', summary.avgRisk)
  const activeChartKey = activeInsight ? insightKey(activeInsight) : activeInsightKey
  const activeRunId = selectedRunId || activeInsight?.run_id || ''
  const activeRun = useMemo(
    () => runsForFilter.find((run) => run.id === activeRunId) ?? null,
    [runsForFilter, activeRunId],
  )
  const chatRun = activeRun || (activeRunId ? { id: activeRunId } : null)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFeedbackState(activeRunId ? readStoredFeedback(activeRunId) : {})
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeRunId])
  const clusterCoverage = useMemo(
    () => summarizeClusterCoverage(filteredInsights),
    [filteredInsights],
  )
  const showClusterCharts = useMemo(
    () => hasClusterInsightData(filteredInsights),
    [filteredInsights],
  )
  const showBusinessCharts = useMemo(
    () =>
      hasSegmentedDimensionData(filteredInsights) ||
      hasDimensionEvidenceData(filteredInsights) ||
      hasInsightImpactData(filteredInsights),
    [filteredInsights],
  )
  const chartDataState = useMemo(
    () => ({
      hasInsights: filteredInsights.length > 0,
      hasClusterCharts: showClusterCharts,
      hasClusterVolume: hasClusterVolumeData(filteredInsights),
      hasClusterMap: hasClusterMapData(filteredInsights),
      hasSlaRiskMap: hasSlaRiskMapData(filteredInsights),
      hasScatter: hasClusterMapData(filteredInsights) || hasSlaRiskMapData(filteredInsights),
      hasSegmentedDimension: hasSegmentedDimensionData(filteredInsights),
      hasDimensionEvidence: hasDimensionEvidenceData(filteredInsights),
      hasDimensionTreemap: Boolean(buildDimensionTreemapData(filteredInsights)),
      hasInsightImpact: hasInsightImpactData(filteredInsights),
      hasBusinessCharts: showBusinessCharts,
    }),
    [filteredInsights, showBusinessCharts, showClusterCharts],
  )
  const findings = asList(spec.priority_findings)
  const audienceMode = (isExpertProp ?? storedIsExpert) ? 'experto' : 'funcional'
  const isExpertMode = audienceMode === 'experto'
  const operationalReadiness = useMemo(
    () =>
      normalizeOperationalReadiness(spec.operational_readiness, {
        selectedRunId,
        fallbackInsightsCount: insights.length,
      }),
    [insights.length, selectedRunId, spec.operational_readiness],
  )
  const runScopeMismatch = Boolean(
    selectedRunId &&
      operationalReadiness.active_run_id &&
      operationalReadiness.active_run_id !== selectedRunId,
  )
  const backendFeedbackState = useMemo(
    () => feedbackStateFromBackend(spec.recommendation_feedback),
    [spec.recommendation_feedback],
  )
  const backendFeedbackReasonState = useMemo(
    () => feedbackReasonStateFromBackend(spec.recommendation_feedback),
    [spec.recommendation_feedback],
  )
  const effectiveFeedbackState = useMemo(
    () => ({ ...backendFeedbackState, ...feedbackState }),
    [backendFeedbackState, feedbackState],
  )
  const effectiveFeedbackReasonState = useMemo(
    () => ({ ...backendFeedbackReasonState, ...feedbackReasonState }),
    [backendFeedbackReasonState, feedbackReasonState],
  )
  const visibleReadinessWarnings = useMemo(
    () =>
      buildVisibleReadinessWarnings(operationalReadiness, {
        isExpertMode,
        runScopeMismatch,
        textForProfile,
      }),
    [isExpertMode, operationalReadiness, runScopeMismatch],
  )
  const visibleRequiredActions = useMemo(
    () =>
      visibleReadinessActions(operationalReadiness, {
        isExpertMode,
        textForProfile,
      }),
    [isExpertMode, operationalReadiness],
  )
  const visualizations = useMemo(
    () => audienceList(spec.suggested_visualizations, audienceMode),
    [audienceMode, spec.suggested_visualizations],
  )
  const rawRecommendations = useMemo(
    () => audienceList(spec.agent_recommendations, audienceMode),
    [audienceMode, spec.agent_recommendations],
  )
  const recommendations = useMemo(() => {
    return rawRecommendations.filter((recommendation) => {
      const recommendationText = recommendationSearchText(recommendation)
      const visualization = findVisualizationForRecommendation(recommendation, visualizations, chartDataState)
      const chartRenderer = selectChartRenderer(visualization, chartDataState, recommendationText)
      return shouldShowRecommendationForMode(
        recommendation,
        visualization,
        chartRenderer,
        semanticMap,
        isExpertMode,
      )
    })
  }, [chartDataState, isExpertMode, rawRecommendations, semanticMap, visualizations])
  const rankedRecommendations = useMemo(
    () => sortRecommendationsByFeedback(recommendations, effectiveFeedbackState),
    [effectiveFeedbackState, recommendations],
  )
  const showDetailPanels = isExpertMode || detailOpen
  const visibleRecommendations = useMemo(
    () => (isExpertMode ? rankedRecommendations : rankedRecommendations.slice(0, 3)),
    [isExpertMode, rankedRecommendations],
  )
  const agentGuideItems = useMemo(
    () =>
      visibleRecommendations.map((recommendation, index) => {
        const recommendationText = recommendationSearchText(recommendation)
        const visualization = findVisualizationForRecommendation(
          recommendation,
          visualizations,
          chartDataState,
        )
        const chartRenderer = selectChartRenderer(
          visualization,
          chartDataState,
          recommendationText,
        )
        const graphReadiness = visualizationGraphReadiness(
          visualization,
          chartRenderer,
          semanticMap,
          isExpertMode,
        )
        const actionType = getRecommendationActionType(
          recommendation,
          visualization,
          chartRenderer,
          graphReadiness,
        )
        const evaluationItems = buildRecommendationEvaluation(
          recommendation,
          visualization,
          chartRenderer,
          semanticMap,
          isExpertMode,
          spec,
          graphReadiness,
        )
        const feedbackValue = effectiveFeedbackState[recommendation.id] || ''
        const feedbackReason = effectiveFeedbackReasonState[recommendation.id] || ''
        const feedbackPersisted = Boolean(backendFeedbackState[recommendation.id])
        const feedbackLocal = Boolean(feedbackState[recommendation.id])
        return {
          id: recommendation.id,
          number: String(index + 1).padStart(2, '0'),
          recommendation,
          visualization,
          chartRenderer,
          graphReadiness,
          evaluationItems,
          isActive: activeRecommendationId === recommendation.id,
          audienceLabel: audienceLabel(recommendation.audience, isExpertMode),
          actionLabel: textForProfile(actionType.label, isExpertMode),
          title: textForProfile(recommendation.title, isExpertMode),
          body: textForProfile(recommendation.why_it_matters || recommendation.what_to_analyze, isExpertMode),
          nextStep: textForProfile(recommendation.recommended_next_step, isExpertMode),
          hint: textForProfile(actionType.hint, isExpertMode),
          graphReady: graphReadiness.ready,
          applyLabel: activeRecommendationId === recommendation.id ? 'Enfoque activo' : 'Aplicar enfoque',
          chatLabel: recommendationChatActionLabel(recommendation),
          feedbackValue,
          feedbackReason,
          feedbackStatus: feedbackValue
            ? feedbackValue === 'useful'
              ? `${feedbackPersisted && !feedbackLocal ? 'Feedback historico' : 'Feedback persistido'}: se priorizara como recomendacion util.`
              : `${feedbackPersisted && !feedbackLocal ? 'Feedback historico' : 'Feedback persistido'}: se marcara para ajustar futuras propuestas.`
            : '',
        }
      }),
    [
      activeRecommendationId,
      chartDataState,
      backendFeedbackState,
      effectiveFeedbackReasonState,
      effectiveFeedbackState,
      feedbackState,
      isExpertMode,
      semanticMap,
      spec,
      visibleRecommendations,
      visualizations,
    ],
  )
  const conclusions = asList(spec.conclusions)
  const conclusionMatrixItems = useMemo(
    () => buildConclusionMatrixItems(conclusions),
    [conclusions],
  )
  const visibleConclusionListItems = useMemo(
    () => (showDetailPanels ? conclusionMatrixItems : conclusionMatrixItems.slice(0, 3)),
    [conclusionMatrixItems, showDetailPanels],
  )
  const activeConclusionItem = useMemo(
    () =>
      conclusionMatrixItems.find((item) => item.id === activeConclusionId) ??
      conclusionMatrixItems[0] ??
      null,
    [activeConclusionId, conclusionMatrixItems],
  )
  const activeChartConclusionItem = useMemo(
    () =>
      conclusionMatrixItems.find((item) => item.id === activeChartConclusionId) ??
      null,
    [activeChartConclusionId, conclusionMatrixItems],
  )
  const activeConclusionGraphCandidate = useMemo(
    () =>
      activeConclusionItem?.source
        ? conclusionGraphCandidate(
            activeConclusionItem.source,
            visualizations,
            chartDataState,
            semanticMap,
            isExpertMode,
          )
        : { visualization: null, chartRenderer: null, readiness: { ready: false, reason: '' } },
    [activeConclusionItem, chartDataState, isExpertMode, semanticMap, visualizations],
  )
  const chartInsights = useMemo(() => {
    if (!activeChartConclusionItem?.source) return filteredInsights
    return filterInsightsForConclusion(filteredInsights, activeChartConclusionItem.source)
  }, [activeChartConclusionItem, filteredInsights])
  const evidenceLine = asList(spec.evidence_line)
  const visibleEvidenceLine = isExpertMode ? evidenceLine : evidenceLine.slice(0, 4)
  const contextTags = useMemo(() => {
    const tags = [...asList(executive.main_variables), ...asList(executive.key_metrics)]
    const uniqueTags = [...new Set(tags.filter(Boolean))]
    const visibleTags = isExpertMode
      ? uniqueTags.slice(0, 16)
      : uniqueTags.filter((item) => !isTechnicalToken(item) && semanticRole(semanticMap, item) !== 'technical').slice(0, 8)
    return visibleTags.map((item) => ({
      name: item,
      label: semanticLabel(semanticMap, item),
      role: semanticRole(semanticMap, item),
    }))
  }, [executive.key_metrics, executive.main_variables, isExpertMode, semanticMap])
  const suggestedQuestions =
    audienceMode === 'experto'
      ? asList(spec.suggested_questions?.expert_user)
      : asList(spec.suggested_questions?.functional_user)
  const dashboardUsageSummary = useMemo(
    () => spec.dashboard_usage_summary || {},
    [spec.dashboard_usage_summary],
  )
  const executiveSummaryView = useMemo(() => {
    const usageItems = [
      {
        label: 'Graficos abiertos',
        value: Number(dashboardUsageSummary.charts_opened || 0).toLocaleString('es-ES'),
      },
      {
        label: 'Tickets al agente',
        value: Number(dashboardUsageSummary.tickets_sent_to_agent || 0).toLocaleString('es-ES'),
      },
      {
        label: 'Exportaciones',
        value: Number(dashboardUsageSummary.exports || 0).toLocaleString('es-ES'),
      },
      {
        label: 'Informes preparados',
        value: Number(dashboardUsageSummary.reports_prepared || 0).toLocaleString('es-ES'),
      },
    ]
    const usageRecent = asList(dashboardUsageSummary.recent)
      .slice(-5)
      .reverse()
      .map((event, index) => ({
        id: `${event.event_type || 'event'}-${event.target_id || index}-${event.created_at || index}`,
        label: `${event.event_type || 'evento'}${event.target_title ? `: ${event.target_title}` : ''}`,
      }))

    const metrics = [
      { label: 'Dataset', value: executive.dataset_name || 'Analisis actual' },
      {
        label: 'Registros',
        value: Number(executive.records_count || 0).toLocaleString('es-ES'),
      },
    ]
    if (isExpertMode) {
      metrics.push({
        label: 'Columnas',
        value: Number(executive.columns_count || 0).toLocaleString('es-ES'),
      })
    }
    metrics.push(
      { label: 'Evidencias', value: insights.length.toLocaleString('es-ES') },
      {
        label: 'Modo',
        value: isExpertMode
          ? spec.llm_used
            ? 'LLM'
            : 'Reglas locales'
          : spec.llm_used
            ? 'Asistente'
            : 'Respaldo automatico',
      },
    )

    const readinessSignals = [
      runScopeLabel(operationalReadiness, isExpertMode),
      evidenceModeLabel(operationalReadiness.evidence_mode, isExpertMode),
      trustLevelLabel(operationalReadiness.trust_level, isExpertMode),
      operationalReadiness.decision_level === 'operational'
        ? isExpertMode
          ? 'Decision operativa habilitada'
          : 'Listo para decidir'
        : operationalReadiness.decision_level === 'assisted_review'
          ? isExpertMode
            ? 'Revision asistida'
            : 'Requiere revision'
          : isExpertMode
            ? 'Lectura interpretativa'
            : 'Solo orientativo',
      operationalReadiness.evidence_materialized
        ? `${operationalReadiness.evidence_records.toLocaleString('es-ES')} evidencias reales`
        : isExpertMode
          ? 'Sin evidencias materializadas'
          : 'Sin tickets listos para revisar',
      spec.llm_used
        ? operationalReadiness.llm_validated
          ? isExpertMode
            ? 'LLM validado con datos'
            : 'Agente validado con datos'
          : isExpertMode
            ? 'LLM ajustado por backend'
            : 'Agente ajustado con datos'
        : 'Respaldo automatico',
      operationalReadiness.semantic_dictionary_configured
        ? isExpertMode
          ? `Diccionario gobernado (${operationalReadiness.semantic_dictionary_configured_count.toLocaleString('es-ES')})`
          : 'Variables gobernadas'
        : isExpertMode
          ? 'Diccionario base'
          : 'Variables traducidas automaticamente',
    ]
    if (isExpertMode) {
      readinessSignals.splice(
        2,
        0,
        `${operationalReadiness.evidence_runs.toLocaleString('es-ES')} ejecuciones con evidencia`,
      )
    }

    const semanticItems = semanticVariables
      .filter((item) => isExpertMode || !['technical', 'identifier'].includes(item.role))
      .slice(0, isExpertMode ? 14 : 8)
      .map((item) => ({
        id: item.name,
        title: item.label || item.name,
        description: isExpertMode ? `${item.name} | ${item.role}` : item.description || '',
        warning: item.avoid_as_metric ? 'Evitar como metrica funcional' : '',
      }))

    const technicalVisualizations = isExpertMode
      ? visualizations.map((visualization) => {
          const chartRenderer = selectChartRenderer(visualization, chartDataState)
          return {
            id: visualization.id,
            title: visualization.title,
            source: visualization,
            disabled: !chartRenderer,
            meta: `${
              chartRenderer?.label ||
              CHART_LABELS[visualization.chart_type] ||
              visualization.chart_type ||
              'Sin grafica compatible'
            } | Eje X: ${visualization.x || visualization.group_by || 'sin eje'} | Metrica: ${
              visualization.metric || visualization.y || 'count'
            }`,
          }
        })
      : []

    return {
      title: textForProfile(executive.title || 'Resumen ejecutivo', isExpertMode),
      description: isExpertMode
        ? 'Perfil experto activo: se muestra trazabilidad, variables, visualizaciones tecnicas y base de evidencia.'
        : 'Perfil funcional activo: se priorizan conclusiones, acciones y graficos interpretables.',
      profileLabel: isExpertMode ? 'Perfil experto' : 'Perfil funcional',
      contract: {
        status: dashboardContract.status,
        label: dashboardContractLabel(dashboardContract, isExpertMode),
        message: dashboardContractMessage(dashboardContract, isExpertMode),
        schemaVersion: dashboardContract.spec.schema_version || '',
      },
      context: {
        title: isExpertMode ? 'Contexto tecnico del analisis' : 'Contexto ejecutivo del analisis',
        metrics,
        objective: textForProfile(executive.analysis_objective || 'Objetivo inferido', isExpertMode),
        summary: textForProfile(
          executive.summary ||
            (isExpertMode
              ? 'El backend no devolvio resumen ejecutivo.'
              : 'No se recibio resumen ejecutivo para esta ejecucion.'),
          isExpertMode,
        ),
        tags: contextTags.map((item) => ({
          ...item,
          title: isExpertMode ? `${item.name} - ${item.role || 'sin rol'}` : item.name,
        })),
      },
      readiness: {
        statusClass: readinessStatusClass(operationalReadiness.status),
        title: isExpertMode ? 'Madurez operativa' : 'Estado del analisis',
        label: readinessStatusLabel(operationalReadiness.status, isExpertMode),
        evidenceMaterialized: operationalReadiness.evidence_materialized,
        evidenceMode: operationalReadiness.evidence_mode,
        evidenceModeLabel: evidenceModeLabel(operationalReadiness.evidence_mode, isExpertMode),
        trustLevel: operationalReadiness.trust_level,
        trustLabel: trustLevelLabel(operationalReadiness.trust_level, isExpertMode),
        evidenceLabel: operationalReadiness.evidence_materialized
          ? `${operationalReadiness.evidence_records.toLocaleString('es-ES')} evidencias reales`
          : isExpertMode
            ? '0 evidencias materializadas'
            : 'Sin casos reales listos',
        scopeLabel: runScopeLabel(operationalReadiness, isExpertMode),
        decisionLabel:
          operationalReadiness.decision_level === 'operational'
            ? isExpertMode
              ? 'Decision operativa'
              : 'Listo para decidir'
            : operationalReadiness.decision_level === 'assisted_review'
              ? isExpertMode
                ? 'Revision asistida'
                : 'Requiere revision'
              : isExpertMode
                ? 'Interpretativo'
                : 'Orientativo',
        summary: textForProfile(
          (isExpertMode
            ? operationalReadiness.expert_message
            : operationalReadiness.functional_message) ||
            operationalReadiness.summary ||
            'El backend no informo el estado operativo de esta vista.',
          isExpertMode,
        ),
        nextStep: textForProfile(operationalReadiness.recommended_next_step, isExpertMode),
        signals: readinessSignals,
        warnings: visibleReadinessWarnings,
        blockingReasons: operationalReadiness.blocking_reasons
          .map((reason) => textForProfile(reason, isExpertMode))
          .filter(Boolean)
          .slice(0, isExpertMode ? 5 : 2),
        requiredActions: visibleRequiredActions,
      },
      detail: {
        open: detailOpen,
        evidenceTitle: isExpertMode ? 'Linea de evidencia' : 'Como se construyo el analisis',
        evidenceItems: visibleEvidenceLine.map((step) => ({
          id: `${step.step}-${step.title}`,
          title: textForProfile(cleanEvidenceTitle(step.title), isExpertMode),
          description: textForProfile(step.description, isExpertMode),
          sourceLabel: isExpertMode ? badgeLabel(step.source) : '',
        })),
        questionsTitle: isExpertMode ? 'Preguntas tecnicas sugeridas' : 'Preguntas para el agente',
        questions: suggestedQuestions,
        semanticTitle: isExpertMode ? 'Capa semantica de variables' : 'Variables traducidas',
        semanticDescription: operationalReadiness.semantic_dictionary_configured
          ? `${operationalReadiness.semantic_dictionary_configured_count.toLocaleString('es-ES')} variables configuradas (${operationalReadiness.semantic_dictionary_active_count.toLocaleString('es-ES')} activas, ${operationalReadiness.semantic_dictionary_inactive_count.toLocaleString('es-ES')} inactivas) en ${operationalReadiness.semantic_dictionary_source || 'diccionario semantico'}.`
          : `Usando diccionario base con ${operationalReadiness.semantic_dictionary_total.toLocaleString('es-ES')} variables detectadas para este run.`,
        semanticItems,
        technicalVisualizationsTitle: 'Visualizaciones tecnicas disponibles',
        technicalVisualizations,
        usageTitle: 'Observabilidad de uso',
        usageDescription: textForProfile(
          dashboardUsageSummary.guidance ||
            'Sin eventos de uso persistidos para este dashboard.',
          true,
        ),
        usageItems,
        usageRecent,
      },
    }
  }, [
    chartDataState,
    contextTags,
    dashboardContract,
    dashboardUsageSummary,
    detailOpen,
    executive,
    insights.length,
    isExpertMode,
    operationalReadiness,
    semanticVariables,
    spec.llm_used,
    suggestedQuestions,
    visibleEvidenceLine,
    visibleRequiredActions,
    visibleReadinessWarnings,
    visualizations,
  ])
  const hasDashboardData = allInsights.length > 0 || getSpecHasContent(spec)
  const activeVisualization = useMemo(() => {
    const isRenderable = (item) => Boolean(selectChartRenderer(item, chartDataState))
    return (
      visualizations.find((item) => item.id === activeVisualizationId && isRenderable(item)) ??
      visualizations.find((item) => item.id === spec.active_chart_default?.visualization_id && isRenderable(item)) ??
      visualizations.find(isRenderable) ??
      visualizations[0] ??
      null
    )
  }, [activeVisualizationId, chartDataState, spec.active_chart_default?.visualization_id, visualizations])
  const activeChartRenderer = useMemo(
    () =>
      findChartRendererById(activeChartRendererId, chartDataState) ??
      selectChartRenderer(activeVisualization, chartDataState),
    [activeChartRendererId, activeVisualization, chartDataState],
  )
  const activeVisualizationRequest = useMemo(() => {
    if (!activeVisualization) return null
    return {
      id: activeVisualization.id,
      title: activeVisualization.title,
      chart_type: activeVisualization.chart_type,
      x: activeVisualization.x,
      y: activeVisualization.y,
      metric: activeVisualization.metric,
      group_by: activeVisualization.group_by,
      aggregation: activeVisualization.aggregation,
      filters: activeVisualization.filters || [],
      reason: activeVisualization.reason,
      evidence_used: activeVisualization.evidence_used,
      question_answered: activeVisualization.question_answered,
    }
  }, [activeVisualization])
  const activeVisualizationRequestKey = useMemo(
    () => (activeVisualizationRequest ? JSON.stringify(activeVisualizationRequest) : ''),
    [activeVisualizationRequest],
  )
  useEffect(() => {
    if (!activeRunId || !activeVisualizationRequestKey) {
      latestChartRequestRef.current = ''
      const timer = window.setTimeout(() => {
        setChartBackendData(null)
        setChartBackendError('')
        setChartBackendLoading(false)
        setActiveBackendSegmentKey('')
      }, 0)
      return () => window.clearTimeout(timer)
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setChartBackendLoading(true)
      setChartBackendError('')
      const visualizationRequest = JSON.parse(activeVisualizationRequestKey)
      const requestRunId = activeRunId
      const requestIdentity = buildChartRequestIdentity({
        runId: requestRunId,
        requestKey: activeVisualizationRequestKey,
        refreshKey: chartRefreshKey,
      })
      latestChartRequestRef.current = requestIdentity
      fetchConversationChartData(requestRunId, visualizationRequest, {
        limit: ACTIVE_CHART_SERIES_LIMIT,
        evidenceLimit: ACTIVE_CHART_INITIAL_EVIDENCE_LIMIT,
      })
        .then((data) => {
          if (cancelled || latestChartRequestRef.current !== requestIdentity) return
          if (!responseBelongsToRun(data?.run_id, requestRunId)) {
            setChartBackendData(null)
            setActiveBackendSegmentKey('')
            setChartBackendError(runMismatchMessage({ isExpertMode }))
            return
          }
          setChartBackendData(data)
          setActiveBackendSegmentKey(data?.series?.[0]?.key || '')
        })
        .catch((err) => {
          if (cancelled || latestChartRequestRef.current !== requestIdentity) return
          setChartBackendData(null)
          setActiveBackendSegmentKey('')
          setChartBackendError(
            err instanceof Error ? err.message : 'No se pudieron calcular datos reales del grafico.',
          )
        })
        .finally(() => {
          if (!cancelled && latestChartRequestRef.current === requestIdentity) {
            setChartBackendLoading(false)
          }
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeRunId, activeVisualizationRequestKey, chartRefreshKey, isExpertMode])
  const chartBackendRunMismatch = Boolean(
    chartBackendData?.run_id && activeRunId && chartBackendData.run_id !== activeRunId,
  )
  const activeVisualizationMeaning = useMemo(
    () =>
      buildVisualizationMeaning(
        activeVisualization,
        activeChartRenderer,
        semanticMap,
        spec,
        chartBackendRunMismatch ? chartInsights.length : chartBackendData?.total_records || chartInsights.length,
        isExpertMode,
      ),
    [
      activeChartRenderer,
      activeVisualization,
      chartBackendData?.total_records,
      chartBackendRunMismatch,
      chartInsights.length,
      isExpertMode,
      semanticMap,
      spec,
    ],
  )
  const relatedEvidenceItems = useMemo(
    () =>
      buildRelatedEvidenceItems({
        activePriorityLevel,
        priorityDrilldownItems,
        activeInsightKey,
        chartInsights,
      }),
    [activeInsightKey, activePriorityLevel, chartInsights, priorityDrilldownItems],
  )
  const backendEvidenceItems = useMemo(() => {
    if (!chartBackendData || chartBackendRunMismatch) return []
    return asList(
      chartBackendData.samples_by_key?.[activeBackendSegmentKey] ??
        chartBackendData.evidence_samples,
    )
  }, [activeBackendSegmentKey, chartBackendData, chartBackendRunMismatch])
  const activeBackendSegmentCount = useMemo(() => {
    const point = asList(chartBackendData?.series).find((item) => item.key === activeBackendSegmentKey)
    return Number(point?.count || backendEvidenceItems.length || 0)
  }, [activeBackendSegmentKey, backendEvidenceItems.length, chartBackendData?.series])
  const backendEvidencePriorityOptions = useMemo(() => {
    const priorities = backendEvidenceItems
      .map((item) => getBackendEvidencePriority(item))
      .filter(Boolean)
    return [...new Set(priorities)].sort((a, b) => a.localeCompare(b))
  }, [backendEvidenceItems])
  const backendEvidenceServiceOptions = useMemo(() => {
    const services = backendEvidenceItems
      .map((item) => backendEvidenceField(item, 'servicio', item.service || ''))
      .filter(Boolean)
    return [...new Set(services)].sort((a, b) => a.localeCompare(b))
  }, [backendEvidenceItems])
  const backendEvidenceCategoryOptions = useMemo(() => {
    const categories = backendEvidenceItems
      .map((item) => getBackendEvidenceCategory(item))
      .filter(Boolean)
    return [...new Set(categories)].sort((a, b) => a.localeCompare(b))
  }, [backendEvidenceItems])
  const backendEvidenceStatusOptions = useMemo(() => {
    const statuses = backendEvidenceItems
      .map((item) => getBackendEvidenceStatus(item))
      .filter(Boolean)
    return [...new Set(statuses)].sort((a, b) => a.localeCompare(b))
  }, [backendEvidenceItems])
  const visibleBackendEvidenceRows = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase()
    return backendEvidenceItems.map((item, index) => ({ item, index })).filter(({ item }) => {
      const matchesPriority =
        ticketPriorityFilter === 'all' ||
        getBackendEvidencePriority(item).toLowerCase() === ticketPriorityFilter.toLowerCase()
      const service = backendEvidenceField(item, 'servicio', item.service || '')
      const matchesService =
        ticketServiceFilter === 'all' || service.toLowerCase() === ticketServiceFilter.toLowerCase()
      const category = getBackendEvidenceCategory(item)
      const matchesCategory =
        ticketCategoryFilter === 'all' || category.toLowerCase() === ticketCategoryFilter.toLowerCase()
      const status = getBackendEvidenceStatus(item)
      const matchesStatus =
        ticketStatusFilter === 'all' || status.toLowerCase() === ticketStatusFilter.toLowerCase()
      const matchesSearch = !query || backendEvidenceSearchText(item).includes(query)
      return matchesPriority && matchesService && matchesCategory && matchesStatus && matchesSearch
    })
  }, [
    backendEvidenceItems,
    ticketCategoryFilter,
    ticketPriorityFilter,
    ticketSearch,
    ticketServiceFilter,
    ticketStatusFilter,
  ])
  const visibleBackendEvidenceItems = useMemo(
    () => visibleBackendEvidenceRows.map((row) => row.item),
    [visibleBackendEvidenceRows],
  )
  const selectedBackendEvidenceItems = useMemo(() => {
    if (!selectedBackendTicketKeys.size) return []
    return backendEvidenceItems.filter((item, index) =>
      selectedBackendTicketKeys.has(backendEvidenceKey(item, index)),
    )
  }, [backendEvidenceItems, selectedBackendTicketKeys])
  const visibleBackendTicketRows = useMemo(
    () =>
      visibleBackendEvidenceRows.map(({ item, index }) => {
        const ticket = backendEvidenceField(
          item,
          'ticket',
          item.incident_id || item.evidence_id || `Ticket ${index + 1}`,
        )
        const key = backendEvidenceKey(item, index)
        return {
          key,
          item,
          index,
          ticket,
          selected: selectedBackendTicketKeys.has(key),
          meta: item.evidence_id || item.source || '',
          service: backendEvidenceField(item, 'servicio', item.service || 'Sin servicio'),
          category: backendEvidenceField(item, 'categoria', item.category || 'Sin categoria'),
          priority: backendEvidenceField(item, 'prioridad', item.priority || 'Sin dato'),
          group: backendEvidenceField(item, 'grupo', item.group || 'Sin grupo'),
          reassignments: backendEvidenceField(item, 'reasignaciones', '-'),
          description: compactText(item.preview || backendEvidenceTitle(item), isExpertMode ? 180 : 130),
        }
      }),
    [isExpertMode, selectedBackendTicketKeys, visibleBackendEvidenceRows],
  )
  const activeChartEvidenceItems = backendEvidenceItems.length ? backendEvidenceItems : relatedEvidenceItems

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resetRunDerivedDashboardState({
        setMetricFilter,
        setActiveInsightKey,
        setSelectedKeys,
        setListPage,
        setActiveVisualizationId,
        setActiveChartRendererId,
        setActiveRecommendationId,
        setActivePriorityLevel,
        setActiveConclusionId,
        setActiveChartConclusionId,
        setChartRefreshKey,
        setChartNotice,
        setChartEvidenceOpen,
        setChartBackendData,
        setChartBackendLoading,
        setChartBackendError,
        setActiveBackendSegmentKey,
        setTicketSearch,
        setTicketPriorityFilter,
        setTicketServiceFilter,
        setTicketCategoryFilter,
        setTicketStatusFilter,
        setSelectedBackendTicketKeys,
        setFeedbackReasonState,
        setSavedOperationState,
        setDetailOpen,
        setSavedInsightsOpen,
        setChatExternalPrompt,
        setSemanticDictionaryState,
        setSemanticDraftRows,
        setSemanticDictionaryLoading,
        setSemanticDictionarySaving,
        setSemanticDictionaryError,
      })
      recommendationsPresentedKeyRef.current = ''
      latestChartRequestRef.current = ''
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selectedRunId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resetTicketFilterState({
        setTicketSearch,
        setTicketPriorityFilter,
        setTicketServiceFilter,
        setTicketCategoryFilter,
        setTicketStatusFilter,
        setSelectedBackendTicketKeys,
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeBackendSegmentKey, activeVisualization?.id])

  function onRunChange(event) {
    const nextRunId = event.target.value
    setSelectedRunId(nextRunId)
    resetRunDerivedDashboardState(
      {
        setMetricFilter,
        setActiveInsightKey,
        setSelectedKeys,
        setListPage,
        setActiveVisualizationId,
        setActiveChartRendererId,
        setActiveRecommendationId,
        setActivePriorityLevel,
        setActiveConclusionId,
        setActiveChartConclusionId,
        setChartRefreshKey,
        setChartNotice,
        setChartEvidenceOpen,
        setChartBackendData,
        setChartBackendLoading,
        setChartBackendError,
        setActiveBackendSegmentKey,
        setTicketSearch,
        setTicketPriorityFilter,
        setTicketServiceFilter,
        setTicketCategoryFilter,
        setTicketStatusFilter,
        setSelectedBackendTicketKeys,
        setFeedbackReasonState,
        setSavedOperationState,
        setDetailOpen,
        setSavedInsightsOpen,
        setChatExternalPrompt,
        setSemanticDictionaryState,
        setSemanticDraftRows,
        setSemanticDictionaryLoading,
        setSemanticDictionarySaving,
        setSemanticDictionaryError,
      },
      { bumpChartRefresh: false },
    )
    recommendationsPresentedKeyRef.current = ''
    latestChartRequestRef.current = ''
  }

  function onMetricFilterChange(kind) {
    setMetricFilter(kind)
    setActiveInsightKey('')
    setActiveChartRendererId('')
    setActivePriorityLevel('')
    setActiveConclusionId('')
    setActiveChartConclusionId('')
    setChartEvidenceOpen(false)
    setChartNotice('')
    setActiveBackendSegmentKey('')
    setSelectedKeys(new Set())
    setListPage(0)
  }

  function toggleInsightSelection(item) {
    const key = insightKey(item)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSelectAllOnPage(pageItems) {
    const keys = pageItems.map((item) => insightKey(item))
    const allSelected = keys.length > 0 && keys.every((key) => selectedKeys.has(key))
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        keys.forEach((key) => next.delete(key))
      } else {
        keys.forEach((key) => next.add(key))
      }
      return next
    })
  }

  function toggleBackendTicketSelection(item, index) {
    const key = backendEvidenceKey(item, index)
    setSelectedBackendTicketKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSelectVisibleBackendTickets() {
    const keys = visibleBackendEvidenceRows.map(({ item, index }) => backendEvidenceKey(item, index))
    const allSelected = keys.length > 0 && keys.every((key) => selectedBackendTicketKeys.has(key))
    setSelectedBackendTicketKeys((prev) => {
      const next = new Set(prev)
      if (allSelected) keys.forEach((key) => next.delete(key))
      else keys.forEach((key) => next.add(key))
      return next
    })
  }

  function handleTicketFilterChange(name, value) {
    if (name === 'search') setTicketSearch(value)
    if (name === 'priority') setTicketPriorityFilter(value)
    if (name === 'service') setTicketServiceFilter(value)
    if (name === 'category') setTicketCategoryFilter(value)
    if (name === 'status') setTicketStatusFilter(value)
  }

  function clearTicketFilters() {
    resetTicketFilterState({
      setTicketSearch,
      setTicketPriorityFilter,
      setTicketServiceFilter,
      setTicketCategoryFilter,
      setTicketStatusFilter,
      setSelectedBackendTicketKeys,
    })
  }

  function analyzeBackendTicketRow(row) {
    openChatWithContext({
      label: row.ticket,
      intent: 'analizar ticket especifico desde drill-down',
      visibleText: `Analiza el ticket "${row.ticket}" dentro del segmento "${activeBackendSegmentKey}".`,
      context: {
        visualization: activeVisualization,
        chartData: chartBackendData,
        selectedSegment: activeBackendSegmentKey,
        ticket: row.item,
        drilldownEvidence: [row.item],
      },
    })
  }

  function getBackendTicketsForAction() {
    return selectedBackendEvidenceItems.length ? selectedBackendEvidenceItems : visibleBackendEvidenceItems
  }

  function exportBackendTicketsCsv() {
    const items = getBackendTicketsForAction()
    if (!items.length) {
      setChartNotice('No hay tickets visibles para exportar.')
      return
    }
    const segment = String(activeBackendSegmentKey || 'segmento').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
    downloadTextFile(
      `tickets_${segment}.csv`,
      buildEvidenceCsv(items),
      'text/csv;charset=utf-8',
    )
    setChartNotice(`Exportados ${items.length} tickets/evidencias a CSV.`)
    trackDashboardEvent('tickets_exported', {
      ticket_count: items.length,
      selected_segment: activeBackendSegmentKey || '',
      visualization_id: activeVisualization?.id || '',
      recommendation_id: activeRecommendationId || '',
    })
  }

  async function saveBackendTicketsAsOperationalSelection() {
    const items = getBackendTicketsForAction()
    if (!items.length) {
      setChartNotice('Selecciona o filtra tickets antes de guardar la seleccion operativa.')
      return
    }
    if (!activeRunId) {
      setChartNotice('Selecciona una ejecucion antes de guardar la seleccion operativa.')
      return
    }
    const operationKey = `${activeVisualization?.id || 'vista'}:${activeBackendSegmentKey || 'segmento'}:${
      items.length
    }`
    setSavedOperationState({ status: 'saving', key: operationKey })
    try {
      await saveOperationalSelection(activeRunId, {
        title: `${items.length} tickets de ${activeBackendSegmentKey || activeVisualization?.title || 'la vista activa'}`,
        run_id: activeRunId,
        visualization_id: activeVisualization?.id || '',
        visualization_title: activeVisualization?.title || chartBackendData?.title || '',
        selected_segment: activeBackendSegmentKey || '',
        recommendation_id: activeRecommendationId || '',
        action_taken: true,
        ticket_count: items.length,
        ticket_ids: items.slice(0, 120).map((item, index) => backendEvidenceKey(item, index)),
        tickets: items.slice(0, 30).map(summarizeBackendEvidence),
        chart_validation: chartBackendData?.validation || {},
        recommended_action: chartBackendData?.validation?.recommended_action || '',
      })
      setSavedOperationState({ status: 'saved', key: operationKey })
      setChartNotice(`Seleccion operativa guardada con ${items.length} tickets. Ya puede enviarse al agente o al informe.`)
      trackDashboardEvent('operational_selection_saved', {
        ticket_count: items.length,
        selected_segment: activeBackendSegmentKey || '',
        visualization_id: activeVisualization?.id || '',
        recommendation_id: activeRecommendationId || '',
      })
    } catch (err) {
      setSavedOperationState({ status: 'error', key: operationKey })
      setChartNotice(err instanceof Error ? err.message : 'No se pudo guardar la seleccion operativa.')
    }
  }

  function askAgentAboutBackendTickets(intent = 'analizar tickets seleccionados') {
    const items = getBackendTicketsForAction()
    if (!items.length) {
      setChartNotice('Selecciona o filtra tickets antes de enviarlos al agente.')
      return
    }
    const ticketIds = items.slice(0, 120).map((item, index) => backendEvidenceKey(item, index))
    trackDashboardEvent('tickets_sent_to_agent', {
      ticket_count: items.length,
      selected_segment: activeBackendSegmentKey || '',
      visualization_id: activeVisualization?.id || '',
      recommendation_id: activeRecommendationId || '',
      intent,
    })
    openChatWithContext({
      label: `${items.length} tickets del segmento ${activeBackendSegmentKey}`,
      intent,
      visibleText:
        intent === 'preparar texto para informe'
          ? `Prepara una lectura para informe con ${items.length} tickets del segmento "${activeBackendSegmentKey}".`
          : `Analiza ${items.length} tickets del segmento "${activeBackendSegmentKey}" y dime causas probables, impacto y accion recomendada.`,
      context: {
        visualization: activeVisualization,
        chartData: chartBackendData,
        selectedSegment: activeBackendSegmentKey,
        drilldownEvidence: items,
        operation: {
          action: intent,
          saved: savedOperationState.status === 'saved',
          ticket_count: items.length,
          ticket_ids: ticketIds,
          recommended_action: chartBackendData?.validation?.recommended_action || '',
          quality_score: chartBackendData?.validation?.quality_score ?? null,
        },
      },
    })
  }

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      await Promise.all([
        refetchAggregateDashboard(),
        selectedRunId ? refetchSelectedDashboard() : Promise.resolve(),
        refetchRuns(),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  const trackDashboardEvent = useCallback(
    (eventType, payload = {}) => {
      if (!activeRunId) return
      trackConversationDashboardEvent(activeRunId, {
        event_type: eventType,
        dashboard_mode: audienceMode,
        run_scope: operationalReadiness.run_scope,
        evidence_materialized: operationalReadiness.evidence_materialized,
        evidence_records: operationalReadiness.evidence_records,
        evidence_runs: operationalReadiness.evidence_runs,
        llm_used: Boolean(spec.llm_used),
        contract_status: dashboardContract.status,
        active_visualization_id: activeVisualizationId || '',
        active_recommendation_id: activeRecommendationId || '',
        ...payload,
      }).catch(() => {})
    },
    [
      activeRecommendationId,
      activeRunId,
      activeVisualizationId,
      audienceMode,
      dashboardContract.status,
      operationalReadiness.evidence_materialized,
      operationalReadiness.evidence_records,
      operationalReadiness.evidence_runs,
      operationalReadiness.run_scope,
      spec.llm_used,
    ],
  )

  useEffect(() => {
    if (!detailOpen || !isExpertMode) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setSemanticDictionaryLoading(true)
      setSemanticDictionaryError('')
      fetchConversationSemanticDictionary({ runId: activeRunId })
        .then((payload) => {
          if (cancelled) return
          setSemanticDictionaryState(payload)
          setSemanticDraftRows(buildSemanticDraftRows(payload, semanticVariables))
          trackDashboardEvent('semantic_dictionary_opened', {
            configured_total: Number(payload?.configured_total || 0),
            governed: Boolean(payload?.governed),
            scope: payload?.scope || '',
            project_id: payload?.project_id || '',
            variable_count: semanticVariables.length,
          })
        })
        .catch((err) => {
          if (cancelled) return
          const message =
            err instanceof Error ? err.message : 'No se pudo cargar el diccionario semantico.'
          setSemanticDictionaryError(message)
          trackDashboardEvent('semantic_dictionary_error', { action: 'load', message })
        })
        .finally(() => {
          if (!cancelled) setSemanticDictionaryLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeRunId, detailOpen, isExpertMode, semanticVariables, trackDashboardEvent])

  const handleSemanticDraftChange = useCallback((name, field, value) => {
    setSemanticDraftRows((rows) =>
      rows.map((row) => (row.name === name ? { ...row, [field]: value } : row)),
    )
  }, [])

  async function handleSemanticDictionaryRefresh() {
    setSemanticDictionaryLoading(true)
    setSemanticDictionaryError('')
    try {
      const payload = await fetchConversationSemanticDictionary({ refresh: true, runId: activeRunId })
      setSemanticDictionaryState(payload)
      setSemanticDraftRows(buildSemanticDraftRows(payload, semanticVariables))
      trackDashboardEvent('semantic_dictionary_refreshed', {
        configured_total: Number(payload?.configured_total || 0),
        governed: Boolean(payload?.governed),
        scope: payload?.scope || '',
        project_id: payload?.project_id || '',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo actualizar el diccionario semantico.'
      setSemanticDictionaryError(message)
      trackDashboardEvent('semantic_dictionary_error', { action: 'refresh', message })
    } finally {
      setSemanticDictionaryLoading(false)
    }
  }

  async function handleSemanticDictionarySave() {
    setSemanticDictionarySaving(true)
    setSemanticDictionaryError('')
    const variables = normalizeSemanticDraftForSave(semanticDraftRows)
    try {
      const payload = await updateConversationSemanticDictionary(variables, { runId: activeRunId })
      const refreshed = await fetchConversationSemanticDictionary({ refresh: true, runId: activeRunId })
      setSemanticDictionaryState(refreshed)
      setSemanticDraftRows(buildSemanticDraftRows(refreshed, semanticVariables))
      trackDashboardEvent('semantic_dictionary_saved', {
        saved_total: Number(payload?.total || variables.length),
        variable_count: variables.length,
        scope: payload?.scope || '',
        project_id: payload?.project_id || '',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar el diccionario semantico.'
      setSemanticDictionaryError(message)
      trackDashboardEvent('semantic_dictionary_error', { action: 'save', message })
    } finally {
      setSemanticDictionarySaving(false)
    }
  }

  useEffect(() => {
    if (!activeRunId || !agentGuideItems.length) return
    const presentationKey = [
      activeRunId,
      audienceMode,
      agentGuideItems.map((item) => item.id).join(','),
    ].join('|')
    if (recommendationsPresentedKeyRef.current === presentationKey) return
    recommendationsPresentedKeyRef.current = presentationKey
    trackDashboardEvent('recommendations_presented', {
      recommendation_count: agentGuideItems.length,
      recommendation_ids: agentGuideItems.map((item) => item.id),
      graph_ready_count: agentGuideItems.filter((item) => item.graphReady).length,
      useful_feedback_count: agentGuideItems.filter((item) => item.feedbackValue === 'useful').length,
      not_useful_feedback_count: agentGuideItems.filter((item) => item.feedbackValue === 'not_useful').length,
      warning_count: agentGuideItems.filter((item) =>
        item.evaluationItems.some((evaluation) => evaluation.tone === 'warning'),
      ).length,
    })
  }, [activeRunId, agentGuideItems, audienceMode, trackDashboardEvent])

  const openChatWithContext = useCallback(
    ({ label, intent, visibleText, context = {} }) => {
      if (!activeRunId) {
        setError('Selecciona una ejecucion con datos antes de preguntar al agente.')
        return
      }
      const cleanVisibleText = visibleText || `Quiero analizar: ${label}.`
      const backendText = buildBackendPrompt({
        visibleText: cleanVisibleText,
        runId: activeRunId,
        context: {
          ...context,
          label,
          intent,
          datasetSummary: executive,
          projectId: activeRun?.project_id,
          parameters: {
            run_id: activeRunId,
            source_name: activeRun?.source_name,
            reduction_method: activeRun?.reduction_method,
          },
          selectedFindings: selectedInsights.length ? selectedInsights : findings,
          visualizationsSuggested: visualizations,
          semanticVariables,
        },
      })
      setChatExternalPrompt({
        text: cleanVisibleText,
        visibleText: cleanVisibleText,
        backendText,
        at: Date.now(),
      })
      setChatOpenSignal((current) => current + 1)
      trackConversationDashboardEvent(activeRunId, {
        event_type: 'chat_context_opened',
        dashboard_mode: audienceMode,
        active_visualization_id: activeVisualizationId || '',
        active_recommendation_id: activeRecommendationId || '',
        label,
        intent,
        context_keys: Object.keys(context || {}).slice(0, 20),
      }).catch(() => {})
    },
    [
      activeRun,
      activeRecommendationId,
      activeRunId,
      activeVisualizationId,
      audienceMode,
      executive,
      findings,
      selectedInsights,
      semanticVariables,
      visualizations,
    ],
  )

  async function handleRecommendationFeedback(recommendation, helpful, evaluationItems = [], visualization = null, reason = '') {
    if (!activeRunId || !recommendation?.id) return
    const key = recommendation.id
    const feedbackValue = helpful ? 'useful' : 'not_useful'
    const reasonCode = reason || (helpful ? 'useful' : 'irrelevant')
    const reasonLabel = FEEDBACK_REASON_LABELS[reasonCode] || reasonCode
    const evaluationLabels = evaluationItems.map((item) => item.label)
    const hasWarning = evaluationItems.some((item) => item.tone === 'warning')
    const isGraphValidated = evaluationLabels.some((label) =>
      ['Graficable', 'Grafico construible', 'Backend valida datos reales', 'Se valida con datos'].some(
        (candidate) => label.includes(candidate),
      ),
    )
    const variablesUsed = [
      visualization?.x,
      visualization?.y,
      visualization?.metric,
      visualization?.group_by,
    ]
      .filter(Boolean)
      .map((value) => String(value))
    const finalState = reasonCode === 'action_taken' ? 'action_taken' : helpful ? 'accepted' : 'needs_revision'
    const basePayload = {
      helpful,
      reason: reasonCode,
      reason_label: reasonLabel,
      final_state: finalState,
      action_taken: reasonCode === 'action_taken',
      target_type: 'agent_recommendation',
      target_id: recommendation.id,
      target_title: recommendation.title,
      recommendation_id: recommendation.id,
      recommendation_title: recommendation.title,
      evaluation: evaluationLabels,
      has_warning: hasWarning,
      chart_validated: isGraphValidated,
      chart_generated: Boolean(visualization?.id && isGraphValidated),
      drilldown_used: Boolean(activeBackendSegmentKey),
      tickets_analyzed: selectedBackendEvidenceItems.length || visibleBackendEvidenceItems.length || 0,
      exported: false,
      report_prepared: false,
      variables_used: variablesUsed,
      evidence_materialized: operationalReadiness.evidence_materialized,
      evidence_records: operationalReadiness.evidence_records,
      llm_used: Boolean(spec.llm_used),
      visualization_id: visualization?.id || '',
      visualization_title: visualization?.title || '',
      dashboard_mode: audienceMode,
      project_id: activeRun?.project_id || '',
      feedback_source: 'dashboard_ui',
      persisted_locally: true,
    }
    setFeedbackState((prev) => {
      const next = { ...prev, [key]: feedbackValue }
      writeStoredFeedback(activeRunId, next)
      return next
    })
    setFeedbackReasonState((prev) => ({ ...prev, [key]: reasonCode }))
    trackDashboardEvent('recommendation_feedback', basePayload)
    try {
      await sendConversationFeedback(activeRunId, basePayload)
      setChartNotice(
        helpful
          ? `Feedback registrado: "${recommendation.title}" fue util (${reasonLabel}).`
          : `Feedback registrado: revisaremos "${recommendation.title}" (${reasonLabel}).`,
      )
    } catch (err) {
      setFeedbackState((prev) => {
        const next = { ...prev }
        delete next[key]
        writeStoredFeedback(activeRunId, next)
        return next
      })
      setFeedbackReasonState((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setError(err instanceof Error ? err.message : 'No se pudo guardar el feedback.')
    }
  }

  function scrollToActiveChart() {
    window.setTimeout(() => {
      activeChartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  function handleApplyRecommendation(recommendation) {
    setActiveRecommendationId(recommendation?.id || '')
    const recommendationText = recommendationSearchText(recommendation)
    const nextVisualization = findVisualizationForRecommendation(recommendation, visualizations, chartDataState)
    const nextRenderer = selectChartRenderer(nextVisualization, chartDataState, recommendationText)
    setActiveInsightKey('')
    setActivePriorityLevel('')
    setActiveChartConclusionId('')
    setActiveBackendSegmentKey('')
    setChartEvidenceOpen(false)
    if (nextVisualization?.id) {
      setActiveVisualizationId(nextVisualization.id)
      setActiveChartRendererId(nextRenderer?.id || '')
      setChartRefreshKey((current) => current + 1)
      setChartNotice(
        `Recomendacion aplicada: ${recommendation.title}. La vista sugerida queda preparada como grafico activo.`,
      )
      trackDashboardEvent('recommendation_applied', {
        recommendation_id: recommendation?.id || '',
        recommendation_title: recommendation?.title || '',
        visualization_id: nextVisualization.id,
        chart_renderer: nextRenderer?.id || '',
      })
      return
    }
    setChartNotice(
      `Recomendacion aplicada: ${recommendation.title}. El agente no envio una visualizacion construible para esta accion.`,
    )
    trackDashboardEvent('recommendation_applied_without_chart', {
      recommendation_id: recommendation?.id || '',
      recommendation_title: recommendation?.title || '',
    })
  }

  function handleGraphRecommendation(recommendation) {
    setActiveRecommendationId(recommendation?.id || '')
    setChartRefreshKey((current) => current + 1)
    setChartEvidenceOpen(false)
    const recommendationText = recommendationSearchText(recommendation)
    const nextVisualization = findVisualizationForRecommendation(recommendation, visualizations, chartDataState)
    const nextRenderer = selectChartRenderer(nextVisualization, chartDataState, recommendationText)
    if (!nextVisualization?.id) {
      setChartNotice(
        `No hay una visualizacion construible para "${recommendation.title}". Pide al agente una vista con eje X, metrica y tipo de grafico.`,
      )
      trackDashboardEvent('recommendation_graph_unavailable', {
        recommendation_id: recommendation?.id || '',
        recommendation_title: recommendation?.title || '',
        reason: 'missing_visualization',
      })
      scrollToActiveChart()
      return
    }
    const graphReadiness = visualizationGraphReadiness(nextVisualization, nextRenderer, semanticMap, isExpertMode)
    if (!graphReadiness.ready) {
      setChartNotice(
        `No se abre grafico para "${recommendation.title}". ${graphReadiness.reason} Usa "Preguntar al agente" para pedir una vista corregida.`,
      )
      trackDashboardEvent('recommendation_graph_blocked', {
        recommendation_id: recommendation?.id || '',
        recommendation_title: recommendation?.title || '',
        visualization_id: nextVisualization.id,
        reason: graphReadiness.reason,
      })
      scrollToActiveChart()
      return
    }
    setActiveVisualizationId(nextVisualization.id)
    setActiveChartRendererId(nextRenderer?.id || '')
    setActiveInsightKey('')
    setActivePriorityLevel('')
    setActiveChartConclusionId('')
    setActiveBackendSegmentKey('')
    setChartEvidenceOpen(false)
    setChartNotice(
      `Grafico activo: ${nextRenderer?.label || nextVisualization.title}. Se genero desde la recomendacion "${recommendation.title}".`,
    )
    trackDashboardEvent('recommendation_graph_opened', {
      recommendation_id: recommendation?.id || '',
      recommendation_title: recommendation?.title || '',
      visualization_id: nextVisualization.id,
      visualization_title: nextVisualization.title,
      chart_renderer: nextRenderer?.id || '',
    })
    scrollToActiveChart()
  }

  function handleGuideApply(item) {
    handleApplyRecommendation(item.recommendation)
  }

  function handleGuideGraph(item) {
    handleGraphRecommendation(item.recommendation)
  }

  function handleGuideChat(item) {
    openChatWithContext({
      label: item.recommendation.title,
      intent: 'profundizar recomendacion del agente visual',
      visibleText: `Quiero analizar la recomendacion: ${item.recommendation.title}.`,
      context: {
        recommendation: item.recommendation,
        visualization: item.visualization,
        validation: {
          graph_ready: item.graphReadiness?.ready || false,
          reason: item.graphReadiness?.reason || '',
          evaluation: item.evaluationItems,
        },
      },
    })
  }

  function handleGuideAdd(item) {
    openChatWithContext({
      label: item.recommendation.title,
      intent: 'agregar recomendacion al analisis',
      visibleText: `Agrega esta recomendacion al analisis: ${item.recommendation.title}.`,
      context: {
        recommendation: item.recommendation,
        visualization: item.visualization,
        validation: item.evaluationItems,
      },
    })
  }

  function handleGuideFeedback(item, helpful, reason = '') {
    handleRecommendationFeedback(item.recommendation, helpful, item.evaluationItems, item.visualization, reason)
  }

  function handleSelectVisualization(visualization) {
    if (!visualization?.id) return
    const chartRenderer = selectChartRenderer(visualization, chartDataState)
    if (!chartRenderer) {
      setChartNotice(
        `La visualizacion "${visualization.title}" no tiene datos suficientes para construirse con las graficas disponibles.`,
      )
      scrollToActiveChart()
      return
    }
    setActiveVisualizationId(visualization.id)
    setActiveChartRendererId(chartRenderer.id)
    setChartRefreshKey((current) => current + 1)
    setActiveInsightKey('')
    setActivePriorityLevel('')
    setActiveChartConclusionId('')
    setActiveBackendSegmentKey('')
    setChartEvidenceOpen(false)
    setChartNotice(`Grafico activo: ${chartRenderer.label}.`)
    trackDashboardEvent('visualization_selected', {
      visualization_id: visualization.id,
      visualization_title: visualization.title,
      chart_renderer: chartRenderer.id,
    })
    scrollToActiveChart()
  }

  function clearPriorityDrilldown() {
    setActiveInsightKey('')
    setActivePriorityLevel('')
    setActiveChartConclusionId('')
    setActiveBackendSegmentKey('')
    setChartNotice('Vista original restaurada.')
    setChartEvidenceOpen(false)
    scrollToActiveChart()
  }

  function clearConclusionChartFocus() {
    setActiveChartConclusionId('')
    setActiveInsightKey('')
    setActiveBackendSegmentKey('')
    setChartNotice('Grafico original restaurado con todas las evidencias.')
    setChartEvidenceOpen(false)
    scrollToActiveChart()
  }

  function handleSelectPriorityLevel(level) {
    if (!level) return
    const label = PRIORITY_LABELS[level] || level
    setActiveInsightKey('')
    setActivePriorityLevel(level)
    setActiveBackendSegmentKey('')
    setChartEvidenceOpen(true)
    setChartNotice(
      `Mostrando evidencias de prioridad ${label.toLowerCase()}. Usa "Volver a grafica original" para quitar el drill-down.`,
    )
  }

  function handleShowConclusionChart(conclusion, conclusionId = '') {
    const {
      visualization: nextVisualization,
      chartRenderer: nextRenderer,
      readiness,
    } = conclusionGraphCandidate(
      conclusion,
      visualizations,
      chartDataState,
      semanticMap,
      isExpertMode,
    )

    setActiveConclusionId(conclusionId || conclusion?.id || '')
    setActiveChartConclusionId(conclusionId || conclusion?.id || '')
    setActiveInsightKey('')
    setActivePriorityLevel('')
    setActiveBackendSegmentKey('')
    setChartEvidenceOpen(false)

    if (!readiness.ready) {
      setChartNotice(
        `No se abre grafico para esta conclusion. ${readiness.reason} Usa "Analizar con agente" para pedir una vista graficable o revisar la evidencia relacionada.`,
      )
      scrollToActiveChart()
      return
    }

    setActiveVisualizationId(nextVisualization.id)
    setActiveChartRendererId(nextRenderer.id)
    setChartRefreshKey((current) => current + 1)
    setChartEvidenceOpen(true)
    setChartNotice(
      `Grafico relacionado con la conclusion: ${nextRenderer.label} - ${nextVisualization.title}. Evidencias enfocadas segun el texto y la metrica de la conclusion.`,
    )
    scrollToActiveChart()
  }

  function scrollToConclusionDetail() {
    window.requestAnimationFrame(() => {
      conclusionDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function handleShowConclusionDetail(item) {
    if (!item?.id) return
    setActiveConclusionId(item.id)
    scrollToConclusionDetail()
  }

  function handleSelectBackendSegment(point) {
    if (!point?.key) return
    setActiveBackendSegmentKey(point.key)
    setActiveInsightKey('')
    setActivePriorityLevel('')
    setChartEvidenceOpen(true)
    setChartNotice(
      isExpertMode
        ? `Drill-down real: mostrando evidencias que explican "${point.label || point.key}".`
        : `Mostrando tickets y evidencias que explican "${point.label || point.key}".`,
    )
    trackDashboardEvent('drilldown_opened', {
      segment_key: point.key,
      segment_label: point.label || point.key,
      visualization_id: activeVisualization?.id || '',
      visualization_title: activeVisualization?.title || '',
      recommendation_id: activeRecommendationId || '',
      ticket_count: Number(point.count || point.value || 0),
    })
  }

  function renderBackendSeriesChart({ chartType, maxValue, metricLabel }) {
    const series = asList(chartBackendData?.series)
    if (!series.length) return null
    const axisTicks = [0, 25, 50, 75, 100]

    if (chartType === 'priority_matrix') {
      const maxCount = Math.max(...series.map((point) => Number(point.count) || 0), 1)
      return (
        <div className="dashboard-spec-backend-priority-matrix">
          <span className="dashboard-spec-backend-matrix-label dashboard-spec-backend-matrix-label--low">
            Menor prioridad
          </span>
          <span className="dashboard-spec-backend-matrix-label dashboard-spec-backend-matrix-label--high">
            Mayor prioridad
          </span>
          <span className="dashboard-spec-backend-matrix-axis dashboard-spec-backend-matrix-axis--x">
            {metricLabel}
          </span>
          <span className="dashboard-spec-backend-matrix-axis dashboard-spec-backend-matrix-axis--y">
            Tickets
          </span>
          {series.map((point, index) => {
            const value = Number(point.value) || 0
            const count = Number(point.count) || 0
            const x = 12 + Math.min(76, Math.max(4, (value / maxValue) * 76))
            const y = 82 - Math.min(68, Math.max(10, (count / maxCount) * 68))
            const size = Math.max(42, Math.min(72, 34 + (count / maxCount) * 34))
            const isActive = activeBackendSegmentKey === point.key
            return (
              <button
                type="button"
                key={point.key}
                className={`dashboard-spec-backend-matrix-point${
                  isActive ? ' dashboard-spec-backend-matrix-point--active' : ''
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                }}
                onClick={() => handleSelectBackendSegment(point)}
                title={`${point.label || point.key}: ${formatBackendNumber(value)} (${formatBackendNumber(count)} tickets)`}
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            )
          })}
        </div>
      )
    }

    if (chartType === 'heatmap') {
      return (
        <div className="dashboard-spec-backend-heatmap">
          {series.map((point) => {
            const value = Number(point.value) || 0
            const intensity = Math.max(0.14, Math.min(0.92, value / maxValue))
            const isActive = activeBackendSegmentKey === point.key
            return (
              <button
                type="button"
                key={point.key}
                className={`dashboard-spec-backend-heatmap-cell${
                  isActive ? ' dashboard-spec-backend-heatmap-cell--active' : ''
                }`}
                style={{ '--cell-alpha': intensity }}
                onClick={() => handleSelectBackendSegment(point)}
              >
                <strong>{point.label || point.key}</strong>
                <span>{formatBackendNumber(value)}</span>
                <small>{formatBackendNumber(point.count)} tickets</small>
              </button>
            )
          })}
        </div>
      )
    }

    if (chartType === 'distribution') {
      return (
        <div className="dashboard-spec-backend-distribution">
          {series.map((point) => {
            const value = Number(point.value) || 0
            const height = Math.max(10, Math.round((value / maxValue) * 100))
            const isActive = activeBackendSegmentKey === point.key
            return (
              <button
                type="button"
                key={point.key}
                className={`dashboard-spec-backend-distribution-bar${
                  isActive ? ' dashboard-spec-backend-distribution-bar--active' : ''
                }`}
                onClick={() => handleSelectBackendSegment(point)}
              >
                <span className="dashboard-spec-backend-distribution-bar__track">
                  <span style={{ height: `${height}%` }} />
                </span>
                <strong>{formatBackendNumber(value)}</strong>
                <small>{point.label || point.key}</small>
              </button>
            )
          })}
        </div>
      )
    }

    if (chartType === 'line') {
      const points = series.map((point, index) => {
        const value = Number(point.value) || 0
        const x = series.length > 1 ? (index / (series.length - 1)) * 100 : 50
        const y = 100 - Math.max(4, Math.min(96, (value / maxValue) * 92))
        return { point, x, y, value }
      })
      return (
        <div className="dashboard-spec-backend-line-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={points.map((item) => `${item.x},${item.y}`).join(' ')}
              fill="none"
              stroke="url(#dashboardLineGradient)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <defs>
              <linearGradient id="dashboardLineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#1557e8" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
          {points.map(({ point, x, y, value }) => {
            const isActive = activeBackendSegmentKey === point.key
            return (
              <button
                type="button"
                key={point.key}
                className={`dashboard-spec-backend-line-point${
                  isActive ? ' dashboard-spec-backend-line-point--active' : ''
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => handleSelectBackendSegment(point)}
                title={`${point.label || point.key}: ${formatBackendNumber(value)}`}
              >
                <span>{formatBackendNumber(value)}</span>
              </button>
            )
          })}
          <div className="dashboard-spec-backend-line-labels">
            {points.map(({ point }) => (
              <span key={point.key}>{point.label || point.key}</span>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div
        className={`dashboard-spec-backend-hbar-chart${
          chartType === 'ranking' ? ' dashboard-spec-backend-hbar-chart--ranking' : ''
        }`}
      >
        <div className="dashboard-spec-backend-hbar-scale" aria-hidden="true">
          {axisTicks.map((tick) => (
            <span key={tick} style={{ left: `${tick}%` }}>
              {tick === 100 ? formatBackendNumber(maxValue) : ''}
            </span>
          ))}
        </div>
        <div className="dashboard-spec-backend-hbar-grid" aria-hidden="true">
          {axisTicks.map((tick) => (
            <span key={tick} style={{ left: `${tick}%` }} />
          ))}
        </div>
        {series.map((point) => {
          const value = Number(point.value) || 0
          const width = Math.max(4, Math.round((value / maxValue) * 100))
          const isActive = activeBackendSegmentKey === point.key
          return (
            <button
              type="button"
              key={point.key}
              className={`dashboard-spec-backend-hbar${
                isActive ? ' dashboard-spec-backend-hbar--active' : ''
              }`}
              onClick={() => handleSelectBackendSegment(point)}
            >
              <span className="dashboard-spec-backend-hbar__label">
                <strong>{point.label || point.key}</strong>
                <small>
                  {formatBackendNumber(point.count)} {isExpertMode ? 'evidencias' : 'casos'} - clic
                  para ver tickets
                </small>
              </span>
              <span className="dashboard-spec-backend-hbar__plot">
                <span
                  className="dashboard-spec-backend-hbar__fill"
                  style={{ width: `${width}%` }}
                >
                  <em>{formatBackendNumber(value)}</em>
                </span>
              </span>
            </button>
          )
        })}
        <div className="dashboard-spec-backend-hbar-axis">
          <span>{metricLabel}</span>
          <span>
            {isExpertMode
              ? 'Haz clic en una barra para abrir el drill-down de tickets.'
              : 'Haz clic en una barra para ver los tickets relacionados.'}
          </span>
        </div>
      </div>
    )
  }

  function renderBackendChart() {
    if (chartBackendLoading) {
      return (
        <div className="dashboard-spec-empty-chart">
          <strong>Calculando datos reales del grafico...</strong>
          <span>
            {isExpertMode
              ? 'Consultando evidencias materializadas en DuckDB para esta visualizacion.'
              : 'Buscando evidencias y tickets relacionados para esta vista.'}
          </span>
        </div>
      )
    }
    if (chartBackendRunMismatch) {
      return (
        <div className="dashboard-spec-empty-chart">
          <strong>La respuesta del grafico no pertenece a la ejecucion activa</strong>
          <span>
            {isExpertMode
              ? 'Se bloqueo para evitar mezclar dataset, evidencias o tickets entre ejecuciones.'
              : 'Actualiza la vista antes de revisar evidencias o tomar decisiones.'}
          </span>
        </div>
      )
    }
    if (chartBackendError) {
      const readableError =
        !isExpertMode && /internal server error/i.test(chartBackendError)
          ? 'No se pudo preparar esta vista con los datos disponibles. Revisa otra recomendacion o abre el detalle tecnico.'
          : chartBackendError
      return (
        <div className="dashboard-spec-empty-chart">
          <strong>No se pudo calcular el grafico real</strong>
          <span>{textForProfile(readableError, isExpertMode)}</span>
        </div>
      )
    }
    const series = asList(chartBackendData?.series)
    const validation = chartBackendData?.validation ?? {}
    const warnings = asList(validation.warnings)
    const chartIsBuildable = validation.chart_is_buildable !== false && series.length > 0
    const validationMessages = chartValidationMessages({
      validation,
      warnings,
      visualization: activeVisualization,
      backendData: chartBackendData,
      semanticMap,
      chartIsBuildable,
    })

    if (!series.length) {
      return (
        <div className="dashboard-spec-backend-chart dashboard-spec-backend-chart--fallback-only">
          <div className="dashboard-spec-backend-chart__head">
            <div>
              <span className="dashboard-spec-eyebrow">Grafico no construible</span>
              <h3>{chartBackendData?.title || activeVisualization?.title || 'Visualizacion sugerida'}</h3>
              <p>
                {isExpertMode
                  ? 'El agente sugirio una vista, pero el backend no encontro una agregacion real para dibujarla.'
                  : 'El agente sugirio una vista, pero faltan datos suficientes para dibujarla con seguridad.'}
              </p>
            </div>
            <div className="dashboard-spec-backend-chart__badges">
              <span className="is-warning">No graficable</span>
              <span className="is-warning">Requiere datos</span>
            </div>
          </div>
          <div className="dashboard-spec-chart-build-state dashboard-spec-chart-build-state--warning">
            <strong>Por que no se muestra grafico</strong>
            <ul>
              {(validationMessages.length
                ? validationMessages
                : ['No se pudo graficar porque falta una variable valida para agrupar los datos.']
              ).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
          {activeChartEvidenceItems.length ? (
            <div className="dashboard-spec-chart-actions dashboard-spec-chart-actions--fallback">
              <button
                type="button"
                className="dashboard-spec-outline-button"
                onClick={() => setChartEvidenceOpen(true)}
              >
                Ver tabla de evidencia ({activeChartEvidenceItems.length})
              </button>
            </div>
          ) : null}
        </div>
      )
    }

    const maxValue = Math.max(...series.map((point) => Number(point.value) || 0), 1)
    const chartType = normalizeChartType(activeVisualization?.chart_type || chartBackendData.chart_type || 'bar')
    const supportedChartType = ['bar', 'ranking', 'line', 'distribution', 'priority_matrix', 'heatmap'].includes(chartType)
      ? chartType
      : 'bar'
    const xLabel = semanticLabel(semanticMap, chartBackendData.x)
    const metricLabel =
      chartBackendData.metric === 'count'
        ? 'Cantidad de evidencias'
        : semanticLabel(semanticMap, chartBackendData.metric)
    const qualityScore = Number(validation.quality_score ?? 0)
    const operationReady = Boolean(validation.operation_ready)
    const operationSummary =
      validation.validation_summary ||
      (operationReady
        ? 'Lista para operar con datos reales y evidencias revisables.'
        : 'Requiere revisar datos, variables o evidencia antes de usarla para decidir.')
    const operationAction =
      validation.recommended_action ||
      'Haz drill-down sobre una barra y envia los tickets seleccionados al agente.'
    const visibleOperationAction = isExpertMode
      ? operationAction
      : operationReady
        ? 'Haz clic en una barra para ver tickets, seleccionar evidencias y pedir una accion al agente.'
        : 'Revisa si esta vista tiene datos suficientes antes de usarla para tomar decisiones.'
    const llmSourceText = spec?.llm_used
      ? isExpertMode
        ? spec.llm_detail || 'El LLM propuso la lectura analitica.'
        : 'El agente propuso la lectura. El sistema valida si se puede operar con datos reales.'
      : isExpertMode
        ? 'La lectura fue generada por reglas locales porque el LLM no estaba disponible.'
        : 'El sistema preparo esta lectura como respaldo automatico.'
    const chartQuestion =
      activeVisualization?.question_answered ||
      'Que segmento concentra mas evidencias y conviene revisar primero?'
    const evidenceSummary = validation.evidence_returned
      ? `${formatBackendNumber(validation.evidence_returned)} evidencias recuperadas para el segmento activo.`
      : 'Sin evidencias recuperadas para el segmento activo.'
    const whyItMatters =
      activeVisualization?.reason ||
      activeVisualization?.evidence_used ||
      operationSummary ||
      'Ayuda a priorizar donde conviene revisar primero.'
    const evidenceUsed =
      activeVisualization?.evidence_used ||
      evidenceSummary ||
      'Evidencias guardadas y agregaciones calculadas por el backend.'

    return (
      <div className="dashboard-spec-backend-chart">
        <div className="dashboard-spec-backend-chart__head">
          <div>
            <span className="dashboard-spec-eyebrow">
              {isExpertMode ? 'Datos reales calculados' : 'Vista operativa'}
            </span>
            <h3>{chartBackendData.title || activeVisualization?.title}</h3>
            <p>
              {isExpertMode
                ? `DuckDB agrego ${formatBackendNumber(chartBackendData.total_records)} registros por ${xLabel || chartBackendData.x}.`
                : `Agrupa las evidencias guardadas para mostrar donde se concentra el problema.`}
            </p>
          </div>
          <div className="dashboard-spec-backend-chart__badges">
            <span className={spec?.llm_used ? 'is-ok' : 'is-warning'}>
              {spec?.llm_used ? 'Sugerido por agente' : 'Reglas locales'}
            </span>
            <span className={operationReady ? 'is-ok' : 'is-warning'}>
              {operationReady ? 'Validado' : 'Requiere revision'}
            </span>
            {isExpertMode ? (
              <span className={qualityScore >= 70 ? 'is-ok' : 'is-warning'}>
                Calidad {qualityScore}/100
              </span>
            ) : null}
            <span className={validation.uses_real_data ? 'is-ok' : 'is-warning'}>
              {isExpertMode
                ? validation.uses_real_data
                  ? 'Usa datos reales'
                  : 'Sin datos reales'
                : validation.uses_real_data
                  ? 'Tickets disponibles'
                  : 'Sin tickets'}
            </span>
            <span className={validation.chart_is_buildable ? 'is-ok' : 'is-warning'}>
              {validation.chart_is_buildable ? 'Grafico construible' : 'No graficable'}
            </span>
            {isExpertMode || validation.requires_data ? (
              <span className={validation.requires_data ? 'is-warning' : 'is-ok'}>
                {validation.requires_data ? 'Requiere datos' : 'Datos suficientes'}
              </span>
            ) : null}
            {isExpertMode || validation.uses_technical_variable ? (
              <span className={validation.uses_technical_variable ? 'is-warning' : 'is-ok'}>
                {validation.uses_technical_variable ? 'Variable tecnica' : 'Variable interpretable'}
              </span>
            ) : null}
            {isExpertMode || validation.possibly_invented ? (
              <span className={validation.possibly_invented ? 'is-warning' : 'is-ok'}>
                {validation.possibly_invented ? 'Posible variable inventada' : 'Sin invencion detectada'}
              </span>
            ) : null}
          </div>
        </div>
        {warnings.length && isExpertMode ? (
          <div className="dashboard-spec-backend-chart__warnings">
            {warnings.slice(0, isExpertMode ? 3 : 1).map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        ) : null}
        {validationMessages.length ? (
          <div className="dashboard-spec-chart-build-state">
            <strong>Validacion de la vista</strong>
            <ul>
              {validationMessages.slice(0, isExpertMode ? 4 : 2).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="dashboard-spec-chart-trace">
          <div>
            <strong>Pregunta que responde</strong>
            <span>{textForProfile(chartQuestion, isExpertMode)}</span>
          </div>
          <div>
            <strong>Por que importa</strong>
            <span>{textForProfile(whyItMatters, isExpertMode)}</span>
          </div>
          <div>
            <strong>Evidencia usada</strong>
            <span>
              {textForProfile(evidenceUsed, isExpertMode)}{' '}
              {isExpertMode
                ? `${formatBackendNumber(chartBackendData.total_records)} registros agregados por el backend.`
                : `Usa ${formatBackendNumber(chartBackendData.total_records)} evidencias guardadas.`}
            </span>
          </div>
          <div>
            <strong>Accion sugerida</strong>
            <span>{textForProfile(visibleOperationAction, isExpertMode)}</span>
          </div>
          <div>
            <strong>{isExpertMode ? 'Origen y validacion' : 'Validacion'}</strong>
            <span>{textForProfile(llmSourceText, isExpertMode)}</span>
          </div>
        </div>
        <div
          className={`dashboard-spec-operation-callout${
            operationReady ? ' dashboard-spec-operation-callout--ready' : ''
          }`}
        >
          <strong>{operationReady ? 'Uso operativo recomendado' : 'Antes de operar'}</strong>
          <span>{operationSummary}</span>
          <em>{visibleOperationAction}</em>
        </div>
        <div className="dashboard-spec-backend-chart__axis">
          <span>{xLabel || 'Dimension'}</span>
          <span>{metricLabel}</span>
        </div>
        {renderBackendSeriesChart({
          chartType: supportedChartType,
          maxValue,
          metricLabel,
        })}
      </div>
    )
  }

  function renderActiveChart() {
    if (!activeVisualization) {
      return (
        <div className="dashboard-spec-empty-chart">
          <strong>No hay visualizacion sugerida</strong>
          <span>El endpoint no devolvio una vista activa para renderizar.</span>
        </div>
      )
    }
    const backendChart = renderBackendChart()
    if (backendChart) return backendChart
    if (!chartInsights.length) {
      return (
        <div className="dashboard-spec-empty-chart">
          <strong>No hay datos suficientes para graficar</strong>
          <span>Guarda evidencias o selecciona una ejecucion con evidencias disponibles.</span>
        </div>
      )
    }
    const chartProps = {
      insights: chartInsights,
      activeKey: activeChartKey,
      onSelect: setActiveInsightKey,
      activePriority: activePriorityLevel,
      onSelectPriority: handleSelectPriorityLevel,
      chartRevision: `${activeChartRenderer?.id || 'chart'}-${activeVisualization?.id || 'view'}-${
        activePriorityLevel || 'all'
      }-${activeInsightKey || 'none'}-${activeRecommendationId || 'no-rec'}-${
        activeChartConclusionId || 'no-conclusion'
      }-${chartRefreshKey}`,
    }
    if (!activeChartRenderer) {
      return (
        <div className="dashboard-spec-empty-chart">
          <strong>No hay una grafica compatible</strong>
          <span>
            El agente sugirio una vista, pero faltan datos compatibles con las graficas disponibles.
          </span>
        </div>
      )
    }
    return (
      <div key={chartProps.chartRevision} className="dashboard-spec-chart-render">
        {activeChartRenderer.render(chartProps)}
      </div>
    )
  }

  return (
    <div
      className={`conversation-dashboard-page dashboard-spec-page${
        isPageLoading ? ' conversation-dashboard-page--loading' : ''
      }`}
    >
      {!embedded ? (
        <PageNavbar
          breadcrumbParent="Plataforma"
          breadcrumbCurrent="Dashboard conversacional"
          title="Dashboard conversacional"
          rightSlot={
            <ConversationDashboardToolbar
              runId={selectedRunId || activeInsight?.run_id}
              isLoading={isPageLoading}
              onRefresh={() => void handleRefresh()}
            />
          }
        />
      ) : (
        <ConversationDashboardToolbar
          embedded
          toolbarHost={toolbarHost}
          runId={selectedRunId || activeInsight?.run_id}
          isLoading={isPageLoading}
          onRefresh={() => void handleRefresh()}
        />
      )}

      {displayError ? <Feedback variant="danger" message={displayError} /> : null}

      {!embedded ? (
        <>
          <AnalysisFlowStrip currentStepId="consolidate" compact />
          {!isPageLoading && allInsights.length > 0 ? (
            <MetabaseFlowCTA
              variant="consolidate"
              runId={selectedRunId || activeInsight?.run_id}
            />
          ) : null}
        </>
      ) : null}

      {isPageLoading ? (
        <Card className="conv-dashboard-loading-card">
          <LoadingSlot variant="card">
            <ConversationDashboardProgress title={loadingTitle} progress={dashboardProgress} />
          </LoadingSlot>
        </Card>
      ) : !hasDashboardData ? (
        <Card className="decision-empty">
          {isExpertMode
            ? 'Todavia no hay contexto suficiente para construir el dashboard conversacional. Ejecuta el pipeline, guarda evidencias y vuelve a esta pantalla.'
            : 'Todavia no hay contexto suficiente para construir el dashboard conversacional. Ejecuta el analisis, guarda hallazgos y vuelve a esta pantalla.'}
        </Card>
      ) : (
        <>
          <ConversationExecutiveSummary
            isExpertMode={isExpertMode}
            title={executiveSummaryView.title}
            description={executiveSummaryView.description}
            profileLabel={executiveSummaryView.profileLabel}
            evidenceCount={insights.length}
            detailOpen={detailOpen}
            contract={executiveSummaryView.contract}
            context={executiveSummaryView.context}
            readiness={executiveSummaryView.readiness}
            detail={executiveSummaryView.detail}
            semanticEditor={
              isExpertMode
                ? {
                    rows: semanticDraftRows,
                    status: semanticDictionaryState,
                    loading: semanticDictionaryLoading,
                    saving: semanticDictionarySaving,
                    error: semanticDictionaryError,
                    onChange: handleSemanticDraftChange,
                    onRefresh: handleSemanticDictionaryRefresh,
                    onSave: handleSemanticDictionarySave,
                  }
                : null
            }
            onOpenEvidenceBase={() => {
              setSavedInsightsOpen(true)
              trackDashboardEvent('evidence_base_opened', {
                evidence_count: insights.length,
              })
            }}
            onToggleDetail={() => {
              const nextDetailOpen = !detailOpen
              setDetailOpen(nextDetailOpen)
              trackDashboardEvent(nextDetailOpen ? 'evidence_detail_opened' : 'evidence_detail_closed', {
                evidence_steps: executiveSummaryView.detail.evidenceItems.length,
              })
            }}
            onQuestionClick={(question) =>
              openChatWithContext({
                label: question,
                intent: 'responder pregunta sugerida del dashboard',
                visibleText: question,
                context: { suggestedQuestion: question },
              })
            }
            onTechnicalVisualizationClick={handleSelectVisualization}
          />

          {isExpertMode ? (
            <section className="dashboard-spec-section">
              <div className="dashboard-spec-section-head">
                <div>
                  <span className="dashboard-spec-eyebrow">Prioridades detectadas por el agente</span>
                  <h2>Que interpretar primero</h2>
                </div>
              </div>
              <div className="dashboard-spec-card-grid">
                {findings.length ? (
                  findings.map((finding) => (
                    <Card key={finding.id} className="dashboard-spec-finding-card">
                      <div className="dashboard-spec-card-top">
                        <h3>{finding.title}</h3>
                        <span className={priorityClass(finding.priority)}>
                          {PRIORITY_LABELS[finding.priority] || 'Media'}
                        </span>
                      </div>
                      <p>{finding.evidence || finding.impact || 'Sin evidencia resumida.'}</p>
                      <dl>
                        <div>
                          <dt>Impacto</dt>
                          <dd>{finding.impact || 'Sin dato'}</dd>
                        </div>
                        <div>
                          <dt>Urgencia</dt>
                          <dd>{finding.urgency || 'Sin dato'}</dd>
                        </div>
                      </dl>
                      <div className="dashboard-spec-card-actions">
                        <button
                          type="button"
                          onClick={() =>
                            openChatWithContext({
                              label: finding.title,
                              intent: 'analizar hallazgo prioritario',
                              visibleText: finding.suggested_question || `Analiza el hallazgo: ${finding.title}.`,
                              context: {
                                finding,
                                evidence: finding.evidence,
                                suggestedQuestion: finding.suggested_question,
                              },
                            })
                          }
                        >
                          Analizar con agente
                        </button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="dashboard-spec-empty-card">No hay prioridades detectadas.</Card>
                )}
              </div>
            </section>
          ) : null}

          <div className="dashboard-spec-main-workbench">
            <ConversationAgentGuide
              items={agentGuideItems}
              hiddenCount={Math.max(0, recommendations.length - agentGuideItems.length)}
              isExpertMode={isExpertMode}
              onApply={handleGuideApply}
              onGraph={handleGuideGraph}
              onChat={handleGuideChat}
              onAdd={handleGuideAdd}
              onFeedback={handleGuideFeedback}
            />
            <section ref={activeChartRef} className="dashboard-spec-section dashboard-spec-active-chart">
            <div className="dashboard-spec-section-head dashboard-spec-section-head--split">
              <div>
                <span className="dashboard-spec-eyebrow">Grafico activo</span>
                <h2>{activeVisualization?.title || 'Visualizacion activa'}</h2>
                <p>{activeVisualization?.reason || spec.active_chart_default?.explanation}</p>
                {activeVisualization?.question_answered ? (
                  <small className="dashboard-spec-question-chip">
                    Responde: {activeVisualization.question_answered}
                  </small>
                ) : null}
                {activeChartConclusionItem ? (
                  <small className="dashboard-spec-chart-focus">
                    Foco: conclusion {String(activeChartConclusionItem.index + 1).padStart(2, '0')} ·{' '}
                    {chartInsights.length.toLocaleString('es-ES')} evidencias usadas
                  </small>
                ) : null}
              </div>
              {activeVisualization ? (
                <div className="dashboard-spec-chart-actions">
                  {activeChartEvidenceItems.length ? (
                    <button
                      type="button"
                      className="dashboard-spec-outline-button"
                      onClick={() => setChartEvidenceOpen((current) => !current)}
                    >
                      {chartEvidenceOpen
                        ? 'Ocultar evidencias'
                        : `Ver evidencias (${activeChartEvidenceItems.length})`}
                    </button>
                  ) : null}
                  {activeChartRenderer?.id === 'priority' && activePriorityLevel ? (
                    <button
                      type="button"
                      className="dashboard-spec-outline-button"
                      onClick={clearPriorityDrilldown}
                    >
                      Volver a grafica original
                    </button>
                  ) : null}
                  {activeChartConclusionItem ? (
                    <button
                      type="button"
                      className="dashboard-spec-outline-button"
                      onClick={clearConclusionChartFocus}
                    >
                      Quitar foco de conclusion
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="dashboard-spec-outline-button"
                    onClick={() =>
                      openChatWithContext({
                        label: activeVisualization.title,
                        intent: 'interpretar grafico activo',
                        visibleText: `Interpreta el grafico activo: ${activeVisualization.title}.`,
                        context: {
                          visualization: activeVisualization,
                          evidenceUsed: activeVisualization.evidence_used,
                          questionAnswered: activeVisualization.question_answered,
                          chartData: chartBackendData,
                          drilldownEvidence: backendEvidenceItems,
                        },
                      })
                    }
                  >
                    Analizar grafico
                  </button>
                </div>
              ) : null}
            </div>
            {chartNotice ? <Feedback variant="info" message={chartNotice} /> : null}
            <div className="dashboard-spec-chart-frame">{renderActiveChart()}</div>
            {activeVisualizationMeaning.length ? (
              <Card className="dashboard-spec-meaning-panel">
                <div className="dashboard-spec-meaning-panel__head">
                  <div>
                    <span className="dashboard-spec-eyebrow">Que significa esto</span>
                    <h3>Lectura del grafico activo</h3>
                  </div>
                  {activeVisualization?.drilldown ? <span>{activeVisualization.drilldown}</span> : null}
                </div>
                <div className="dashboard-spec-meaning-grid">
                  {activeVisualizationMeaning.map((item) => (
                    <div key={item.title}>
                      <strong>{textForProfile(item.title, isExpertMode)}</strong>
                      <p>{textForProfile(item.body, isExpertMode)}</p>
                    </div>
                  ))}
                </div>
                {isExpertMode && activeVisualization ? (
                  <div className="dashboard-spec-semantic-strip">
                    {[activeVisualization.x, activeVisualization.y, activeVisualization.metric, activeVisualization.group_by]
                      .filter(Boolean)
                      .map((name, index) => {
                        const item = semanticItem(semanticMap, name)
                        return (
                          <span key={`${name}-${index}-${item?.role || 'unknown'}`}>
                            {semanticLabel(semanticMap, name)}
                            <small>{item?.role || 'sin rol'}</small>
                          </span>
                        )
                      })}
                  </div>
                ) : null}
              </Card>
            ) : null}
            {chartEvidenceOpen && backendEvidenceItems.length ? (
              <ConversationTicketDrilldownPanel
                isExpertMode={isExpertMode}
                hasRealEvidence={Boolean(operationalReadiness.evidence_materialized)}
                evidenceModeLabel={evidenceModeLabel(operationalReadiness.evidence_mode, isExpertMode)}
                segmentLabel={activeBackendSegmentKey}
                visualizationTitle={activeVisualization?.title || ''}
                visibleCount={visibleBackendEvidenceItems.length}
                segmentCount={activeBackendSegmentCount}
                loadedCount={backendEvidenceItems.length}
                priorityOptions={backendEvidencePriorityOptions}
                serviceOptions={backendEvidenceServiceOptions}
                categoryOptions={backendEvidenceCategoryOptions}
                statusOptions={backendEvidenceStatusOptions}
                filters={{
                  search: ticketSearch,
                  priority: ticketPriorityFilter,
                  service: ticketServiceFilter,
                  category: ticketCategoryFilter,
                  status: ticketStatusFilter,
                }}
                selectedCount={selectedBackendEvidenceItems.length}
                allVisibleSelected={
                  visibleBackendEvidenceItems.length > 0 &&
                  visibleBackendEvidenceRows.every(({ item, index }) =>
                    selectedBackendTicketKeys.has(backendEvidenceKey(item, index)),
                  )
                }
                savedStatus={savedOperationState.status}
                rows={visibleBackendTicketRows}
                onFilterChange={handleTicketFilterChange}
                onToggleVisible={toggleSelectVisibleBackendTickets}
                onClearFilters={clearTicketFilters}
                onAnalyzeSelection={() => askAgentAboutBackendTickets('analizar tickets filtrados por barra del grafico')}
                onPrepareReport={() => askAgentAboutBackendTickets('preparar texto para informe')}
                onSaveSelection={saveBackendTicketsAsOperationalSelection}
                onExportCsv={exportBackendTicketsCsv}
                onClose={() => setChartEvidenceOpen(false)}
                onToggleRow={(row) => toggleBackendTicketSelection(row.item, row.index)}
                onAnalyzeRow={analyzeBackendTicketRow}
              />
            ) : null}
            {!backendEvidenceItems.length && activeChartRenderer?.id === 'priority' && activePriorityLevel ? (
              <Card className="dashboard-spec-priority-drilldown">
                <div className="dashboard-spec-priority-drilldown__head">
                  <div>
                    <span className="dashboard-spec-eyebrow">Detalle de evidencias</span>
                    <h3>Prioridad {PRIORITY_LABELS[activePriorityLevel] || activePriorityLevel}</h3>
                    <p>
                      {priorityDrilldownItems.length.toLocaleString('es-ES')} evidencias coinciden
                      con la barra seleccionada.
                    </p>
                  </div>
                  <button type="button" onClick={clearPriorityDrilldown}>
                    Volver a grafica original
                  </button>
                </div>
                {priorityDrilldownItems.length ? (
                  <div className="dashboard-spec-priority-evidence-list">
                    {priorityDrilldownItems.map((item) => {
                      const key = insightKey(item)
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`dashboard-spec-priority-evidence${
                            activeChartKey === key ? ' dashboard-spec-priority-evidence--active' : ''
                          }`}
                          onClick={() => setActiveInsightKey(key)}
                        >
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.description || item.metric_label || 'Evidencia guardada'}</small>
                          </span>
                          <em>
                            {formatMetric(item.metric_label, item.metric_value) ||
                              item.metric_label ||
                              'Sin metrica'}
                          </em>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="dashboard-spec-muted">
                    No hay evidencias para esta prioridad con el filtro actual.
                  </p>
                )}
              </Card>
            ) : null}
            {chartEvidenceOpen && !backendEvidenceItems.length && activeChartRenderer?.id !== 'priority' ? (
              <Card className="dashboard-spec-priority-drilldown dashboard-spec-related-evidence">
                <div className="dashboard-spec-priority-drilldown__head">
                  <div>
                    <span className="dashboard-spec-eyebrow">Evidencia complementaria</span>
                    <h3>Tabla de evidencias relacionadas</h3>
                    <p>
                      No reemplaza el grafico activo. Aparece como respaldo cuando no hay tickets
                      reales recuperados para el segmento seleccionado.{' '}
                      {relatedEvidenceItems.length.toLocaleString('es-ES')} evidencias conectadas
                      con la vista activa.
                    </p>
                  </div>
                  <button type="button" onClick={() => setChartEvidenceOpen(false)}>
                    Ocultar
                  </button>
                </div>
                {relatedEvidenceItems.length ? (
                  <div className="dashboard-spec-priority-evidence-list">
                    {relatedEvidenceItems.map((item) => {
                      const key = insightKey(item)
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`dashboard-spec-priority-evidence${
                            activeChartKey === key ? ' dashboard-spec-priority-evidence--active' : ''
                          }`}
                          onClick={() => setActiveInsightKey(key)}
                        >
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.description || item.metric_label || 'Evidencia guardada'}</small>
                          </span>
                          <em>
                            {formatMetric(item.metric_label, item.metric_value) ||
                              item.metric_label ||
                              'Sin metrica'}
                          </em>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="dashboard-spec-muted">No hay evidencias relacionadas con esta vista.</p>
                )}
              </Card>
            ) : null}
          </section>
          </div>

          <section className="dashboard-spec-section dashboard-spec-conclusions-section">
            <div className="dashboard-spec-section-head">
              <div>
                <span className="dashboard-spec-eyebrow">Conclusiones</span>
                <h2>{isExpertMode ? 'Lectura accionable y trazabilidad' : 'Lectura accionable'}</h2>
                <p>
                  Selecciona una conclusion para ver su evidencia, prioridad visual y accion
                  recomendada.
                </p>
              </div>
            </div>

            {conclusionMatrixItems.length ? (
              <div className="dashboard-spec-conclusion-workbench">
                <Card className="dashboard-spec-conclusion-matrix-card">
                  <div className="dashboard-spec-conclusion-matrix-head">
                    <div>
                      <h3>Matriz de decisiones</h3>
                      <p>
                        Ubica cada conclusion por confianza e impacto estimado con base en evidencia,
                        metricas y terminos detectados.
                      </p>
                    </div>
                    <span>Impacto / urgencia vs confianza</span>
                  </div>
                  <div className="dashboard-spec-conclusion-matrix">
                    <span className="dashboard-spec-conclusion-axis dashboard-spec-conclusion-axis--y">
                      Confianza
                    </span>
                    <div className="dashboard-spec-conclusion-matrix__plot">
                      <span className="dashboard-spec-conclusion-band dashboard-spec-conclusion-band--low">
                        menor impacto
                      </span>
                      <span className="dashboard-spec-conclusion-band dashboard-spec-conclusion-band--high">
                        mayor impacto
                      </span>
                      {conclusionMatrixItems.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`dashboard-spec-conclusion-bubble dashboard-spec-conclusion-bubble--${item.confidenceLevel}${
                            activeConclusionItem?.id === item.id
                              ? ' dashboard-spec-conclusion-bubble--active'
                              : ''
                          }`}
                          style={{
                            left: `${item.x}%`,
                            bottom: `${item.y}%`,
                            width: `${item.size}px`,
                            height: `${item.size}px`,
                          }}
                          title={item.source?.conclusion}
                          onClick={() => setActiveConclusionId(item.id)}
                        >
                          {String(item.index + 1).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                    <div className="dashboard-spec-conclusion-axis dashboard-spec-conclusion-axis--x">
                      <span>Bajo</span>
                      <strong>Impacto / urgencia estimada</strong>
                      <span>Alto</span>
                    </div>
                  </div>
                  <div className="dashboard-spec-conclusion-legend">
                    <span><i className="is-high" /> Confianza alta</span>
                    <span><i className="is-medium" /> Confianza media</span>
                    <span><i className="is-low" /> Confianza baja</span>
                  </div>
                </Card>

                {activeConclusionItem ? (
                  <div ref={conclusionDetailRef} className="dashboard-spec-conclusion-detail-shell">
                    <Card className="dashboard-spec-conclusion-detail-card">
                    <span className={priorityClass(activeConclusionItem.confidenceLevel)}>
                      Confianza {activeConclusionItem.confidenceLabel}
                    </span>
                    <h3>{activeConclusionItem.source?.conclusion}</h3>
                    <p>{activeConclusionItem.source?.evidence}</p>
                    <dl>
                      <div>
                        <dt>Accion recomendada</dt>
                        <dd>{activeConclusionItem.source?.recommended_action || 'Pedir detalle al agente'}</dd>
                      </div>
                      <div>
                        <dt>Grafico relacionado</dt>
                        <dd>{activeConclusionItem.source?.related_chart || 'Sin grafico explicito'}</dd>
                      </div>
                      <div>
                        <dt>Metrica asociada</dt>
                        <dd>
                          {semanticLabel(semanticMap, activeConclusionItem.source?.related_metric) ||
                            activeConclusionItem.source?.related_metric ||
                            'Sin metrica explicita'}
                        </dd>
                      </div>
                      <div>
                        <dt>Origen</dt>
                        <dd>{activeConclusionItem.source?.source || (spec.llm_used ? 'llm' : 'rules')}</dd>
                      </div>
                      <div>
                        <dt>Calidad de evidencia</dt>
                        <dd>{activeConclusionItem.source?.evidence_quality || spec.llm_detail || 'Sin detalle adicional'}</dd>
                      </div>
                    </dl>
                    {asList(activeConclusionItem.source?.related_items).length ? (
                      <div className="dashboard-spec-related-items">
                        <strong>Tickets, grupos o datos relacionados</strong>
                        <div className="dashboard-spec-chip-row">
                          {asList(activeConclusionItem.source?.related_items)
                            .slice(0, isExpertMode ? 10 : 6)
                            .map((item, index) => (
                              <span key={`${item}-${index}`}>
                                {relatedItemLabel(semanticMap, item)}
                              </span>
                            ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="dashboard-spec-conclusion-actions">
                      {activeConclusionGraphCandidate.readiness.ready ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleShowConclusionChart(activeConclusionItem.source, activeConclusionItem.id)
                          }
                        >
                          Ver grafico relacionado
                        </button>
                      ) : (
                        <small className="dashboard-spec-graph-unavailable">
                          Sin grafico directo: {activeConclusionGraphCandidate.readiness.reason || 'requiere una vista valida.'}
                        </small>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          openChatWithContext({
                            label: activeConclusionItem.source?.conclusion,
                            intent: 'profundizar conclusion del dashboard',
                            visibleText: `Desarrolla esta conclusion: ${activeConclusionItem.source?.conclusion}.`,
                            context: {
                              conclusion: activeConclusionItem.source,
                              evidence: activeConclusionItem.source?.evidence,
                              suggestedQuestion: activeConclusionItem.source?.recommended_action,
                            },
                          })
                        }
                      >
                        Analizar con agente
                      </button>
                    </div>
                    </Card>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="dashboard-spec-list dashboard-spec-conclusion-list">
              {visibleConclusionListItems.length ? (
                visibleConclusionListItems.map((item) => {
                  const graphCandidate = conclusionGraphCandidate(
                    item.source,
                    visualizations,
                    chartDataState,
                    semanticMap,
                    isExpertMode,
                  )
                  return (
                    <Card
                      key={item.id}
                      className={`dashboard-spec-conclusion${
                        activeConclusionItem?.id === item.id ? ' dashboard-spec-conclusion--active' : ''
                      }`}
                    >
                      <div className="dashboard-spec-conclusion-index">
                        {String(item.index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <span className={priorityClass(item.confidenceLevel)}>
                          Confianza {item.confidenceLabel}
                        </span>
                        <h3>{item.source?.conclusion}</h3>
                        <p>{item.source?.evidence}</p>
                        {isExpertMode ? (
                          <small>
                            Grafico: {item.source?.related_chart || 'sin dato'} | Metrica:{' '}
                            {semanticLabel(semanticMap, item.source?.related_metric) ||
                              item.source?.related_metric ||
                              'sin dato'}{' '}
                            | Origen: {item.source?.source || (spec.llm_used ? 'llm' : 'rules')} | Items:{' '}
                            {asList(item.source?.related_items).length || 0}
                          </small>
                        ) : null}
                        {!graphCandidate.readiness.ready ? (
                          <small className="dashboard-spec-graph-unavailable">
                            Sin grafico directo: {graphCandidate.readiness.reason || 'requiere una vista valida.'}
                          </small>
                        ) : null}
                      </div>
                      <div className="dashboard-spec-conclusion-actions">
                        <button type="button" onClick={() => handleShowConclusionDetail(item)}>
                          Ver detalle
                        </button>
                        {graphCandidate.readiness.ready ? (
                          <button type="button" onClick={() => handleShowConclusionChart(item.source, item.id)}>
                            Ver grafico
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            openChatWithContext({
                              label: item.source?.conclusion,
                              intent: 'profundizar conclusion del dashboard',
                              visibleText: `Desarrolla esta conclusion: ${item.source?.conclusion}.`,
                              context: {
                                conclusion: item.source,
                                evidence: item.source?.evidence,
                                suggestedQuestion: item.source?.recommended_action,
                              },
                            })
                          }
                        >
                          Analizar con agente
                        </button>
                      </div>
                    </Card>
                  )
                })
              ) : (
                <Card className="dashboard-spec-empty-card">No hay conclusiones generadas.</Card>
              )}
            </div>
            {!showDetailPanels && conclusionMatrixItems.length > visibleConclusionListItems.length ? (
              <div className="dashboard-spec-compact-note">
                Mostrando {visibleConclusionListItems.length} conclusiones principales de{' '}
                {conclusionMatrixItems.length}. Usa Ver detalle para revisar toda la lectura
                accionable.
              </div>
            ) : null}
          </section>

          {isExpertMode ? (
            insights.length === 0 ? (
              <Card className="decision-empty">
                No hay evidencias guardadas para esta ejecucion. Elige otra en el filtro superior.
              </Card>
            ) : filteredInsights.length === 0 ? (
              <Card className="decision-empty">No hay evidencias para el filtro seleccionado.</Card>
            ) : (
              <>
                <section className="dashboard-spec-section dashboard-spec-expert-section">
                  <div className="dashboard-spec-section-head">
                    <div>
                      <span className="dashboard-spec-eyebrow">Vista experta</span>
                      <h2>Base de evidencia y trazabilidad</h2>
                      <p>
                        Revision tecnica de evidencias guardadas, metricas auxiliares y graficos
                        secundarios.
                      </p>
                    </div>
                  </div>
                  <div className="decision-kpis decision-kpis--dashboard">
                    <Card className="decision-kpi">
                      <span>Evidencias</span>
                      <strong>{summary.insightCount}</strong>
                    </Card>
                    <Card className="decision-kpi">
                      <span>Ejecuciones</span>
                      <strong>{summary.runCount}</strong>
                    </Card>
                    <Card className="decision-kpi">
                      <span>Tipos de evidencia</span>
                      <strong>{summary.kindCount}</strong>
                    </Card>
                    {avgSlaLabel ? (
                      <Card className="decision-kpi">
                        <span>SLA promedio</span>
                        <strong>{avgSlaLabel}</strong>
                      </Card>
                    ) : null}
                    {avgRiskLabel ? (
                      <Card className="decision-kpi">
                        <span>Riesgo promedio</span>
                        <strong>{avgRiskLabel}</strong>
                      </Card>
                    ) : null}
                    {clusterCoverage.totalRecords ? (
                      <Card className="decision-kpi">
                        <span>Registros en grupos guardados</span>
                        <strong>{clusterCoverage.totalRecords.toLocaleString('es-ES')}</strong>
                      </Card>
                    ) : null}
                  </div>

                  <div className="conv-dashboard-main">
                    <section className="conv-dashboard-list-panel" aria-label="Lista de evidencias guardadas">
                      <ConversationInsightTable
                        items={paginatedInsights}
                        allItems={filteredInsights}
                        activeKey={activeChartKey}
                        selectedKeys={selectedKeys}
                        onSelect={(next) => setActiveInsightKey(insightKey(next))}
                        onToggleCheck={toggleInsightSelection}
                        onToggleSelectAll={toggleSelectAllOnPage}
                      />

                      <InsightListPagination
                        page={listPage}
                        pageSize={DASHBOARD_PAGE_SIZE}
                        totalCount={filteredInsights.length}
                        onPageChange={setListPage}
                        itemLabel="evidencias"
                      />

                      <ConversationDashboardFooter
                        selectedInsights={selectedInsights}
                        activeRunId={selectedRunId || activeInsight?.run_id}
                      />
                    </section>

                    <aside className="conv-dashboard-side">
                      <ConversationReadingPanel reading={reading} allItems={filteredInsights} />
                    </aside>
                  </div>

                  <section
                    className="conv-dashboard-analytics dashboard-spec-expert-analytics"
                    aria-label="Visualizaciones analiticas"
                  >
                    <ConversationRunLinkBar run={activeRun} />

                    <div className="dashboard-spec-expert-graph-block">
                      <div className="dashboard-spec-expert-graph-head">
                        <span className="dashboard-spec-eyebrow">Mapa tecnico principal</span>
                        <h3>Criticidad, volumen e incumplimiento SLA</h3>
                        <p>
                          Ubica evidencias o clusters por impacto tecnico para detectar focos que
                          requieren revision operativa.
                        </p>
                      </div>
                      <ConversationScatterChart
                        insights={filteredInsights}
                        activeKey={activeChartKey}
                        onSelect={setActiveInsightKey}
                      />
                    </div>

                    {expertCorrelations.length ? (
                      <div className="dashboard-spec-expert-graph-block">
                        <div className="dashboard-spec-expert-graph-head">
                          <span className="dashboard-spec-eyebrow">Relaciones numericas</span>
                          <h3>Correlaciones para investigacion tecnica</h3>
                          <p>
                            Ayuda a detectar variables numericas que se mueven juntas y pueden
                            explicar patrones de SLA, riesgo o complejidad.
                          </p>
                        </div>
                        <ConversationCorrelationChart correlations={expertCorrelations} />
                      </div>
                    ) : null}

                    {showClusterCharts ? (
                      <div className="dashboard-spec-expert-graph-block">
                        <div className="dashboard-spec-expert-graph-head">
                          <span className="dashboard-spec-eyebrow">Clusters guardados</span>
                          <h3>Tamano, criticidad y estabilidad de grupos</h3>
                          <p>
                            Compara los grupos seleccionados por volumen y riesgo para priorizar
                            cuales revisar primero.
                          </p>
                        </div>
                        <div className="dashboard-spec-expert-graph-grid">
                          <ConversationClusterVolumeChart
                            insights={filteredInsights}
                            activeKey={activeChartKey}
                            onSelect={setActiveInsightKey}
                          />
                          <ConversationClusterRiskChart
                            insights={filteredInsights}
                            activeKey={activeChartKey}
                            onSelect={setActiveInsightKey}
                          />
                        </div>
                      </div>
                    ) : null}

                    {showBusinessCharts ? (
                      <div className="dashboard-spec-expert-graph-block">
                        <div className="dashboard-spec-expert-graph-head">
                          <span className="dashboard-spec-eyebrow">Dimensiones de negocio</span>
                          <h3>Servicios, categorias y tipos de evidencia</h3>
                          <p>
                            Traduce hallazgos tecnicos a dimensiones interpretables para comparar
                            concentracion, impacto y volumen.
                          </p>
                        </div>
                        <div className="dashboard-spec-expert-graph-grid">
                          <ConversationDimensionChart insights={filteredInsights} />
                          <ConversationDimensionTreemap insights={filteredInsights} />
                          <ConversationEvidenceChart
                            insights={filteredInsights}
                            activeKey={activeChartKey}
                            onSelect={setActiveInsightKey}
                          />
                          <ConversationInsightImpactChart
                            insights={filteredInsights}
                            activeKey={activeChartKey}
                            onSelect={setActiveInsightKey}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="dashboard-spec-expert-graph-block">
                      <div className="dashboard-spec-expert-graph-head">
                        <span className="dashboard-spec-eyebrow">Priorizacion</span>
                        <h3>Prioridad y ranking de evidencias</h3>
                        <p>
                          Ordena la base guardada para decidir que evidencias abrir, filtrar o
                          enviar al agente.
                        </p>
                      </div>
                      <div className="dashboard-spec-expert-graph-grid">
                        <ConversationPriorityChart
                          insights={filteredInsights}
                          activePriority={activePriorityLevel}
                          onSelectPriority={(level) =>
                            setActivePriorityLevel((current) => (current === level ? '' : level))
                          }
                          chartRevision={activePriorityLevel || 'all'}
                        />
                        <ConversationRankingChart
                          insights={filteredInsights}
                          activeKey={activeChartKey}
                          onSelect={setActiveInsightKey}
                        />
                      </div>
                    </div>

                    <div className="dashboard-spec-expert-graph-block">
                      <div className="dashboard-spec-expert-graph-head">
                        <span className="dashboard-spec-eyebrow">Composicion tecnica</span>
                        <h3>Mezcla de metricas y tipos de hallazgo</h3>
                        <p>
                          Resume de que esta compuesta la base de evidencia para detectar sesgos o
                          exceso de ruido antes de decidir.
                        </p>
                      </div>
                      <ConversationMetricMixChart insights={filteredInsights} />
                    </div>
                  </section>
                </section>
              </>
            )
          ) : null}
        </>
      )}

      <Dialog
        open={savedInsightsOpen}
        onClose={() => setSavedInsightsOpen(false)}
        title="Base de evidencia"
        description="Estas evidencias guardadas alimentan el Dashboard Conversacional y el chat contextual."
        size="wide"
      >
        <ConversationDashboardHero
          summary={summary}
          runsForFilter={runsForFilter}
          selectedRunId={selectedRunId}
          onRunChange={onRunChange}
          runOptionLabel={runOptionLabel}
          metricFilter={metricFilter}
          metricKinds={metricKinds}
          kindCounts={kindCounts}
          totalInsights={insights.length}
          onMetricFilterChange={onMetricFilterChange}
          variant="embedded"
        />

        {filteredInsights.length ? (
          <div className="dashboard-spec-saved-list dashboard-spec-saved-list--dialog">
            {filteredInsights.map((item) => (
              <button
                type="button"
                key={insightKey(item)}
                className={`dashboard-spec-saved-item${
                  activeChartKey === insightKey(item) ? ' dashboard-spec-saved-item--active' : ''
                }`}
                onClick={() => {
                  setActiveInsightKey(insightKey(item))
                  setSavedInsightsOpen(false)
                }}
              >
                <strong>{item.title}</strong>
                <span>{item.metric_label || item.filter_kind || 'Hallazgo guardado'}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="dashboard-spec-muted">No hay evidencias guardadas para el filtro actual.</p>
        )}
      </Dialog>

      <FloatingChatWidget
        run={chatRun}
        forceOpen={chatOpenSignal}
        externalPrompt={chatExternalPrompt}
        onExternalPromptConsumed={() => setChatExternalPrompt(null)}
      />
    </div>
  )
}

ConversationDashboardPage.propTypes = {
  embedded: PropTypes.bool,
  toolbarHost: PropTypes.object,
  isExpert: PropTypes.bool,
}

ConversationDashboardProgress.propTypes = {
  title: PropTypes.string.isRequired,
  progress: PropTypes.number.isRequired,
}
