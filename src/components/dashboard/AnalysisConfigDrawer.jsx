import PropTypes from 'prop-types'
import { Stack, Typography } from '@mui/material'
import { Dialog, Feedback, Button } from '@/ui'
import { PrepareParamsTab } from '@/components/project-prepare/PrepareParamsTab'

export function AnalysisConfigDrawer({
  open,
  onClose,
  metodoReduccion,
  onMetodoReduccionChange,
  reduccionOptions,
  descripcionMetodo,
  advancedMode,
  seed,
  onSeedChange,
  nSamples,
  onNSamplesChange,
  pipelineTuning,
  onPipelineTuningChange,
  rowCountHint,
  reductionRecommendation,
  apiOnline,
  ejecutando,
  onApply,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Configuración del análisis"
      description="Ajusta hiperparámetros y recalcula sin volver al inicio del flujo."
      size="lg"
      disableBackdropClose={ejecutando}
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={ejecutando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onApply} disabled={ejecutando || apiOnline === false}>
            {ejecutando ? 'Recalculando…' : 'Aplicar y recalcular'}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Los cambios generan una nueva ejecución del pipeline con los parámetros indicados.
        </Typography>
        {reductionRecommendation?.warnTsne && metodoReduccion === 't-SNE' ? (
          <Feedback
            variant="warning"
            message="t-SNE puede ser lento o inestable con datasets grandes. Considera UMAP o PCA."
          />
        ) : null}
        <PrepareParamsTab
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
          showAdvancedToggle={false}
        />
      </Stack>
    </Dialog>
  )
}

AnalysisConfigDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  metodoReduccion: PropTypes.string.isRequired,
  onMetodoReduccionChange: PropTypes.func.isRequired,
  reduccionOptions: PropTypes.array.isRequired,
  descripcionMetodo: PropTypes.string,
  advancedMode: PropTypes.bool.isRequired,
  seed: PropTypes.string.isRequired,
  onSeedChange: PropTypes.func.isRequired,
  nSamples: PropTypes.string.isRequired,
  onNSamplesChange: PropTypes.func.isRequired,
  pipelineTuning: PropTypes.object,
  onPipelineTuningChange: PropTypes.func,
  rowCountHint: PropTypes.string,
  reductionRecommendation: PropTypes.object,
  apiOnline: PropTypes.bool,
  ejecutando: PropTypes.bool,
  onApply: PropTypes.func.isRequired,
}
