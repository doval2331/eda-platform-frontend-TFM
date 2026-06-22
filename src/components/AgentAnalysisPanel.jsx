import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAgentResults,
  recordHumanAgentDecision,
  runAgentInterpretation,
  runAgentStrategy,
} from '@/api/agents'
import { selectRunInsight } from '@/api/conversation'
import {
  AgentLlmHero,
  isLlmEnrichedInsight,
  LlmModeChip,
  SparkleIcon,
} from './LlmVisual'
import { Button, Card, Feedback, LoadingPanel, LoadingSlot } from '@/ui'
import {
  buildInsightsOverview,
  businessInsightAction,
  businessInsightLead,
  businessInsightTitle,
  chatPromptForInsight,
  filterInsightsForList,
  insightHasClearSignal,
  insightIdentity,
  insightRiskRank,
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
import { InsightStepList } from './agent/InsightStepList'
import { INSIGHT_PAGE_SIZE } from './agent/InsightListPagination'
import { InsightsActionCard } from './agent/InsightsActionCard'
import { AgentPhaseSteps, resolveAgentPhase } from './agent/AgentPhaseSteps'
import { StrategyActionCard } from './agent/StrategyActionCard'
import { StrategyReferenceSection } from './agent/StrategyReferenceSection'
import { StrategyStepList } from './agent/StrategyStepList'
import '@/styles/llm-visual.css'

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

function insightFromAgent(runId, item) {
  const riskMap = { high: 85, medium: 55, low: 25 }
  const riskKey = String(item.risk_level ?? '').toLowerCase()
  return {
    id: insightIdentity(runId, item),
    title: businessInsightTitle(item),
    description: [businessInsightLead(item), businessInsightAction(item)].filter(Boolean).join(' '),
    metric_label: 'cluster_agent_risk',
    metric_value: riskMap[riskKey] ?? item.sample_size ?? 0,
    dimension: 'cluster_label',
    filter_kind: 'cluster_label',
    filter_value: String(item.cluster_label),
  }
}

function AgentNextStepHint({ recommendations, insights, phase }) {
  const hasStrategy = recommendations.length > 0
  const hasInsights = insights.length > 0
  const title = hasInsights
    ? 'Siguiente paso: revisar hallazgos'
    : phase === 'interpret'
      ? 'Siguiente paso: interpretar grupos'
      : hasStrategy
        ? 'Siguiente paso: confirmar variables'
        : 'Siguiente paso: pedir una estrategia'
  const text = hasInsights
    ? 'Ya puedes revisar los grupos interpretados, agregar hallazgos al dashboard o llevarlos al chat.'
    : phase === 'interpret'
      ? 'Las variables ya estan confirmadas. Pulsa Interpretar grupos para generar los hallazgos.'
      : hasStrategy
        ? 'Marca las variables que aceptas y pulsa Confirmar variables. Despues podras interpretar los grupos.'
        : 'Pulsa Sugerir estrategia para que la app proponga que variables mirar y como leer los grupos.'
  return (
    <div className="agent-next-step">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

export function AgentAnalysisPanel({ run, onOpenChatWithPrompt }) {
  const runId = run?.id
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
    if (!runId) return
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
  }, [runId])

  useEffect(() => {
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
    if (runId) void loadResults()
  }, [runId, loadResults])

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

  const visibleInsights = useMemo(
    () => paginateInsightList(filteredInsights, insightPage, INSIGHT_PAGE_SIZE),
    [filteredInsights, insightPage],
  )

  useEffect(() => {
    setInsightPage(0)
  }, [insightFilter, runId])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredInsightsTotal / INSIGHT_PAGE_SIZE) - 1)
    if (insightPage > maxPage) setInsightPage(maxPage)
  }, [filteredInsightsTotal, insightPage])

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

  async function onRunStrategy() {
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
  }

  async function onRunInterpretation() {
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
  }

  function onToggleStrategyVariable(item, variableName) {
    const key = strategyItemKey(item)
    setSelectedStrategyVariables((current) => {
      const fallback = parseVariables(item.variables_used)
      const existing = current[key] ?? fallback
      const next = existing.includes(variableName)
        ? existing.filter((name) => name !== variableName)
        : [...existing, variableName]
      return { ...current, [key]: next }
    })
  }

  async function onValidateStrategy() {
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
  }

  async function onAddToDashboard(item) {
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
      setMessage(`«${insight.title}» agregado al dashboard conversacional.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
    }
  }

  function onToggleInsightSelection(item) {
    const id = insightIdentity(runId, item)
    setSelectedInsightIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function onAddSelectedToDashboard() {
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
      const savedIds = []
      for (const item of pending) {
        const insight = insightFromAgent(runId, item)
        await selectRunInsight(runId, insight)
        savedIds.push(insight.id)
      }
      setSelectedIds((current) => new Set([...current, ...savedIds]))
      setSelectedInsightIds((current) => {
        const next = new Set(current)
        savedIds.forEach((id) => next.delete(id))
        return next
      })
      setMessage(`${savedIds.length} hallazgos agregados al dashboard conversacional.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los hallazgos seleccionados')
    } finally {
      setBulkDashboardLoading(false)
    }
  }

  function onSummarizeInChat() {
    if (!insights.length) return
    const llmItems = insights.filter((item) => isLlmEnrichedInsight(item))
    const focus = llmItems[0] ?? insights[0]
    const prompt = focus
      ? `Resume el cluster ${focus.cluster_label} (${focus.cluster_name}): ${focus.summary} ¿Qué acciones recomiendas?`
      : 'Resume los clusters más críticos de este análisis y sugiere próximos pasos.'
    onOpenChatWithPrompt?.(prompt)
    setMessage('Abriendo el chat con un resumen del análisis asistido…')
  }

  function onAskInsightInChat(item) {
    onOpenChatWithPrompt?.(chatPromptForInsight(item))
    setMessage(`Abriendo el chat para revisar: ${businessInsightTitle(item)}`)
  }

  if (!runId) {
    return (
      <section className="agent-panel agent-panel--empty">
        <p>Ejecuta el pipeline para habilitar el análisis asistido por agentes.</p>
      </section>
    )
  }

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

  return (
    <section
      className={`agent-panel cluster-insights${
        initialLoading || strategyLoading || interpretationLoading ? ' agent-panel--loading' : ''
      }`}
    >
      <div className="cluster-insights-header">
        <div>
          <h3>Análisis asistido por agentes</h3>
          <p className="note">
            Estrategia + interpretación por cluster. Etiqueta <LlmModeChip mode="llm_active" /> =
            texto enriquecido por Azure.
          </p>
        </div>
      </div>

      <AgentLlmHero
        compact
        used={llmStatus?.used ?? Boolean(recommendations.length || llmInsightCount)}
        modelName={llmStatus?.modelName ?? 'gpt-4.1-mini'}
        detail={llmStatus?.detail}
        title={agentHeroTitle}
        subtitle={
          llmStatus?.used
            ? llmStatus.detail ?? 'Estrategia e interpretación con LLM.'
            : agentHeroSubtitle ?? undefined
        }
        stats={[
          { label: 'Estrategias', value: recommendations.length || '—' },
          { label: 'Clusters', value: insights.length || '—' },
          { label: 'Azure AI', value: llmInsightCount || '—' },
        ]}
      />

      {!hasStrategy && !hasInsights ? (
        <AgentNextStepHint recommendations={recommendations} insights={insights} phase={agentPhase} />
      ) : showStrategyActive ? (
        <AgentNextStepHint recommendations={recommendations} insights={insights} phase={agentPhase} />
      ) : null}

      {(hasStrategy || hasInsights) && !initialLoading ? (
        <AgentPhaseSteps phase={agentPhase} />
      ) : null}

      {(!hasStrategy && !hasInsights) || showStrategyActive ? (
        <div className="agent-panel-actions">
          {!hasStrategy && !hasInsights ? (
            <Button
              type="button"
              variant="primary"
              className="btn-sm"
              disabled={busy}
              onClick={onRunStrategy}
            >
              {strategyLoading ? (
                <>
                  <SparkleIcon size={14} /> Generando con Azure AI…
                </>
              ) : (
                'Sugerir estrategia'
              )}
            </Button>
          ) : null}

          {showStrategyActive ? (
            <Button
              type="button"
              variant="secondary"
              className="btn-sm"
              disabled={busy}
              onClick={onRunStrategy}
            >
              {strategyLoading ? 'Regenerando...' : 'Regenerar estrategia'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {message ? <Feedback variant="success" message={message} /> : null}
      {error ? <Feedback variant="danger" message={error} /> : null}

      {initialLoading ? (
        <LoadingSlot variant="panel">
          <LoadingPanel bare compact spinnerSize={56} title="Cargando análisis asistido…" />
        </LoadingSlot>
      ) : strategyLoading ? (
        <LoadingSlot variant="panel">
          <LoadingPanel
            bare
            compact
            spinnerSize={64}
            variant="llm"
            title="Generando estrategia…"
            description="Consultando Azure AI y definiendo variables."
          />
        </LoadingSlot>
      ) : interpretationLoading ? (
        <LoadingSlot variant="panel">
          <LoadingPanel
            bare
            compact
            spinnerSize={64}
            variant="llm"
            title="Interpretando clusters…"
            description="Generando insights por grupo con Azure AI."
          />
        </LoadingSlot>
      ) : null}

      {!initialLoading &&
      !strategyLoading &&
      !interpretationLoading &&
      !hasStrategy &&
      !hasInsights ? (
        <Card className="agent-panel-empty">
          Todavia no hay analisis asistido para esta ejecucion. Pulsa «Sugerir estrategia» para
          empezar.
        </Card>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && showStrategyActive ? (
        <div className="agent-panel-section agent-panel-section--strategy">
          <StrategyActionCard
            overview={strategyOverview}
            llmActive={Boolean(llmStatus?.used)}
            guideSteps={strategyGuideStepsList}
          />
          <StrategyStepList
            steps={recommendations}
            selectedStrategyVariables={selectedStrategyVariables}
            onToggleVariable={onToggleStrategyVariable}
            llmActive={Boolean(llmStatus?.used)}
            phaseFooter={agentPhase === 'interpret' ? 'interpret' : 'strategy'}
            onConfirm={onValidateStrategy}
            onInterpret={onRunInterpretation}
            confirmLoading={validationLoading}
            interpretLoading={interpretationLoading}
            actionDisabled={busy}
          />
        </div>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && hasInsights ? (
        <div className="agent-panel-section agent-panel-section--insights">
          <InsightsActionCard
            overview={insightsOverview}
            insightFilter={insightFilter}
            onFilterChange={setInsightFilter}
            filterCounts={insightFilterCounts}
          />
          {filteredInsightsTotal ? (
            <InsightStepList
              runId={runId}
              items={visibleInsights}
              totalCount={filteredInsightsTotal}
              page={insightPage}
              pageSize={INSIGHT_PAGE_SIZE}
              onPageChange={setInsightPage}
              selectedInsightIds={selectedInsightIds}
              addedIds={selectedIds}
              onToggleSelect={onToggleInsightSelection}
              onAskChat={onAskInsightInChat}
              onAdd={onAddToDashboard}
              onAddSelected={onAddSelectedToDashboard}
              onSummarizeInChat={onSummarizeInChat}
              addDisabled={busy}
              addLoading={bulkDashboardLoading}
              chatDisabled={busy}
            />
          ) : (
            <Card className="agent-trace-empty">
              No hay grupos para este filtro. Cambia a Recomendados o Todos para continuar.
            </Card>
          )}
        </div>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && showStrategyReference ? (
        <StrategyReferenceSection
          overview={strategyOverview}
          steps={recommendations}
          selectedStrategyVariables={selectedStrategyVariables}
          llmActive={Boolean(llmStatus?.used)}
          strategyConfirmed={strategyConfirmed}
        />
      ) : null}
    </section>
  )
}
