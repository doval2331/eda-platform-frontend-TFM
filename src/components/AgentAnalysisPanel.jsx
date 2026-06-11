import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAgentResults,
  fetchAgentTraces,
  fetchProjectAgentTraces,
  recordHumanAgentDecision,
  runAgentInterpretation,
  runAgentStrategy,
} from '../api/agents'
import { selectRunInsight } from '../api/conversation'
import {
  AgentLlmHero,
  isLlmEnrichedInsight,
  LlmModeChip,
  SparkleIcon,
} from './LlmVisual'
import { Button, Card, Dialog, Feedback, LoadingPanel } from '../ui'
import '../styles/llm-visual.css'

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
    id: item.cluster_insight_id ?? `agent-${runId}-${item.cluster_label}`,
    title: item.cluster_name
      ? `${item.cluster_name} — análisis asistido`
      : `Cluster ${item.cluster_label}`,
    description: [item.summary, item.business_conclusion].filter(Boolean).join(' '),
    metric_label: 'cluster_agent_risk',
    metric_value: riskMap[riskKey] ?? item.sample_size ?? 0,
    dimension: 'cluster_label',
    filter_kind: 'cluster_label',
    filter_value: String(item.cluster_label),
  }
}

function formatStrategyTitle(id) {
  return String(id ?? 'Recomendación')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function parseVariables(value) {
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

function PriorityChip({ level }) {
  const key = String(level ?? '').toLowerCase()
  const className =
    key === 'high' ? 'high' : key === 'medium' ? 'medium' : key === 'low' ? 'low' : 'neutral'
  return <span className={`agent-priority agent-priority--${className}`}>{level ?? '—'}</span>
}

function VariableChips({ variables, max = 5 }) {
  const items = variables.slice(0, max)
  const rest = variables.length - items.length
  if (!items.length) return null
  return (
    <div className="agent-var-chips" aria-label="Variables sugeridas">
      {items.map((name) => (
        <span className="agent-var-chip" key={name}>
          {name}
        </span>
      ))}
      {rest > 0 ? <span className="agent-var-chip agent-var-chip--more">+{rest}</span> : null}
    </div>
  )
}

function StrategyCard({ item, llmActive }) {
  const variables = parseVariables(item.variables_used)
  return (
    <article className={`agent-compact-card${llmActive ? ' agent-compact-card--llm' : ''}`}>
      <div className="agent-compact-card__head">
        <div className="agent-compact-card__meta">
          <span className="agent-compact-card__type">{item.strategy_type ?? 'estrategia'}</span>
          <h5 className="agent-compact-card__title">{formatStrategyTitle(item.strategy_id)}</h5>
        </div>
        <PriorityChip level={item.priority} />
      </div>
      <p className="agent-compact-card__lead">{item.recommendation}</p>
      <VariableChips variables={variables} />
      <details className="agent-compact-details">
        <summary>Más detalle</summary>
        {item.justification ? <p>{item.justification}</p> : null}
        {variables.length > 5 ? (
          <div className="agent-var-chips agent-var-chips--full">
            {variables.map((name) => (
              <span className="agent-var-chip" key={name}>
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </details>
    </article>
  )
}

function InsightCard({ item, added, onAdd }) {
  const llmEnriched = isLlmEnrichedInsight(item)
  const sampleIds = parseJsonList(item.sample_evidence_ids)
  return (
    <article className={`agent-compact-card${llmEnriched ? ' agent-compact-card--llm' : ''}`}>
      <div className="agent-compact-card__head">
        <div className="agent-compact-card__meta">
          <span className="agent-compact-card__type">
            Cluster {item.cluster_label}{' '}
            <LlmModeChip mode={llmEnriched ? 'llm_active' : 'deterministic'} />
          </span>
          <h5 className="agent-compact-card__title">
            {item.cluster_name ?? `Cluster ${item.cluster_label}`}
          </h5>
        </div>
        <PriorityChip level={item.risk_level} />
      </div>
      <p className="agent-compact-card__lead">{item.summary}</p>
      <details className="agent-compact-details">
        <summary>Características y muestra</summary>
        {item.main_characteristics ? <p>{item.main_characteristics}</p> : null}
        {item.possible_causes ? <p><strong>Causas:</strong> {item.possible_causes}</p> : null}
        {item.recommendations ? <p><strong>Acción:</strong> {item.recommendations}</p> : null}
        {item.business_conclusion ? <p>{item.business_conclusion}</p> : null}
        {sampleIds.length ? (
          <p className="agent-compact-sample">
            Muestra ({item.sample_size ?? sampleIds.length}): {sampleIds.slice(0, 8).join(', ')}
            {sampleIds.length > 8 ? ` +${sampleIds.length - 8} más` : ''}
          </p>
        ) : null}
      </details>
      <div className="agent-compact-card__foot">
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={added}
          onClick={() => onAdd(item)}
        >
          {added ? 'Agregado' : 'Agregar al dashboard'}
        </Button>
      </div>
    </article>
  )
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

function TraceRow({ trace }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="agent-trace-card">
      <button type="button" className="agent-trace-head" onClick={() => setOpen((v) => !v)}>
        <div>
          <strong>{trace.agent_name}</strong>
          <span>{trace.decision_type}</span>
        </div>
        <div className="agent-trace-meta">
          {trace.scope ? <span>{trace.scope}</span> : null}
          <span>{trace.model_name}</span>
          <span>{formatDate(trace.created_at)}</span>
          <span>{open ? '▾' : '▸'}</span>
        </div>
      </button>
      {open ? (
        <div className="agent-trace-body">
          <div>
            <h4>Prompt</h4>
            <pre>{trace.prompt}</pre>
          </div>
          <div>
            <h4>Respuesta</h4>
            <pre>{trace.response}</pre>
          </div>
        </div>
      ) : null}
    </article>
  )
}

async function fetchOptionalTraces(loader) {
  try {
    const data = await loader()
    return data.traces ?? []
  } catch (err) {
    if (err?.status === 404) return []
    throw err
  }
}

export function AgentAnalysisPanel({ run, projectId: projectIdProp, onOpenChatWithPrompt }) {
  const runId = run?.id
  const projectId = projectIdProp ?? run?.project_id ?? null
  const [recommendations, setRecommendations] = useState([])
  const [insights, setInsights] = useState([])
  const [hasTraces, setHasTraces] = useState(false)
  const [traces, setTraces] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [initialLoading, setInitialLoading] = useState(false)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [interpretationLoading, setInterpretationLoading] = useState(false)
  const [validationLoading, setValidationLoading] = useState(false)
  const [tracesLoading, setTracesLoading] = useState(false)
  const [tracesOpen, setTracesOpen] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [llmStatus, setLlmStatus] = useState(null)
  const [insightFilter, setInsightFilter] = useState('all')

  const loadResults = useCallback(async () => {
    if (!runId) return
    setInitialLoading(true)
    setError(null)
    try {
      const data = await fetchAgentResults(runId)
      setRecommendations(data.recommendations ?? [])
      setInsights(data.insights ?? [])
      setHasTraces(Boolean(data.has_traces))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los resultados del agente')
    } finally {
      setInitialLoading(false)
    }
  }, [runId])

  useEffect(() => {
    setRecommendations([])
    setInsights([])
    setHasTraces(false)
    setTraces([])
    setSelectedIds(new Set())
    setMessage(null)
    setLlmStatus(null)
    setInsightFilter('all')
    setError(null)
    if (runId) void loadResults()
  }, [runId, loadResults])

  const llmInsightCount = useMemo(
    () => insights.filter((item) => isLlmEnrichedInsight(item)).length,
    [insights],
  )

  const visibleInsights = useMemo(() => {
    if (insightFilter === 'llm') {
      return insights.filter((item) => isLlmEnrichedInsight(item))
    }
    return insights
  }, [insightFilter, insights])

  const topLlmInsight = useMemo(
    () => insights.find((item) => isLlmEnrichedInsight(item)),
    [insights],
  )

  async function onRunStrategy() {
    if (!runId) return
    setStrategyLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await runAgentStrategy(runId)
      setRecommendations(response.items ?? [])
      setHasTraces((response.trace_ids?.length ?? 0) > 0 || hasTraces)
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
      setHasTraces((response.trace_ids?.length ?? 0) > 0 || hasTraces)
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
      const response = await recordHumanAgentDecision(runId, {
        decision_type: 'strategy_approval',
        status: 'approved',
        summary:
          'El analista valida la estrategia propuesta por el agente para continuar con la interpretacion de clusters.',
        approved_strategy_ids: approvedStrategyIds,
        parameters: {
          recommendation_count: recommendations.length,
          insight_count: insights.length,
        },
      })
      setHasTraces(true)
      setMessage(`Validacion humana registrada. Traza: ${response.trace_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la validacion humana')
    } finally {
      setValidationLoading(false)
    }
  }

  async function onOpenTraces() {
    if (!runId) return
    setTracesLoading(true)
    setError(null)
    try {
      const runTraces = await fetchOptionalTraces(() => fetchAgentTraces(runId))
      const projectTraces = projectId
        ? await fetchOptionalTraces(() => fetchProjectAgentTraces(projectId))
        : []
      setTraces([
        ...projectTraces.map((trace) => ({ ...trace, scope: 'Proyecto' })),
        ...runTraces.map((trace) => ({ ...trace, scope: 'Ejecucion' })),
      ])
      setTracesOpen(true)
    } catch (err) {
      if (err?.status === 404) {
        setError('Todavía no hay trazas. Ejecuta primero estrategia o interpretación.')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las trazas')
      }
    } finally {
      setTracesLoading(false)
    }
  }

  async function onAddToDashboard(item) {
    if (!runId) return
    const insight = insightFromAgent(runId, item)
    if (selectedIds.has(insight.id)) return
    try {
      await selectRunInsight(runId, insight)
      setSelectedIds((current) => new Set([...current, insight.id]))
      setMessage(`«${insight.title}» agregado al dashboard conversacional.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
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

  if (!runId) {
    return (
      <section className="agent-panel agent-panel--empty">
        <p>Ejecuta el pipeline para habilitar el análisis asistido por agentes.</p>
      </section>
    )
  }

  const busy = strategyLoading || interpretationLoading || validationLoading || initialLoading

  return (
    <section className="agent-panel cluster-insights">
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
        title={llmStatus?.used ? 'Azure AI activo' : 'Agentes listos'}
        subtitle={
          llmStatus?.used
            ? llmStatus.detail ?? 'Estrategia e interpretación con LLM.'
            : 'Pulsa generar estrategia o interpretar clusters.'
        }
        stats={[
          { label: 'Estrategias', value: recommendations.length || '—' },
          { label: 'Clusters', value: insights.length || '—' },
          { label: 'Azure AI', value: llmInsightCount || '—' },
        ]}
      />

      <div className="agent-panel-actions">
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={busy}
          onClick={onRunStrategy}
        >
          {strategyLoading ? (
            <>
              <SparkleIcon size={14} /> Generando con Azure AI…
            </>
          ) : (
            'Generar estrategia'
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={busy}
          onClick={onRunInterpretation}
        >
          {interpretationLoading ? (
            <>
              <SparkleIcon size={14} /> Interpretando con Azure AI…
            </>
          ) : (
            'Interpretar clusters'
          )}
        </Button>
        {insights.length ? (
          <Button
            type="button"
            className="btn-sm agent-summarize-btn"
            disabled={busy}
            onClick={onSummarizeInChat}
          >
            <SparkleIcon size={14} /> Llevar al chat
          </Button>
        ) : null}
        {recommendations.length ? (
          <Button
            type="button"
            variant="secondary"
            className="btn-sm"
            disabled={busy}
            onClick={onValidateStrategy}
          >
            {validationLoading ? 'Registrando validacion...' : 'Validar estrategia'}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={
            tracesLoading ||
            (!projectId && !hasTraces && !recommendations.length && !insights.length)
          }
          onClick={onOpenTraces}
        >
          {tracesLoading ? 'Cargando trazas…' : 'Ver trazas'}
        </Button>
      </div>

      {message ? <Feedback variant="success" message={message} /> : null}
      {error ? <Feedback variant="danger" message={error} /> : null}

      {initialLoading ? (
        <LoadingPanel
          title="Cargando análisis asistido…"
          description="Recuperando estrategias e insights guardados para esta ejecución."
        />
      ) : strategyLoading ? (
        <LoadingPanel
          variant="llm"
          title="Generando estrategia…"
          description="Consultando Azure AI y definiendo variables, métricas y criterios de lectura."
        />
      ) : interpretationLoading ? (
        <LoadingPanel
          variant="llm"
          title="Interpretando clusters…"
          description="Generando insights por grupo con Azure AI. Los clusters prioritarios se enriquecen primero."
        />
      ) : null}

      {!initialLoading &&
      !strategyLoading &&
      !interpretationLoading &&
      !recommendations.length &&
      !insights.length ? (
        <Card className="agent-panel-empty">
          Todavía no hay análisis asistido para esta ejecución. Pulsa «Generar estrategia» o
          «Interpretar clusters».
        </Card>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && recommendations.length ? (
        <div className="agent-panel-section">
          <h4 className="agent-section-title">
            Recomendaciones de estrategia
            {llmStatus?.used ? <LlmModeChip mode="llm_active" /> : null}
          </h4>
          <div className="agent-compact-list">
            {recommendations.map((item) => (
              <StrategyCard
                key={item.strategy_id ?? item.trace_id}
                item={item}
                llmActive={Boolean(llmStatus?.used)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && insights.length ? (
        <div className="agent-panel-section">
          <div className="agent-filter-bar">
            <h4>Insights por cluster</h4>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'all' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('all')}
            >
              Todos ({insights.length})
            </button>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'llm' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('llm')}
            >
              <SparkleIcon size={12} /> Solo Azure AI ({llmInsightCount})
            </button>
          </div>
          {topLlmInsight && insightFilter === 'llm' ? (
            <p className="note agent-compact-hint">
              Destacado: cluster {topLlmInsight.cluster_label} (ideal para la demo).
            </p>
          ) : null}
          <div className="agent-compact-list agent-compact-list--insights">
            {visibleInsights.map((item) => {
              const insightId = item.cluster_insight_id ?? `agent-${runId}-${item.cluster_label}`
              return (
                <InsightCard
                  key={insightId}
                  item={item}
                  added={selectedIds.has(insightId)}
                  onAdd={onAddToDashboard}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      <Dialog
        open={tracesOpen}
        onClose={() => setTracesOpen(false)}
        title="Trazabilidad de agentes"
        description="Prompts, respuestas, variables y parámetros registrados para esta ejecución."
        size="xl"
      >
        <div className="agent-trace-list">
          {traces.length ? (
            traces.map((trace) => <TraceRow key={trace.trace_id} trace={trace} />)
          ) : (
            <Card className="agent-trace-empty">
              Todavia no hay trazas registradas para este proyecto o ejecucion. Ejecuta primero
              el agente de estrategia, la interpretacion de clusters o registra una validacion
              humana.
            </Card>
          )}
        </div>
      </Dialog>
    </section>
  )
}
