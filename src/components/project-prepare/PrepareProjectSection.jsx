import PropTypes from 'prop-types'
import { useEffect, useMemo } from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import {
  Button,
  FileUploadZone,
  FormSelect,
  LoadingPanel,
  SourceFileCard,
  TextField,
  UploadProgressBar,
} from '@/ui'
import {
  ALL_SOURCE_ACCEPT,
  availableSourceTypeOptions,
  availableStrategyOptions,
  detectedFileFormat,
  strategyDescription,
} from '@/utils/projectLabels'
import { PrepareFormSection } from './PrepareFormSection'
import { AUTO_SOURCE_TYPE } from './constants'
import { buildSourceChips, buildSourceDetail, isTabularSource, relationshipStatusLabel, relationshipStatusTone, sourceStatusLabel } from './helpers'

export function PrepareProjectSection({
  loading,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  strategy,
  onStrategyChange,
  newSourceName,
  onNewSourceNameChange,
  newSourceType,
  onNewSourceTypeChange,
  newSourceFiles,
  sourceFileInputKey,
  onNewSourceFileChange,
  uploadProgress,
  uploadingType,
  onAddSource,
  project,
  onRemoveSource,
}) {
  const selectedFileCount = newSourceFiles.length
  const sourceCount = (project?.sources ?? []).length
  const tabularSourceCount = useMemo(
    () => (project?.sources ?? []).filter((source) => isTabularSource(source)).length,
    [project],
  )
  const strategyOptions = useMemo(
    () =>
      availableStrategyOptions(tabularSourceCount).map(({ value, label }) => ({
        value,
        label,
      })),
    [tabularSourceCount],
  )
  const sourceTypeOptions = useMemo(
    () => availableSourceTypeOptions(project?.sources ?? []),
    [project],
  )
  useEffect(() => {
    if (!sourceTypeOptions.some((option) => option.value === newSourceType)) {
      onNewSourceTypeChange(AUTO_SOURCE_TYPE)
    }
  }, [sourceTypeOptions, newSourceType, onNewSourceTypeChange])
  const uploadingNewSource = uploadingType === 'new-source'

  if (loading) {
    return (
      <div className="prepare-data-loading prepare-data-loading--panel">
        <LoadingPanel
          bare
          compact
          spinnerSize={56}
          title="Cargando escenario…"
          description="Recuperando fuentes y datasets guardados…"
        />
      </div>
    )
  }

  return (
    <Stack spacing={3} className="prepare-data-panel">
      <Typography className="prepare-data-panel__title" component="h3">
        Fuentes del escenario
      </Typography>

      <PrepareFormSection
        title="Escenario"
        description="Nombre y estrategia del análisis multifuente."
      >
        <Box className="prepare-data-form-grid">
          <TextField
            label="Nombre del escenario"
            id="project-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Escenario Q1"
            required
          />
          <FormSelect
            label="Estrategia de análisis"
            id="project-strategy"
            value={strategy}
            onChange={(e) => onStrategyChange(e.target.value)}
            options={strategyOptions}
          />
        </Box>
        {strategyDescription(strategy) ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {strategyDescription(strategy)}
          </Typography>
        ) : null}
        {strategy === 'merged' && tabularSourceCount < 2 ? (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            Añade al menos dos fuentes tabulares para usar el modo unificado multifuente.
          </Typography>
        ) : null}
        <TextField
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          multiline
          minRows={2}
          placeholder="Contexto breve del escenario"
        />
      </PrepareFormSection>

      <PrepareFormSection
        title="Agregar fuente"
        description="Selecciona archivos y pulsa añadir para incorporarlos al escenario."
      >
        {uploadingNewSource ? (
          <div className="prepare-data-loading prepare-data-loading--inline">
            <LoadingPanel
              bare
              compact
              spinnerSize={56}
              title="Cargando dataset…"
              description={
                uploadProgress
                  ? `${uploadProgress.message || 'Procesando archivo…'} ${
                      uploadProgress.filename ? `(${uploadProgress.filename})` : ''
                    }`
                  : 'Subiendo y analizando el archivo…'
              }
            />
            {uploadProgress ? (
              <UploadProgressBar
                current={uploadProgress.current}
                total={uploadProgress.total}
                filename={uploadProgress.filename}
                phase={uploadProgress.phase}
                percent={uploadProgress.percent}
                loadedBytes={uploadProgress.loadedBytes}
                totalBytes={uploadProgress.totalBytes}
              />
            ) : null}
          </div>
        ) : (
          <Box className="prepare-data-upload-panel">
            <Box className="prepare-data-form-grid">
              <TextField
                label="Nombre de la fuente"
                id="new-source-name"
                value={newSourceName}
                onChange={(e) => onNewSourceNameChange(e.target.value)}
                disabled={selectedFileCount > 1}
                placeholder="Registro de incidencias"
                helperText={
                  selectedFileCount > 1
                    ? 'Con varios archivos se usa el nombre de cada fichero.'
                    : undefined
                }
              />
              <FormSelect
                label="Tipo de información"
                id="new-source-type"
                value={newSourceType}
                onChange={(e) => onNewSourceTypeChange(e.target.value)}
                options={sourceTypeOptions}
              />
            </Box>
            <FileUploadZone
              accept={ALL_SOURCE_ACCEPT}
              multiple
              inputKey={sourceFileInputKey}
              helperText="CSV, Excel, JSON, Parquet, TXT, Word, PDF o audio"
              onFilesSelected={onNewSourceFileChange}
            />
            {selectedFileCount ? (
              <Box className="prepare-data-selection-chips">
                {newSourceFiles.map((file) => (
                  <Chip
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    label={`${file.name} · ${detectedFileFormat(file)}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            ) : null}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="primary"
                startIcon="Add"
                onClick={onAddSource}
                disabled={!selectedFileCount}
              >
                {selectedFileCount > 1 ? 'Añadir fuentes' : 'Añadir fuente'}
              </Button>
            </Box>
          </Box>
        )}
      </PrepareFormSection>

      <PrepareFormSection
        title="Fuentes agregadas"
        description={
          sourceCount
            ? `${sourceCount} fuente${sourceCount === 1 ? '' : 's'} lista${sourceCount === 1 ? '' : 's'} para analizar.`
            : 'Las fuentes que subas aparecerán aquí.'
        }
      >
        {sourceCount ? (
          <Stack spacing={1.25} className="prepare-data-source-list">
            {(project?.sources ?? []).map((source) => (
              <SourceFileCard
                key={source.id}
                title={source.source_name || source.filename}
                subtitle={source.filename}
                filename={source.filename}
                originalFormat={source.original_format}
                normalizedKind={source.normalized_kind}
                chips={buildSourceChips(source)}
                statusLabel={
                  relationshipStatusLabel(source.relationship_status) ||
                  sourceStatusLabel(source.processing_status)
                }
                statusTone={
                  source.relationship_status
                    ? relationshipStatusTone(source.relationship_status)
                    : 'success'
                }
                detail={buildSourceDetail(source)}
                removing={uploadingType === source.id}
                onRemove={() => onRemoveSource(source)}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aún no hay archivos en este escenario.
          </Typography>
        )}
      </PrepareFormSection>
    </Stack>
  )
}

PrepareProjectSection.propTypes = {
  loading: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onNameChange: PropTypes.func.isRequired,
  description: PropTypes.string.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
  strategy: PropTypes.string.isRequired,
  onStrategyChange: PropTypes.func.isRequired,
  newSourceName: PropTypes.string.isRequired,
  onNewSourceNameChange: PropTypes.func.isRequired,
  newSourceType: PropTypes.string.isRequired,
  onNewSourceTypeChange: PropTypes.func.isRequired,
  newSourceFiles: PropTypes.array.isRequired,
  sourceFileInputKey: PropTypes.number.isRequired,
  onNewSourceFileChange: PropTypes.func.isRequired,
  uploadProgress: PropTypes.object,
  uploadingType: PropTypes.string,
  onAddSource: PropTypes.func.isRequired,
  project: PropTypes.object,
  onRemoveSource: PropTypes.func.isRequired,
}
