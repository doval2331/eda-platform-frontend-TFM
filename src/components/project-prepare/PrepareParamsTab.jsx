import PropTypes from 'prop-types'
import { Collapse, Stack, Typography } from '@mui/material'
import { Button, Feedback, FormSelect, TextField } from '@/ui'
import { PrepareFormSection } from './PrepareFormSection'

export function PrepareParamsTab({
  metodoReduccion,
  onMetodoReduccionChange,
  reduccionOptions,
  descripcionMetodo,
  advancedMode,
  onAdvancedModeChange,
  seed,
  onSeedChange,
  nSamples,
  onNSamplesChange,
  pipelineTuning = {},
  onPipelineTuningChange,
  rowCountHint,
  apiOnline,
}) {
  return (
    <Stack spacing={3} className="prepare-data-panel">
      <Typography className="prepare-data-panel__title" component="h3">
        Parámetros del análisis
      </Typography>

      <PrepareFormSection
        title="Visualización"
        description="Cómo se proyectan los clusters en el mapa."
      >
        <FormSelect
          label="Tipo de vista del mapa"
          id="reduccion-dialog"
          value={metodoReduccion}
          onChange={(e) => onMetodoReduccionChange(e.target.value)}
          options={reduccionOptions}
          helperText={descripcionMetodo}
        />
        {!advancedMode ? (
          <Typography variant="caption" color="text.secondary" display="block">
            Sin opciones avanzadas se analizan {rowCountHint}.
          </Typography>
        ) : null}
      </PrepareFormSection>

      <PrepareFormSection title="Opciones avanzadas" description="Solo para analistas.">
        <Button
          type="button"
          variant="text"
          size="small"
          onClick={() => onAdvancedModeChange(!advancedMode)}
          sx={{ alignSelf: 'flex-start', px: 0, mt: -0.5 }}
        >
          {advancedMode ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
        </Button>
        <Collapse in={advancedMode}>
          <Stack spacing={2}>
            <FormSelect
              label="Algoritmo de proyección"
              id="reduccion-advanced-dialog"
              value={metodoReduccion}
              onChange={(e) => onMetodoReduccionChange(e.target.value)}
              options={reduccionOptions}
              helperText={descripcionMetodo}
            />
            <div className="prepare-data-form-grid">
              <TextField
                label="Semilla (reproducibilidad)"
                id="seed-dialog"
                type="number"
                value={seed}
                onChange={(e) => onSeedChange(e.target.value)}
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Incidencias a analizar"
                id="n-samples-dialog"
                type="number"
                value={nSamples}
                onChange={(e) => onNSamplesChange(e.target.value)}
                placeholder="Todas"
                inputProps={{ min: 30, max: 10000 }}
                helperText="Vacio analiza todas. Si defines un limite, maximo 10 000."
              />
            </div>
            <div className="prepare-data-form-grid">
              <TextField
                label="Vecinos UMAP"
                id="umap-neighbors-dialog"
                type="number"
                value={pipelineTuning.umapNNeighbors ?? ''}
                onChange={(e) => onPipelineTuningChange?.('umapNNeighbors', e.target.value)}
                inputProps={{ min: 2, max: 200, step: 1 }}
                helperText="Rango 2-200. Controla el entorno local."
              />
              <TextField
                label="Distancia minima UMAP"
                id="umap-min-dist-dialog"
                type="number"
                value={pipelineTuning.umapMinDist ?? ''}
                onChange={(e) => onPipelineTuningChange?.('umapMinDist', e.target.value)}
                inputProps={{ min: 0, max: 0.99, step: 0.01 }}
                helperText="Rango 0-0.99. Menor valor separa mas los grupos."
              />
              <TextField
                label="Tamano minimo cluster"
                id="hdbscan-min-cluster-size-dialog"
                type="number"
                value={pipelineTuning.hdbscanMinClusterSize ?? ''}
                onChange={(e) => onPipelineTuningChange?.('hdbscanMinClusterSize', e.target.value)}
                inputProps={{ min: 2, max: 5000, step: 1 }}
                helperText="HDBSCAN. Vacio usa el valor automatico."
              />
              <TextField
                label="Muestras minimas HDBSCAN"
                id="hdbscan-min-samples-dialog"
                type="number"
                value={pipelineTuning.hdbscanMinSamples ?? ''}
                onChange={(e) => onPipelineTuningChange?.('hdbscanMinSamples', e.target.value)}
                inputProps={{ min: 1, max: 1000, step: 1 }}
                helperText="Aumentarlo hace el clustering mas conservador."
              />
              <TextField
                label="Eps DBSCAN"
                id="dbscan-eps-dialog"
                type="number"
                value={pipelineTuning.dbscanEps ?? ''}
                onChange={(e) => onPipelineTuningChange?.('dbscanEps', e.target.value)}
                inputProps={{ min: 0.001, max: 10, step: 0.001 }}
                helperText="Solo afecta a la metrica baseline DBSCAN."
              />
            </div>
          </Stack>
        </Collapse>
      </PrepareFormSection>

      {apiOnline === false ? (
        <Feedback variant="warning" message="No se pudo confirmar la conexión con el backend." />
      ) : null}
    </Stack>
  )
}

PrepareParamsTab.propTypes = {
  metodoReduccion: PropTypes.string.isRequired,
  onMetodoReduccionChange: PropTypes.func.isRequired,
  reduccionOptions: PropTypes.array.isRequired,
  descripcionMetodo: PropTypes.string,
  advancedMode: PropTypes.bool.isRequired,
  onAdvancedModeChange: PropTypes.func.isRequired,
  seed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onSeedChange: PropTypes.func.isRequired,
  nSamples: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onNSamplesChange: PropTypes.func.isRequired,
  pipelineTuning: PropTypes.shape({
    umapNNeighbors: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    umapMinDist: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    hdbscanMinClusterSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    hdbscanMinSamples: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    dbscanEps: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onPipelineTuningChange: PropTypes.func,
  rowCountHint: PropTypes.string.isRequired,
  apiOnline: PropTypes.bool,
}
