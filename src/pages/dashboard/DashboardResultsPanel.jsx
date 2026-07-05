import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { useLazyTabs } from '@/hooks/useLazyTabs'
import { AgentAnalysisPanel } from '@/components/agent'
import { ClusterInterpretationPanel } from '@/components/ClusterInterpretationPanel'
import { AnalysisConfigDrawer } from '@/components/dashboard/AnalysisConfigDrawer'
import { ExploreVisualizationPanel } from '@/components/dashboard/ExploreVisualizationPanel'
import { Button, Card, Feedback, LoadingSlot, ResultsTabs } from '@/ui'
import { sourceTypeLabel } from '@/utils/projectLabels'
import { AnalysisProgressPanel } from './AnalysisProgressPanel'

export function DashboardResultsPanel({
  resultsPanelRef,
  ejecutando,
  lastRun,
  resultado,
  projectRuns,
  selectedRunIndex,
  analysisProgress,
  analysisStatusMessage,
  resultView,
  activeProjectId,
  onResultViewChange,
  onSelectProjectRun,
  onOpenPrepare,
  onOpenAnalysisConfig,
  onOpenChatWithPrompt,
  analysisConfigOpen,
  onCloseAnalysisConfig,
  onRecalculateAnalysis,
  metodoReduccion,
  onMetodoReduccionChange,
  reduccionOptions,
  descripcionMetodo,
  advancedMode,
  isExpert = false,
  seed,
  onSeedChange,
  nSamples,
  onNSamplesChange,
  pipelineTuning,
  onPipelineTuningChange,
  rowCountHint,
  reductionRecommendation,
  apiOnline,
}) {
  const { isVisited } = useLazyTabs(
    resultado ? resultView : null,
    resultado ? ['interpretation', 'visualization'] : [],
  )
  const nClusters = resultado?.metrics?.n_clusters ?? lastRun?.metrics?.n_clusters ?? 0
  const datasetId = lastRun?.dataset_id ?? null

  return (
    <div className="app-main app-main--results-only" ref={resultsPanelRef}>
      <Card className={`panel-results${ejecutando ? ' panel-results--loading' : ''}`}>
        <div className="panel-results-head">
          <div className="panel-results-head-main">
            <h2>Resultados</h2>
            {lastRun?.id ? (
              <p className="note run-saved-note">
                Análisis guardado
                {lastRun.project_name ? ` · ${lastRun.project_name}` : ''}
                {lastRun.source_name
                  ? ` · ${lastRun.source_name}`
                  : lastRun.source_type
                    ? ` · ${sourceTypeLabel(lastRun.source_type)}`
                    : ''}{' '}
                · <Link to="/historial">Ver historial</Link>
              </p>
            ) : null}
          </div>
          <div className="panel-results-head-actions">
            {resultado && isExpert ? (
              <Button
                type="button"
                variant="secondary"
                className="analysis-config-btn"
                onClick={onOpenAnalysisConfig}
                disabled={ejecutando}
              >
                Configuración del análisis
              </Button>
            ) : null}
            <Button type="button" variant="primary" className="prepare-data-btn" onClick={onOpenPrepare}>
              Preparar datos
            </Button>
          </div>
        </div>

        {projectRuns.length > 1 ? (
          <label className="field project-runs-picker" htmlFor="project-run-select-main">
            <span className="field-label">Fuente analizada</span>
            <select
              id="project-run-select-main"
              className="field-input"
              value={selectedRunIndex}
              onChange={(e) => onSelectProjectRun(Number(e.target.value))}
            >
              {projectRuns.map((run, index) => (
                <option key={run.id} value={index}>
                  {run.source_name || sourceTypeLabel(run.source_type)} — {run.n_samples} incidencias
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <ResultsTabs value={resultView} onChange={onResultViewChange} showAgentsTab={Boolean(lastRun?.id)} />

        {ejecutando ? (
          <LoadingSlot variant="chart">
            <AnalysisProgressPanel
              progress={analysisProgress}
              statusMessage={analysisStatusMessage}
            />
          </LoadingSlot>
        ) : (
          <>
            {!resultado ? (
              <Feedback
                variant="info"
                message="Pulsa «Preparar datos» para configurar el escenario y ejecutar el análisis."
              />
            ) : null}

            {isVisited('interpretation') ? (
              <div hidden={resultView !== 'interpretation'} className="results-tab-panel">
                <ClusterInterpretationPanel result={resultado} run={lastRun} />
              </div>
            ) : null}

            {isVisited('visualization') ? (
              <div hidden={resultView !== 'visualization'} className="results-tab-panel">
                <ExploreVisualizationPanel
                  resultado={resultado}
                  lastRun={lastRun}
                  datasetId={datasetId}
                  nClusters={nClusters}
                  isExpert={isExpert}
                />
              </div>
            ) : null}

            {isVisited('agents') ? (
              <div hidden={resultView !== 'agents'} className="results-tab-panel">
                <AgentAnalysisPanel
                  run={lastRun}
                  projectId={activeProjectId}
                  enabled={resultView === 'agents'}
                  onOpenChatWithPrompt={onOpenChatWithPrompt}
                />
              </div>
            ) : null}
          </>
        )}
      </Card>

      {isExpert ? (
        <AnalysisConfigDrawer
          open={analysisConfigOpen}
          onClose={onCloseAnalysisConfig}
          metodoReduccion={metodoReduccion}
          onMetodoReduccionChange={onMetodoReduccionChange}
          reduccionOptions={reduccionOptions}
          descripcionMetodo={descripcionMetodo}
          advancedMode={advancedMode}
          seed={seed}
          onSeedChange={onSeedChange}
          nSamples={nSamples}
          onNSamplesChange={onNSamplesChange}
          pipelineTuning={pipelineTuning}
          onPipelineTuningChange={onPipelineTuningChange}
          rowCountHint={rowCountHint}
          reductionRecommendation={reductionRecommendation}
          apiOnline={apiOnline}
          ejecutando={ejecutando}
          onApply={onRecalculateAnalysis}
        />
      ) : null}
    </div>
  )
}

DashboardResultsPanel.propTypes = {
  resultsPanelRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  ejecutando: PropTypes.bool,
  lastRun: PropTypes.object,
  resultado: PropTypes.object,
  projectRuns: PropTypes.array,
  selectedRunIndex: PropTypes.number,
  analysisProgress: PropTypes.object,
  analysisStatusMessage: PropTypes.string,
  resultView: PropTypes.string,
  activeProjectId: PropTypes.string,
  onResultViewChange: PropTypes.func.isRequired,
  onSelectProjectRun: PropTypes.func.isRequired,
  onOpenPrepare: PropTypes.func.isRequired,
  onOpenAnalysisConfig: PropTypes.func,
  onOpenChatWithPrompt: PropTypes.func.isRequired,
  analysisConfigOpen: PropTypes.bool,
  onCloseAnalysisConfig: PropTypes.func,
  onRecalculateAnalysis: PropTypes.func,
  metodoReduccion: PropTypes.string,
  onMetodoReduccionChange: PropTypes.func,
  reduccionOptions: PropTypes.array,
  descripcionMetodo: PropTypes.string,
  advancedMode: PropTypes.bool,
  isExpert: PropTypes.bool,
  seed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSeedChange: PropTypes.func,
  nSamples: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onNSamplesChange: PropTypes.func,
  pipelineTuning: PropTypes.object,
  onPipelineTuningChange: PropTypes.func,
  rowCountHint: PropTypes.string,
  reductionRecommendation: PropTypes.object,
  apiOnline: PropTypes.bool,
}
