import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Scatter2D } from '@/Scatter2D'
import { useLazyTabs } from '@/hooks/useLazyTabs'
import { AgentAnalysisPanel } from '@/components/agent'
import { ClusterInterpretationPanel } from '@/components/ClusterInterpretationPanel'
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
  onOpenChatWithPrompt,
}) {
  const { isVisited } = useLazyTabs(
    resultado ? resultView : null,
    resultado ? ['interpretation'] : [],
  )

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
          <Button type="button" variant="primary" className="prepare-data-btn" onClick={onOpenPrepare}>
            Preparar datos
          </Button>
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
                <Scatter2D
                  X_2d={resultado?.X_2d}
                  clusterLabels={resultado?.cluster_labels}
                  metadata={resultado?.metadata}
                />
                <p className="legend-note note">
                  Cada color representa un grupo de incidencias parecidas. Los marcados en gris son casos
                  atípicos. Pasa el cursor sobre un punto para ver el detalle.
                </p>
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
  onOpenChatWithPrompt: PropTypes.func.isRequired,
}
