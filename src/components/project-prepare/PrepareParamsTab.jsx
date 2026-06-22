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
                inputProps={{ min: 30, max: 10000 }}
                helperText="Máx. 10 000. Sin avanzadas se usan todas."
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
  rowCountHint: PropTypes.string.isRequired,
  apiOnline: PropTypes.bool,
}
