import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createProject,
  fetchProject,
  removeProjectSource,
  updateProject,
  uploadProjectSource,
} from '../api/projects'
import { Button, Dialog, Feedback, Input, Select } from '../ui'
import InputUi from '../ui/Input'
import { MODALITY_OPTIONS, REDUCTION_OPTIONS } from '../utils/businessLabels'
import {
  ACTIVE_PROJECT_KEY,
  CSV_SOURCE_SLOTS,
  PROJECT_STRATEGY_OPTIONS,
  TEXT_SOURCE_SLOTS,
  sourceTypeLabel,
  strategyLabel,
} from '../utils/projectLabels'

function SourceSlotRow({ slot, source, uploading, onUpload, onRemove }) {
  const inputId = `source-${slot.type}`

  return (
    <div className={`project-source-row ${source ? 'project-source-row--ready' : ''}`}>
      <div className="project-source-row-head">
        <strong>{slot.label}</strong>
        {slot.required ? <span className="project-source-badge">Recomendado</span> : null}
      </div>
      <p className="field-help">{slot.helper}</p>
      {source ? (
        <div className="project-source-meta note">
          <span>
            <strong>{source.filename}</strong>
            {source.n_rows != null ? ` · ${source.n_rows} filas` : null}
            {source.char_count != null ? ` · ${source.char_count} caracteres` : null}
          </span>
          <button type="button" className="project-source-remove" onClick={() => onRemove(source)}>
            Quitar
          </button>
        </div>
      ) : (
        <label className="field field--full" htmlFor={inputId}>
          <input
            id={inputId}
            type="file"
            accept={slot.accept ?? '.csv'}
            disabled={uploading}
            className="file-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(slot.type, file)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

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
  advancedMode,
  onAdvancedModeChange,
  canExecute,
  ejecutando,
  error,
  apiOnline,
  onAnalyze,
  projectRuns = [],
  selectedRunIndex = 0,
  onSelectProjectRun,
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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [strategy, setStrategy] = useState('per_source')
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingType, setUploadingType] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [saving, setSaving] = useState(false)

  const sourcesByType = useMemo(() => {
    const map = new Map()
    for (const source of project?.sources ?? []) {
      map.set(source.source_type, source)
    }
    return map
  }, [project])

  const csvCount = useMemo(
    () =>
      (project?.sources ?? []).filter((s) =>
        ['incidents', 'change_mgmt', 'software', 'hardware'].includes(s.source_type),
      ).length,
    [project],
  )

  const reduccionOptions = useMemo(
    () =>
      REDUCTION_OPTIONS.map(({ value, label }) => ({
        value,
        label: advancedMode ? `${label} (${value})` : label,
      })),
    [advancedMode],
  )

  const descripcionMetodo = useMemo(() => {
    const found = REDUCTION_OPTIONS.find((o) => o.value === metodoReduccion)
    return found?.helper ?? ''
  }, [metodoReduccion])

  const idColumnOptions = useMemo(() => {
    if (!datasetProfile?.all_columns?.length) return []
    return [
      { value: '', label: '(sin identificador)' },
      ...datasetProfile.all_columns.map((c) => ({ value: c, label: c })),
    ]
  }, [datasetProfile])

  const helperModalidad = useMemo(() => {
    if (modalidad === 'tabular') {
      return 'Sube un único CSV donde cada fila sea una incidencia.'
    }
    if (modalidad === 'project') {
      return 'Combina varias fuentes CSV en un escenario multifuente.'
    }
    return 'Dataset de ejemplo con incidencias IT para probar sin subir archivos.'
  }, [modalidad])

  const rowCountHint = useMemo(() => {
    if (modalidad === 'tabular' && datasetProfile?.n_rows) {
      return `las ${datasetProfile.n_rows} incidencias del CSV`
    }
    if (modalidad === 'project' && project?.total_rows) {
      return `las ${project.total_rows} filas del escenario`
    }
    return 'todas las incidencias del dataset'
  }, [modalidad, datasetProfile, project])

  const loadProject = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    setLocalError(null)
    try {
      const detail = await fetchProject(id)
      setProject(detail)
      setName(detail.name)
      setDescription(detail.description ?? '')
      setStrategy(detail.strategy ?? 'per_source')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo cargar el escenario')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setLocalError(null)
    if (projectId) {
      loadProject(projectId)
    } else {
      setProject(null)
      setName('')
      setDescription('')
      setStrategy('per_source')
    }
  }, [open, projectId, loadProject])

  async function ensureProject() {
    if (!name.trim()) {
      throw new Error('Indica un nombre para el escenario.')
    }
    if (project?.id) {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        strategy,
      })
      setProject(updated)
      onProjectSaved?.(updated)
      return updated
    }
    const created = await createProject({
      name: name.trim(),
      description: description.trim(),
      strategy,
    })
    setProject(created)
    localStorage.setItem(ACTIVE_PROJECT_KEY, created.id)
    onProjectSaved?.(created)
    return created
  }

  async function handleUpload(sourceType, file) {
    setLocalError(null)
    setUploadingType(sourceType)
    try {
      if (modalidad !== 'project') {
        onModalidadChange('project')
      }
      const current = await ensureProject()
      const detail = await uploadProjectSource(current.id, sourceType, file)
      setProject(detail)
      onProjectSaved?.(detail)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploadingType(null)
    }
  }

  async function handleRemove(source) {
    if (!project?.id) return
    setLocalError(null)
    setUploadingType(source.source_type)
    try {
      const detail = await removeProjectSource(project.id, source.id)
      setProject(detail)
      onProjectSaved?.(detail)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo quitar la fuente')
    } finally {
      setUploadingType(null)
    }
  }

  async function handleAnalyze() {
    setLocalError(null)
    setSaving(true)
    try {
      if (modalidad === 'tabular') {
        if (!scenarioName.trim()) {
          setLocalError('Indica un nombre para el escenario.')
          return
        }
        if (!datasetProfile?.dataset_id) {
          setLocalError('Sube un CSV antes de analizar.')
          return
        }
      }
      if (modalidad === 'project') {
        if (!name.trim()) {
          setLocalError('Indica un nombre para el escenario.')
          return
        }
        if (csvCount < 1) {
          setLocalError('Sube al menos un CSV antes de analizar.')
          return
        }
        await ensureProject()
      }
      await onAnalyze?.()
      onClose?.()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setSaving(false)
    }
  }

  const displayError = localError || error
  const busy = saving || ejecutando || Boolean(uploadingType) || uploading

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Preparar datos"
      description="Configura el origen, las fuentes del escenario y los parámetros del análisis."
      size="xl"
      disableBackdropClose={busy}
      footer={
        <div className="project-dialog-footer">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleAnalyze}
            disabled={!canExecute || busy}
            className="btn-analyze"
          >
            {ejecutando || saving ? 'Analizando incidencias…' : 'Analizar incidencias'}
          </Button>
        </div>
      }
    >
      <div className="prepare-data-dialog">
        <Select
          label="Origen de los datos"
          id="modalidad-dialog"
          value={modalidad}
          onChange={(e) => onModalidadChange(e.target.value)}
          options={MODALITY_OPTIONS}
          helperText={helperModalidad}
        />

        {modalidad === 'tabular' ? (
          <section className="prepare-data-section">
            <h3 className="project-section-title">Escenario con un solo dataset</h3>
            <Input
              label="Nombre del escenario"
              id="tabular-scenario-name"
              value={scenarioName}
              onChange={(e) => onScenarioNameChange?.(e.target.value)}
              helperText="Ej.: Escenario 002 — Incidencias portfolio Q1"
            />
            <label className="field field--full">
              <span className="field-label">Descripción (opcional)</span>
              <textarea
                className="project-description-input"
                rows={2}
                value={scenarioDescription}
                onChange={(e) => onScenarioDescriptionChange?.(e.target.value)}
                placeholder="Contexto breve del análisis con un único CSV."
              />
            </label>

            <h4 className="project-subsection-title">Archivo CSV</h4>
            <label className="field field--full">
              <span className="field-label">Incidencias (un solo dataset)</span>
              <input
                type="file"
                accept=".csv"
                disabled={uploading}
                className="file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onDatasetFileChange?.(file)
                  e.target.value = ''
                }}
              />
              <p className="field-help">
                Solo formato CSV (máx. 50 MB). Si tienes Excel, exporta como «CSV UTF-8».
              </p>
            </label>
            {uploading ? <p className="note">Analizando columnas del archivo…</p> : null}
            {uploadError ? <Feedback variant="danger" message={uploadError} /> : null}
            {datasetProfile ? (
              <div className="dataset-profile note">
                <div className="project-source-meta">
                  <span>
                    <strong>{datasetProfile.filename}</strong>
                    {' '}
                    — {datasetProfile.n_rows} incidencias ·{' '}
                    {datasetProfile.numeric_columns.length} columnas numéricas ·{' '}
                    {datasetProfile.categorical_columns.length} categóricas
                  </span>
                  <button
                    type="button"
                    className="project-source-remove"
                    onClick={() => onClearDataset?.()}
                  >
                    Quitar
                  </button>
                </div>
                {datasetProfile.excluded_columns?.length ? (
                  <p className="dataset-profile-excluded">
                    No se usan para agrupar:{' '}
                    {datasetProfile.excluded_columns.slice(0, 6).join(', ')}
                    {datasetProfile.excluded_columns.length > 6 ? '…' : ''}
                  </p>
                ) : null}
              </div>
            ) : null}
            {datasetProfile ? (
              <Select
                label="Identificador de incidencia (opcional)"
                id="id-column-dialog"
                value={idColumn}
                onChange={(e) => onIdColumnChange?.(e.target.value)}
                options={idColumnOptions}
                helperText="Aparece al pasar el cursor sobre cada punto del mapa."
              />
            ) : null}

            {scenarioName.trim() && datasetProfile ? (
              <div className="project-summary-card note">
                <p>
                  <strong>{scenarioName.trim()}</strong>
                  {scenarioDescription.trim() ? ` — ${scenarioDescription.trim()}` : ''}
                </p>
                <p>
                  1 fuente CSV · {datasetProfile.n_rows} filas · {datasetProfile.filename}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {modalidad === 'project' ? (
          <section className="prepare-data-section">
            <h3 className="project-section-title">Escenario multifuente</h3>
            {loading ? <p className="note">Cargando escenario…</p> : null}
            <Input
              label="Nombre del escenario"
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Ej.: Escenario 001 — Incidencias Q1"
            />
            <label className="field field--full">
              <span className="field-label">Descripción (opcional)</span>
              <textarea
                className="project-description-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto breve para la defensa o la sesión de trabajo."
              />
            </label>

            <h4 className="project-subsection-title">Fuentes CSV</h4>
            <div className="project-source-list">
              {CSV_SOURCE_SLOTS.map((slot) => (
                <SourceSlotRow
                  key={slot.type}
                  slot={slot}
                  source={sourcesByType.get(slot.type)}
                  uploading={uploadingType === slot.type}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <h4 className="project-subsection-title">Contexto opcional</h4>
            <div className="project-source-list">
              {TEXT_SOURCE_SLOTS.map((slot) => (
                <SourceSlotRow
                  key={slot.type}
                  slot={slot}
                  source={sourcesByType.get(slot.type)}
                  uploading={uploadingType === slot.type}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <Select
              label="Estrategia de análisis"
              id="project-strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              options={PROJECT_STRATEGY_OPTIONS.map(({ value, label }) => ({ value, label }))}
              helperText={
                PROJECT_STRATEGY_OPTIONS.find((o) => o.value === strategy)?.helper ?? ''
              }
            />

            {project?.name ? (
              <div className="project-summary-card note">
                <p>
                  <strong>{project.name}</strong> · {strategyLabel(strategy)}
                </p>
                <p>
                  {csvCount} fuente{csvCount === 1 ? '' : 's'} CSV · {project.total_rows ?? 0}{' '}
                  filas
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="prepare-data-section">
          <h3 className="project-section-title">Parámetros del análisis</h3>

          {!advancedMode ? (
            <Select
              label="Tipo de vista del mapa"
              id="reduccion-dialog"
              value={metodoReduccion}
              onChange={(e) => onMetodoReduccionChange(e.target.value)}
              options={reduccionOptions}
              helperText={descripcionMetodo}
            />
          ) : null}

          <div className="advanced-options">
            <button
              type="button"
              className="advanced-options-toggle"
              onClick={() => onAdvancedModeChange(!advancedMode)}
              aria-expanded={advancedMode}
            >
              {advancedMode ? '▾ Ocultar opciones avanzadas' : '▸ Opciones avanzadas (analistas)'}
            </button>

            {advancedMode ? (
              <div className="advanced-options-panel">
                <Select
                  label="Algoritmo de proyección"
                  id="reduccion-advanced-dialog"
                  value={metodoReduccion}
                  onChange={(e) => onMetodoReduccionChange(e.target.value)}
                  options={reduccionOptions}
                  helperText={descripcionMetodo}
                />
                <InputUi
                  label="Semilla (reproducibilidad)"
                  id="seed-dialog"
                  type="number"
                  min={0}
                  value={seed}
                  onChange={(e) => onSeedChange(e.target.value)}
                  helperText="Misma semilla → mismos resultados al repetir el análisis."
                />
                <InputUi
                  label="Número de incidencias a analizar"
                  id="n-samples-dialog"
                  type="number"
                  min={30}
                  max={10000}
                  value={nSamples}
                  onChange={(e) => onNSamplesChange(e.target.value)}
                  helperText="Límite manual (máx. 10 000). Sin opciones avanzadas se analizan todas."
                />
              </div>
            ) : (
              <p className="field-help">
                Sin opciones avanzadas se analizan {rowCountHint}.
              </p>
            )}
          </div>
        </section>

        {ejecutando ? (
          <Feedback
            variant="info"
            message="Ejecutando reducción dimensional y clustering. Con UMAP/HDBSCAN puede tardar cerca de un minuto."
          />
        ) : null}
        {apiOnline === false ? (
          <Feedback
            variant="warning"
            message="No pude confirmar el health check del backend. Revisa que FastAPI esté en 127.0.0.1:8000."
          />
        ) : null}
        {displayError && !uploadError ? (
          <Feedback variant="danger" message={displayError} />
        ) : null}

        {projectRuns.length > 1 ? (
          <div className="project-runs-picker">
            <label className="field" htmlFor="project-run-select-dialog">
              <span className="field-label">Última ejecución — fuente analizada</span>
              <select
                id="project-run-select-dialog"
                className="field-input"
                value={selectedRunIndex}
                onChange={(e) => onSelectProjectRun?.(Number(e.target.value))}
              >
                {projectRuns.map((run, index) => (
                  <option key={run.id} value={index}>
                    {sourceTypeLabel(run.source_type)} — {run.n_samples} incidencias
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
