import PropTypes from 'prop-types'
import '@/styles/app.css'
import { AnalysisFlowStrip, MetabaseFlowCTA } from '@/components/bi'
import { FloatingChatWidget } from '@/components/chat'
import { ProjectPrepareDialog } from '@/components/ProjectPrepareDialog'
import { RunKpis } from '@/components/RunKpis'
import { PageNavbar, Feedback, LoadingPanel } from '@/ui'
import { DashboardOnboardingBanner } from './DashboardOnboardingBanner'
import { DashboardResultsPanel } from './DashboardResultsPanel'
import { useDashboardPage } from './useDashboardPage'

export function DashboardPage({
  embedded = false,
  flowStepId,
  onRunStateChange,
  isExpert = false,
}) {
  const page = useDashboardPage({ onRunStateChange, isExpert })
  const currentFlowStep =
    flowStepId ?? (page.lastRun?.id && page.resultado ? 'explore' : 'analyze')

  return (
    <div className={`dashboard-page${page.ejecutando ? ' dashboard-page--executing' : ''}`}>
      {!embedded ? (
        <PageNavbar
          breadcrumbParent="Plataforma"
          breadcrumbCurrent="Incidencias IT"
          title="Análisis de incidencias IT"
        />
      ) : null}

      {page.showOnboarding ? <DashboardOnboardingBanner onDismiss={page.dismissOnboarding} /> : null}

      {page.loadingProject && !page.prepareDialogOpen ? (
        <div className="conv-reload-toast" role="status" aria-live="polite">
          <LoadingPanel
            bare
            compact
            spinnerSize={56}
            title="Cargando escenario guardado…"
            description="Recuperando datasets del proyecto…"
          />
        </div>
      ) : null}

      <RunKpis result={page.resultado} runMeta={page.lastRun} advancedMode={page.advancedMode} />

      {!embedded ? (
        <>
          <AnalysisFlowStrip
            currentStepId={currentFlowStep}
            compact={!page.lastRun?.id}
          />
          {page.lastRun?.id && page.resultado ? (
            <MetabaseFlowCTA variant="explore" runId={page.lastRun.id} />
          ) : null}
        </>
      ) : null}

      <DashboardResultsPanel
        resultsPanelRef={page.resultsPanelRef}
        ejecutando={page.ejecutando}
        lastRun={page.lastRun}
        resultado={page.resultado}
        projectRuns={page.projectRuns}
        selectedRunIndex={page.selectedRunIndex}
        analysisProgress={page.analysisProgress}
        analysisStatusMessage={page.analysisStatusMessage}
        resultView={page.resultView}
        activeProjectId={page.activeProject?.id}
        onResultViewChange={page.setResultView}
        onSelectProjectRun={page.handleSelectProjectRun}
        onOpenPrepare={page.openPrepareDialog}
        onOpenAnalysisConfig={page.openAnalysisConfig}
        onOpenChatWithPrompt={page.handleOpenChatWithPrompt}
        analysisConfigOpen={page.analysisConfigOpen}
        onCloseAnalysisConfig={() => page.setAnalysisConfigOpen(false)}
        onRecalculateAnalysis={page.handleRecalculateFromConfig}
        metodoReduccion={page.metodoReduccion}
        onMetodoReduccionChange={page.setMetodoReduccion}
        reduccionOptions={page.reduccionOptions}
        descripcionMetodo={page.descripcionMetodo}
        advancedMode={page.advancedMode}
        isExpert={page.isExpert}
        seed={page.seed}
        onSeedChange={page.setSeed}
        nSamples={page.nSamples}
        onNSamplesChange={page.setNSamples}
        pipelineTuning={page.pipelineTuning}
        onPipelineTuningChange={page.handlePipelineTuningChange}
        rowCountHint={page.rowCountHint}
        reductionRecommendation={page.reductionRecommendation}
        apiOnline={page.apiOnline}
      />

      <ProjectPrepareDialog
        open={page.prepareDialogOpen}
        onClose={page.closePrepareDialog}
        projectId={page.prepareProjectId}
        onProjectSaved={page.handleProjectSaved}
        modalidad={page.modalidad}
        onModalidadChange={page.handleModalidadChange}
        scenarioName={page.scenarioName}
        onScenarioNameChange={page.setScenarioName}
        scenarioDescription={page.scenarioDescription}
        onScenarioDescriptionChange={page.setScenarioDescription}
        datasetProfile={page.datasetProfile}
        idColumn={page.idColumn}
        onIdColumnChange={page.setIdColumn}
        uploading={page.uploading}
        uploadError={page.uploadError}
        onDatasetFileChange={page.onFileChange}
        onClearDataset={page.clearDataset}
        metodoReduccion={page.metodoReduccion}
        onMetodoReduccionChange={page.setMetodoReduccion}
        seed={page.seed}
        onSeedChange={page.setSeed}
        nSamples={page.nSamples}
        onNSamplesChange={page.setNSamples}
        pipelineTuning={page.pipelineTuning}
        onPipelineTuningChange={page.handlePipelineTuningChange}
        advancedMode={page.advancedMode}
        isExpert={page.isExpert}
        canExecute={page.canExecute}
        ejecutando={page.ejecutando}
        error={page.error}
        apiOnline={page.apiOnline}
        onAnalyze={page.ejecutarPipeline}
        reductionRecommendation={page.reductionRecommendation}
      />

      <FloatingChatWidget
        run={page.lastRun}
        forceOpen={page.chatForceOpen}
        externalPrompt={page.chatExternalPrompt}
        onExternalPromptConsumed={page.handleChatPromptConsumed}
      />

      <Feedback
        open={page.ejecutando}
        variant="info"
        title="Analizando incidencias"
        message={page.analysisFeedbackMessage}
        position="top-center"
        onClose={() => {}}
        autoHideDuration={null}
        showCloseButton={false}
        maxWidth="520px"
      />
      <Feedback
        open={Boolean(page.error)}
        variant="danger"
        message={page.error ?? ''}
        position="top-center"
        onClose={() => page.setError(null)}
        maxWidth="520px"
      />
    </div>
  )
}

DashboardPage.propTypes = {
  embedded: PropTypes.bool,
  flowStepId: PropTypes.oneOf(['analyze', 'explore']),
  onRunStateChange: PropTypes.func,
  isExpert: PropTypes.bool,
}
