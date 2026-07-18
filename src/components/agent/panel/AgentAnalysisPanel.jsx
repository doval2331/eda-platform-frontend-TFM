import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { AgentLlmHero, LlmModeChip, SparkleIcon } from '@/components/LlmVisual'
import { Button, Card, Feedback, LoadingPanel, LoadingSlot } from '@/ui'
import { INSIGHT_PAGE_SIZE } from '../shared/InsightListPagination'
import { AgentPhaseSteps } from '../shared/AgentPhaseSteps'
import { InsightStepList } from '../insights/InsightStepList'
import { InsightsActionCard } from '../insights/InsightsActionCard'
import { StrategyActionCard } from '../strategy/StrategyActionCard'
import { StrategyReferenceSection } from '../strategy/StrategyReferenceSection'
import { StrategyStepList } from '../strategy/StrategyStepList'
import { AgentNextStepHint } from './AgentNextStepHint'
import { useAgentAnalysisPanel } from './useAgentAnalysisPanel'
import '@/styles/llm-visual.css'

function useEstimatedProgress(active) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!active) return undefined

    const startedAt = Date.now()
    const resetTimer = window.setTimeout(() => setProgress(8), 0)
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const elapsed = Date.now() - startedAt
        const curvedProgress = 92 - 84 * Math.exp(-elapsed / 18000)
        const step = current < 55 ? 4 : current < 78 ? 2 : 1
        return Math.min(92, Math.max(current + step, Math.round(curvedProgress)))
      })
    }, 900)

    return () => {
      window.clearTimeout(resetTimer)
      window.clearInterval(interval)
    }
  }, [active])

  return active ? progress : 0
}

function AgentProgressLoading({ title, description, progress }) {
  const boundedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className="analysis-progress-panel agent-progress-panel">
      <LoadingPanel
        bare
        compact
        spinnerSize={64}
        variant="llm"
        title={title}
        description={description}
      />
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
      <p className="agent-progress-panel__hint">
        El agente esta procesando muestras y generando interpretaciones. El cierre real depende de
        la respuesta del backend.
      </p>
    </div>
  )
}

export function AgentAnalysisPanel({ run, onOpenChatWithPrompt, enabled = true }) {
  const runId = run?.id
  const panel = useAgentAnalysisPanel(runId, onOpenChatWithPrompt, { enabled })
  const strategyProgress = useEstimatedProgress(panel.strategyLoading)
  const interpretationProgress = useEstimatedProgress(panel.interpretationLoading)

  if (!runId) {
    return (
      <section className="agent-panel agent-panel--empty">
        <p>Ejecuta el pipeline para habilitar el análisis asistido por agentes.</p>
      </section>
    )
  }

  const {
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
    setInsightFilter,
    insightPage,
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
  } = panel

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
            <Button type="button" variant="primary" className="btn-sm" disabled={busy} onClick={onRunStrategy}>
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
            <Button type="button" variant="secondary" className="btn-sm" disabled={busy} onClick={onRunStrategy}>
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
          <AgentProgressLoading
            bare
            compact
            spinnerSize={64}
            variant="llm"
            title="Generando estrategia…"
            description="Consultando Azure AI y definiendo variables."
            progress={strategyProgress}
          />
        </LoadingSlot>
      ) : interpretationLoading ? (
        <LoadingSlot variant="panel">
          <AgentProgressLoading
            bare
            compact
            spinnerSize={64}
            variant="llm"
            title="Interpretando clusters…"
            description="Generando insights por grupo con Azure AI."
            progress={interpretationProgress}
          />
        </LoadingSlot>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && !hasStrategy && !hasInsights ? (
        <Card className="agent-panel-empty">
          Todavia no hay analisis asistido para esta ejecucion. Pulsa «Sugerir estrategia» para empezar.
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

AgentAnalysisPanel.propTypes = {
  run: PropTypes.shape({
    id: PropTypes.string,
  }),
  onOpenChatWithPrompt: PropTypes.func,
  enabled: PropTypes.bool,
}

AgentProgressLoading.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  progress: PropTypes.number.isRequired,
}
