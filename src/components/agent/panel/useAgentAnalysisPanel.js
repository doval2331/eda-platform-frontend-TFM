import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAgentResults,
  recordHumanAgentDecision,
  runAgentInterpretation,
  runAgentStrategy,
} from '@/api/agents'
import { selectRunInsight, selectRunInsights } from '@/api/conversation'
import { insightSavedMessage, insightsSavedMessage } from '@/utils/biFlow'
import {
  buildInsightsOverview,
  businessInsightTitle,
  chatPromptForInsight,
  filterInsightsForList,
  insightHasClearSignal,
  insightIdentity,
  insightRiskRank,
  isLlmEnrichedInsight,
  paginateInsightList,
  sortInsightsByBusinessPriority,
} from '@/utils/insightPresentation'
import {
  buildStrategyOverview,
  buildStrategyVariableSelection,
  parseVariables,
  strategyGuideSteps,
  strategyItemKey,
} from '@/utils/strategyPresentation'
import { INSIGHT_PAGE_SIZE } from '../shared/InsightListPagination'
import { resolveAgentPhase } from '../shared/agentPhase'
import { insightFromAgent } from './insightFromAgent'

export function useAgentAnalysisPanel(runId, onOpenChatWithPrompt, { enabled = true } = {}) {
  const [recommendations, setRecommendations] = useState([])
  const [insights, setInsights] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedInsightIds, setSelectedInsightIds] = useState(new Set())
  const [initialLoading, setInitialLoading] = useState(false)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [interpretationLoading, setInterpretationLoading] = useState(false)
  const [bulkDashboardLoading, setBulkDashboardLoading] = useState(false)
  const [validationLoading, setValidationLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [llmStatus, setLlmStatus] = useState(null)
  const [insightFilter, setInsightFilter] = useState('recommended')
  const [insightPage, setInsightPage] = useState(0)
  const [selectedStrategyVariables, setSelectedStrategyVariables] = useState({})
  const [strategyConfirmed, setStrategyConfirmed] = useState(false)

  const loadResults = useCallback(async () => {
    if (!runId || !enabled) return
    setInitialLoading(true)
    setError(null)
    try {
      const data = await fetchAgentResults(runId)
      const loadedRecommendations = data.recommendations ?? []
      const loadedInsights = data.insights ?? []
      setRecommendations(loadedRecommendations)
      setSelectedStrategyVariables(buildStrategyVariableSelection(loadedRecommendations))
      setInsights(loadedInsights)
      setStrategyConfirmed(
        loadedInsights.length > 0 ||
          (loadedRecommendations.length > 0 && Boolean(data.has_traces)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los resultados del agente')
    } finally {
      setInitialLoading(false)
    }
  }, [runId, enabled])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecommendations([])
      setInsights([])
      setSelectedIds(new Set())
      setSelectedInsightIds(new Set())
      setMessage(null)
      setLlmStatus(null)
      setInsightFilter('recommended')
      setInsightPage(0)
      setSelectedStrategyVariables({})
      setStrategyConfirmed(false)
      setError(null)
      if (runId && enabled) void loadResults()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [runId, loadResults, enabled])

  const llmInsightCount = useMemo(
    () => insights.filter((item) => isLlmEnrichedInsight(item)).length,
    [insights],
  )

  const sortedInsights = useMemo(() => sortInsightsByBusinessPriority(insights), [insights])

  const insightCounts = useMemo(
    () => ({
      recommended: Math.min(sortedInsights.length, 30),
      mediumHigh: sortedInsights.filter((item) => insightRiskRank(item) >= 2).length,
      clearSignal: sortedInsights.filter((item) => insightHasClearSignal(item)).length,
      low: sortedInsights.filter((item) => insightRiskRank(item) === 1).length,
      llm: sortedInsights.filter((item) => isLlmEnrichedInsight(item)).length,
      all: sortedInsights.length,
    }),
    [sortedInsights],
  )

  const filteredInsights = useMemo(
    () => filterInsightsForList(sortedInsights, insightFilter),
    [insightFilter, sortedInsights],
  )

  const filteredInsightsTotal = filteredInsights.length
  const maxInsightPage = Math.max(
    0,
    Math.ceil(filteredInsightsTotal / INSIGHT_PAGE_SIZE) - 1,
  )
  const boundedInsightPage = Math.min(insightPage, maxInsightPage)

  const visibleInsights = useMemo(
    () => paginateInsightList(filteredInsights, boundedInsightPage, INSIGHT_PAGE_SIZE),
    [boundedInsightPage, filteredInsights],
  )

  const changeInsightFilter = useCallback((nextFilter) => {
    setInsightFilter(nextFilter)
    setInsightPage(0)
  }, [])

  const strategyOverview = useMemo(
    () => buildStrategyOverview(recommendations, selectedStrategyVariables),
    [recommendations, selectedStrategyVariables],
  )

  const strategyGuideStepsList = useMemo(() => strategyGuideSteps(), [])

  const insightsOverview = useMemo(
    () => buildInsightsOverview(insights, selectedInsightIds.size),
    [insights, selectedInsightIds.size],
  )

  const insightFilterCounts = useMemo(
    () => ({
      recommended: insightCounts.recommended,
      medium_high: insightCounts.mediumHigh,
      clear_signal: insightCounts.clearSignal,
      low: insightCounts.low,
      all: insightCounts.all,
      llm: insightCounts.llm,
    }),
    [insightCounts],
  )

  const onRunStrategy = useCallback(async () => {
    if (!runId) return
    setStrategyLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await runAgentStrategy(runId)
      const strategyItems = response.items ?? []
      setRecommendations(strategyItems)
      setSelectedStrategyVariables(buildStrategyVariableSelection(strategyItems))
      setStrategyConfirmed(false)
      setLlmStatus({
        used: Boolean(response.llm_used),
        mode: response.llm_mode,
        detail: response.llm_detail,
        modelName: response.model_name,
      })
      setMessage(
        response.llm_used
          ? 'Estrategia generada con agente LLM y guardada.'
          : 'Estrategia generada en modo local y guardada.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar el agente de estrategia')
    } finally {
      setStrategyLoading(false)
    }
  }, [runId])

  const onRunInterpretation = useCallback(async () => {
    if (!runId) return
    setInterpretationLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await runAgentInterpretation(runId)
      setInsights(response.items ?? [])
      setLlmStatus({
        used: Boolean(response.llm_used),
        mode: response.llm_mode,
        detail: response.llm_detail,
        modelName: response.model_name,
      })
      setMessage(
        response.llm_used
          ? 'Interpretación por cluster generada con agente LLM y guardada.'
          : 'Interpretación por cluster generada en modo local y guardada.',
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo ejecutar el agente de interpretación',
      )
    } finally {
      setInterpretationLoading(false)
    }
  }, [runId])

  const onToggleStrategyVariable = useCallback((item, variableName) => {
    const key = strategyItemKey(item)
    setSelectedStrategyVariables((current) => {
      const fallback = parseVariables(item.variables_used)
      const existing = current[key] ?? fallback
      const next = existing.includes(variableName)
        ? existing.filter((name) => name !== variableName)
        : [...existing, variableName]
      return { ...current, [key]: next }
    })
  }, [])

  const onValidateStrategy = useCallback(async () => {
    if (!runId || !recommendations.length) return
    setValidationLoading(true)
    setError(null)
    setMessage(null)
    try {
      const approvedStrategyIds = recommendations
        .map((item) => item.strategy_id)
        .filter(Boolean)
        .map(String)
      const variablesByStrategy = Object.fromEntries(
        recommendations.map((item) => {
          const key = strategyItemKey(item)
          return [key, selectedStrategyVariables[key] ?? parseVariables(item.variables_used)]
        }),
      )
      await recordHumanAgentDecision(runId, {
        decision_type: 'strategy_approval',
        status: 'approved',
        summary:
          'El analista confirma la estrategia propuesta por el agente y las variables seleccionadas para continuar con la interpretacion de grupos.',
        approved_strategy_ids: approvedStrategyIds,
        parameters: {
          recommendation_count: recommendations.length,
          insight_count: insights.length,
          selected_variables_by_strategy: variablesByStrategy,
        },
      })
      setStrategyConfirmed(true)
      setMessage('Variables confirmadas correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la validacion humana')
    } finally {
      setValidationLoading(false)
    }
  }, [runId, recommendations, selectedStrategyVariables, insights.length])

  const onAddToDashboard = useCallback(
    async (item) => {
      if (!runId) return
      const insight = insightFromAgent(runId, item)
      if (selectedIds.has(insight.id)) return
      try {
        await selectRunInsight(runId, insight)
        setSelectedIds((current) => new Set([...current, insight.id]))
        setSelectedInsightIds((current) => {
          const next = new Set(current)
          next.delete(insight.id)
          return next
        })
        setMessage(insightSavedMessage(insight.title))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
      }
    },
    [runId, selectedIds],
  )

  const onToggleInsightSelection = useCallback(
    (item) => {
      const id = insightIdentity(runId, item)
      setSelectedInsightIds((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [runId],
  )

  const onAddSelectedToDashboard = useCallback(async () => {
    if (!runId || !selectedInsightIds.size) return
    const items = sortedInsights.filter((item) => selectedInsightIds.has(insightIdentity(runId, item)))
    const pending = items.filter((item) => !selectedIds.has(insightIdentity(runId, item)))
    if (!pending.length) {
      setMessage('Los hallazgos seleccionados ya estaban agregados al dashboard.')
      setSelectedInsightIds(new Set())
      return
    }
    setBulkDashboardLoading(true)
    setError(null)
    try {
      const insights = pending.map((item) => insightFromAgent(runId, item))
      const response = await selectRunInsights(runId, insights)
      const savedIds = insights.map((insight) => insight.id)
      setSelectedIds((current) => new Set([...current, ...savedIds]))
      setSelectedInsightIds((current) => {
        const next = new Set(current)
        savedIds.forEach((id) => next.delete(id))
        return next
      })
      const savedCount = response?.saved ?? savedIds.length
      setMessage(insightsSavedMessage(savedCount))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los hallazgos seleccionados')
    } finally {
      setBulkDashboardLoading(false)
    }
  }, [runId, selectedInsightIds, sortedInsights, selectedIds])

  const onSummarizeInChat = useCallback(() => {
    if (!insights.length) return
    const llmItems = insights.filter((item) => isLlmEnrichedInsight(item))
    const focus = llmItems[0] ?? insights[0]
    const prompt = focus
      ? `Resume el cluster ${focus.cluster_label} (${focus.cluster_name}): ${focus.summary} ¿Qué acciones recomiendas?`
      : 'Resume los clusters más críticos de este análisis y sugiere próximos pasos.'
    onOpenChatWithPrompt?.(prompt)
    setMessage('Abriendo el chat con un resumen del análisis asistido…')
  }, [insights, onOpenChatWithPrompt])

  const onAskInsightInChat = useCallback(
    (item) => {
      onOpenChatWithPrompt?.(chatPromptForInsight(item))
      setMessage(`Abriendo el chat para revisar: ${businessInsightTitle(item)}`)
    },
    [onOpenChatWithPrompt],
  )

  const busy =
    strategyLoading || interpretationLoading || validationLoading || bulkDashboardLoading || initialLoading
  const agentPhase = resolveAgentPhase({ recommendations, insights, strategyConfirmed })
  const hasInsights = insights.length > 0
  const hasStrategy = recommendations.length > 0
  const showStrategyActive = hasStrategy && !hasInsights
  const showStrategyReference = hasStrategy && hasInsights
  const agentHeroTitle = hasInsights
    ? 'Grupos interpretados'
    : hasStrategy
      ? strategyConfirmed
        ? 'Listo para interpretar'
        : 'Estrategia sugerida'
      : 'Listo para asistir el analisis'
  const agentHeroSubtitle =
    hasStrategy || hasInsights
      ? null
      : llmStatus?.used
        ? llmStatus.detail ?? 'La app ya uso IA para apoyar la lectura del analisis.'
        : 'Primero genera una estrategia: la app sugerira que variables mirar y como explicar los grupos.'

  return {
    recommendations,
    insights,
    selectedIds,
    selectedInsightIds,
    initialLoading,
    strategyLoading,
    interpretationLoading,
    bulkDashboardLoading,
    validationLoading,
    error,
    message,
    llmStatus,
    insightFilter,
    setInsightFilter: changeInsightFilter,
    insightPage: boundedInsightPage,
    setInsightPage,
    selectedStrategyVariables,
    strategyConfirmed,
    llmInsightCount,
    filteredInsightsTotal,
    visibleInsights,
    strategyOverview,
    strategyGuideStepsList,
    insightsOverview,
    insightFilterCounts,
    onRunStrategy,
    onRunInterpretation,
    onToggleStrategyVariable,
    onValidateStrategy,
    onAddToDashboard,
    onToggleInsightSelection,
    onAddSelectedToDashboard,
    onSummarizeInChat,
    onAskInsightInChat,
    busy,
    agentPhase,
    hasInsights,
    hasStrategy,
    showStrategyActive,
    showStrategyReference,
    agentHeroTitle,
    agentHeroSubtitle,
  }
}
