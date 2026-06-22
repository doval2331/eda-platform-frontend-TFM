import PropTypes from 'prop-types'
import { Stack, Typography } from '@mui/material'
import {
  Feedback,
  FileUploadZone,
  FormSelect,
  LoadingPanel,
  SourceFileCard,
  TextField,
} from '@/ui'
import { TABULAR_ACCEPT } from '@/utils/projectLabels'
import {
  detectSourceFileKind,
  formatLabelForKind,
  formatToneForKind,
} from '@/utils/sourceFileVisual'
import { PrepareFormSection } from './PrepareFormSection'
import { formatSpanishNumber } from './helpers'

export function PrepareTabularSection({
  scenarioName,
  onScenarioNameChange,
  scenarioDescription,
  onScenarioDescriptionChange,
  uploading,
  uploadError,
  datasetProfile,
  idColumn,
  onIdColumnChange,
  idColumnOptions,
  sourceFileInputKey,
  onDatasetFileChange,
  onClearDataset,
}) {
  return (
    <Stack spacing={3} className="prepare-data-panel">
      <Typography className="prepare-data-panel__title" component="h3">
        Escenario con un solo dataset
      </Typography>

      <PrepareFormSection title="Identificación" description="Nombre y contexto del escenario.">
        <TextField
          label="Nombre del escenario"
          id="tabular-scenario-name"
          value={scenarioName}
          onChange={(e) => onScenarioNameChange?.(e.target.value)}
          placeholder="Escenario Q1 — Incidencias portfolio"
          required
        />
        <TextField
          label="Descripción (opcional)"
          value={scenarioDescription}
          onChange={(e) => onScenarioDescriptionChange?.(e.target.value)}
          multiline
          minRows={2}
          placeholder="Contexto breve del análisis"
        />
      </PrepareFormSection>

      <PrepareFormSection title="Archivo" description="Un dataset tabular con tus incidencias.">
        {uploading ? (
          <div className="prepare-data-loading">
            <LoadingPanel
              bare
              compact
              spinnerSize={56}
              title="Cargando dataset…"
              description="Analizando columnas del archivo…"
            />
          </div>
        ) : (
          <>
            <FileUploadZone
              accept={TABULAR_ACCEPT}
              disabled={uploading}
              inputKey={`tabular-${sourceFileInputKey}`}
              helperText="CSV, TSV, Excel, JSON o Parquet (máx. 250 MB)"
              onFilesSelected={(files) => {
                const file = files[0]
                if (file) onDatasetFileChange?.(file)
              }}
            />
            {uploadError ? <Feedback variant="danger" message={uploadError} /> : null}
            {datasetProfile ? (
              <SourceFileCard
                title={scenarioName.trim() || datasetProfile.filename}
                subtitle={datasetProfile.filename}
                filename={datasetProfile.filename}
                originalFormat={datasetProfile.original_format}
                normalizedKind={datasetProfile.normalized_kind || 'tabular'}
                chips={(() => {
                  const fileKind = detectSourceFileKind({
                    normalizedKind: datasetProfile.normalized_kind,
                    originalFormat: datasetProfile.original_format,
                    filename: datasetProfile.filename,
                  })
                  return [
                    {
                      label: formatLabelForKind(
                        fileKind,
                        datasetProfile.original_format,
                        datasetProfile.filename,
                      ),
                      tone: formatToneForKind(fileKind),
                    },
                    { label: `${formatSpanishNumber(datasetProfile.n_rows)} filas`, tone: 'neutral' },
                    {
                      label: `${datasetProfile.numeric_columns.length} numéricas`,
                      tone: 'neutral',
                    },
                  ]
                })()}
                statusLabel="Procesada"
                detail={
                  datasetProfile.excluded_columns?.length
                    ? `No se usan para agrupar: ${datasetProfile.excluded_columns.slice(0, 8).join(', ')}`
                    : undefined
                }
                onRemove={() => onClearDataset?.()}
              />
            ) : null}
            {datasetProfile ? (
              <FormSelect
                label="Identificador de incidencia (opcional)"
                id="id-column-dialog"
                value={idColumn}
                onChange={(e) => onIdColumnChange?.(e.target.value)}
                options={idColumnOptions}
                helperText="Se muestra al pasar el cursor sobre cada punto del mapa."
              />
            ) : null}
          </>
        )}
      </PrepareFormSection>
    </Stack>
  )
}

PrepareTabularSection.propTypes = {
  scenarioName: PropTypes.string,
  onScenarioNameChange: PropTypes.func,
  scenarioDescription: PropTypes.string,
  onScenarioDescriptionChange: PropTypes.func,
  uploading: PropTypes.bool,
  uploadError: PropTypes.string,
  datasetProfile: PropTypes.object,
  idColumn: PropTypes.string,
  onIdColumnChange: PropTypes.func,
  idColumnOptions: PropTypes.array,
  sourceFileInputKey: PropTypes.number,
  onDatasetFileChange: PropTypes.func,
  onClearDataset: PropTypes.func,
}
