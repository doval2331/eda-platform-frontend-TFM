import { AppTabs, Dialog, Feedback, TabPanel } from '@/ui'
import '@/ui/prepare-data.css'
import { PREPARE_TAB } from './constants'
import { PrepareDialogFooter } from './PrepareDialogFooter'
import { PrepareParamsTab } from './PrepareParamsTab'
import { PrepareOriginTab } from './PrepareOriginTab'
import { PrepareProjectSection } from './PrepareProjectSection'
import { PrepareTabularSection } from './PrepareTabularSection'
import { useProjectPrepareDialog } from './useProjectPrepareDialog'

export function ProjectPrepareDialog({
  open,
  onClose,
  projectId,
  onProjectSaved,
  modalidad,
  onModalidadChange,
  metodoReduccion,
  onMetodoReduccionChange,
  seed,
  onSeedChange,
  nSamples,
  onNSamplesChange,
  pipelineTuning,
  onPipelineTuningChange,
  advancedMode,
  onAdvancedModeChange,
  canExecute,
  ejecutando,
  error,
  apiOnline,
  onAnalyze,
  scenarioName = '',
  onScenarioNameChange,
  scenarioDescription = '',
  onScenarioDescriptionChange,
  datasetProfile = null,
  idColumn = '',
  onIdColumnChange,
  uploading = false,
  uploadError = null,
  onDatasetFileChange,
  onClearDataset,
}) {
  const state = useProjectPrepareDialog({
    open,
    projectId,
    onProjectSaved,
    onClose,
    onAnalyze,
    modalidad,
    onModalidadChange,
    metodoReduccion,
    advancedMode,
    scenarioName,
    datasetProfile,
    error,
    ejecutando,
    uploading,
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Preparar datos"
      description="Configura el escenario y ejecuta el análisis."
      size="xl"
      disableBackdropClose={state.busy}
      footer={
        <PrepareDialogFooter
          activeTab={state.activeTab}
          busy={state.busy}
          isLastTab={state.isLastTab}
          canExecute={canExecute}
          ejecutando={ejecutando}
          saving={state.saving}
          onClose={onClose}
          onPrev={state.goPrevTab}
          onNext={state.goNextTab}
          onAnalyze={state.handleAnalyze}
        />
      }
    >
      <div className="prepare-data-dialog">
        <AppTabs
          value={state.activeTab}
          onChange={state.handleTabChange}
          tabs={state.prepareTabs}
          ariaLabel="Pasos de preparación de datos"
          scrollable
        />

        <div className="prepare-data-dialog__body">
        <TabPanel value={state.activeTab} panelValue={PREPARE_TAB.origin}>
          <PrepareOriginTab modalidad={modalidad} onModalidadChange={onModalidadChange} />
        </TabPanel>

        <TabPanel value={state.activeTab} panelValue={PREPARE_TAB.data} keepMounted>
          {modalidad === 'tabular' ? (
            <PrepareTabularSection
              scenarioName={scenarioName}
              onScenarioNameChange={onScenarioNameChange}
              scenarioDescription={scenarioDescription}
              onScenarioDescriptionChange={onScenarioDescriptionChange}
              uploading={uploading}
              uploadError={uploadError}
              datasetProfile={datasetProfile}
              idColumn={idColumn}
              onIdColumnChange={onIdColumnChange}
              idColumnOptions={state.idColumnOptions}
              sourceFileInputKey={state.sourceFileInputKey}
              onDatasetFileChange={onDatasetFileChange}
              onClearDataset={onClearDataset}
            />
          ) : null}
          {modalidad === 'project' ? (
            <PrepareProjectSection
              loading={state.loading}
              name={state.name}
              onNameChange={state.setName}
              description={state.description}
              onDescriptionChange={state.setDescription}
              strategy={state.strategy}
              onStrategyChange={state.setStrategy}
              newSourceName={state.newSourceName}
              onNewSourceNameChange={state.setNewSourceName}
              newSourceType={state.newSourceType}
              onNewSourceTypeChange={state.setNewSourceType}
              newSourceFiles={state.newSourceFiles}
              sourceFileInputKey={state.sourceFileInputKey}
              onNewSourceFileChange={state.handleNewSourceFileChange}
              uploadProgress={state.uploadProgress}
              uploadingType={state.uploadingType}
              onAddSource={state.handleAddSource}
              project={state.project}
              onRemoveSource={state.handleRemove}
            />
          ) : null}
        </TabPanel>

        <TabPanel value={state.activeTab} panelValue={PREPARE_TAB.params}>
          <PrepareParamsTab
            metodoReduccion={metodoReduccion}
            onMetodoReduccionChange={onMetodoReduccionChange}
            reduccionOptions={state.reduccionOptions}
            descripcionMetodo={state.descripcionMetodo}
            advancedMode={advancedMode}
            onAdvancedModeChange={onAdvancedModeChange}
            seed={seed}
            onSeedChange={onSeedChange}
            nSamples={nSamples}
            onNSamplesChange={onNSamplesChange}
            pipelineTuning={pipelineTuning}
            onPipelineTuningChange={onPipelineTuningChange}
            rowCountHint={state.rowCountHint}
            apiOnline={apiOnline}
          />
        </TabPanel>
        </div>
      </div>
      <Feedback
        open={Boolean(state.displayError && !uploadError)}
        variant="danger"
        message={state.displayError ?? ''}
        position="top-center"
        onClose={() => state.setLocalError(null)}
      />
    </Dialog>
  )
}
