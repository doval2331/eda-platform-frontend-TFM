import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/app.css'
import { Scatter2D } from '../Scatter2D'
import { uploadDataset } from '../api/datasets'
import { executePipeline, checkApiHealth } from '../api/pipeline'
import { ClusterInterpretationPanel } from '../components/ClusterInterpretationPanel'
import { FloatingChatWidget } from '../components/chat'
import { RunKpis } from '../components/RunKpis'
import { PageNavbar, Button, Card, Feedback, Select } from '../ui'
import Input from '../ui/Input'
import { MODALITY_OPTIONS, REDUCTION_OPTIONS } from '../utils/businessLabels'

const ONBOARDING_KEY = 'eda-dashboard-onboarding-dismissed'

export function DashboardPage() {
  const [modalidad, setModalidad] = useState('it_ops')
  const [metodoReduccion, setMetodoReduccion] = useState('UMAP')
  const [seed, setSeed] = useState('42')
  const [nSamples, setNSamples] = useState('2000')
  const [datasetProfile, setDatasetProfile] = useState(null)
  const [idColumn, setIdColumn] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [lastRun, setLastRun] = useState(null)
  const [error, setError] = useState(null)
  const [apiOnline, setApiOnline] = useState(null)
  const [resultView, setResultView] = useState('interpretation')
  const [advancedMode, setAdvancedMode] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== '1',
  )

  useEffect(() => {
    checkApiHealth()
      .then(setApiOnline)
      .catch(() => setApiOnline(false))
  }, [])

  useEffect(() => {
    if (modalidad !== 'tabular') {
      setDatasetProfile(null)
      setIdColumn('')
      setUploadError(null)
    }
  }, [modalidad])

  useEffect(() => {
    if (datasetProfile?.suggested_id_column) {
      setIdColumn(datasetProfile.suggested_id_column)
    }
    if (datasetProfile?.n_rows) {
      const suggested = Math.min(2000, datasetProfile.n_rows)
      setNSamples(String(suggested))
    }
  }, [datasetProfile])

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

  const helperModalidad = useMemo(() => {
    if (modalidad === 'tabular') {
      return 'Sube un CSV donde cada fila sea una incidencia. El sistema detecta columnas numéricas y categóricas automáticamente.'
    }
    if (modalidad === 'it_ops') {
      return 'Dataset de ejemplo con incidencias IT para probar la herramienta sin subir archivos.'
    }
    return 'Demos sintéticas para pruebas internas.'
  }, [modalidad])

  const idColumnOptions = useMemo(() => {
    if (!datasetProfile?.all_columns?.length) return []
    return [
      { value: '', label: '(sin identificador)' },
      ...datasetProfile.all_columns.map((c) => ({ value: c, label: c })),
    ]
  }, [datasetProfile])

  const canExecute =
    apiOnline === true &&
    !ejecutando &&
    (modalidad !== 'tabular' || datasetProfile?.dataset_id)

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    setDatasetProfile(null)
    setResultado(null)
    setLastRun(null)
    try {
      const profile = await uploadDataset(file)
      setDatasetProfile(profile)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir el CSV')
      setDatasetProfile(null)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function ejecutarPipeline() {
    setEjecutando(true)
    setError(null)

    const seedNum = Number.parseInt(seed, 10) || 42
    let nSamplesNum = Number.parseInt(nSamples, 10)
    if (modalidad === 'texto' || modalidad === 'imagen' || modalidad === 'multimodal') {
      nSamplesNum = 220
    } else if (!Number.isFinite(nSamplesNum) || nSamplesNum < 30) {
      nSamplesNum = modalidad === 'it_ops' ? 2000 : 500
    }
    if (datasetProfile?.n_rows) {
      nSamplesNum = Math.min(nSamplesNum, datasetProfile.n_rows)
    }

    try {
      const { run, result } = await executePipeline({
        modality: modalidad,
        reductionMethod: metodoReduccion,
        seed: seedNum,
        nSamples: nSamplesNum,
        datasetId: modalidad === 'tabular' ? datasetProfile?.dataset_id : undefined,
        idColumn: modalidad === 'tabular' && idColumn ? idColumn : undefined,
      })
      setResultado(result)
      setLastRun(run)
      setResultView('interpretation')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar las incidencias')
      setResultado(null)
      setLastRun(null)
    } finally {
      setEjecutando(false)
    }
  }

  return (
    <div className="dashboard-page">
      <PageNavbar
        breadcrumbParent="Plataforma"
        breadcrumbCurrent="Incidencias IT"
        title="Análisis de incidencias IT"
      />

      {showOnboarding ? (
        <div className="onboarding-banner" role="region" aria-label="Guía rápida">
          <div className="onboarding-banner-body">
            <h2>¿Qué hace esta herramienta?</h2>
            <ol className="onboarding-steps">
              <li>Lee tus incidencias (tiempo de resolución, SLA, categoría, etc.).</li>
              <li>Agrupa automáticamente las que se comportan de forma similar.</li>
              <li>Te indica qué grupos son más críticos y qué conviene revisar.</li>
            </ol>
            <p className="note">
              No necesitas conocer términos como UMAP o clustering: el resumen por grupos y el
              chat te orientan en lenguaje de negocio.
            </p>
          </div>
          <button type="button" className="onboarding-dismiss" onClick={dismissOnboarding}>
            Entendido
          </button>
        </div>
      ) : null}

      <RunKpis result={resultado} runMeta={lastRun} advancedMode={advancedMode} />

      <div className="app-main">
        <Card className="panel-config">
          <h2>1. Preparar datos</h2>

          <Select
            label="Origen de los datos"
            id="modalidad"
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            options={MODALITY_OPTIONS}
            helperText={helperModalidad}
          />

          {modalidad === 'tabular' ? (
            <div className="dataset-upload-block">
              <label className="field field--full">
                <span className="field-label">Archivo CSV de incidencias</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFileChange}
                  disabled={uploading}
                  className="file-input"
                />
              </label>
              {uploading ? <p className="note">Analizando columnas del archivo…</p> : null}
              {uploadError ? <Feedback variant="danger" message={uploadError} /> : null}
              {datasetProfile ? (
                <div className="dataset-profile note">
                  <strong>{datasetProfile.filename}</strong>
                  <span>
                    {' '}
                    — {datasetProfile.n_rows} incidencias · {datasetProfile.numeric_columns.length}{' '}
                    columnas numéricas · {datasetProfile.categorical_columns.length} categóricas
                  </span>
                  {datasetProfile.excluded_columns?.length ? (
                    <p className="dataset-profile-excluded">
                      No se usan para agrupar (texto, IDs o evaluación):{' '}
                      {datasetProfile.excluded_columns.slice(0, 6).join(', ')}
                      {datasetProfile.excluded_columns.length > 6 ? '…' : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {datasetProfile ? (
                <Select
                  label="Identificador de incidencia (opcional)"
                  id="id-column"
                  value={idColumn}
                  onChange={(e) => setIdColumn(e.target.value)}
                  options={idColumnOptions}
                  helperText="Aparece al pasar el cursor sobre cada punto del mapa."
                />
              ) : null}
            </div>
          ) : null}

          {!advancedMode ? (
            <Select
              label="Tipo de vista del mapa"
              id="reduccion"
              value={metodoReduccion}
              onChange={(e) => setMetodoReduccion(e.target.value)}
              options={reduccionOptions}
              helperText={descripcionMetodo}
            />
          ) : null}

          <div className="advanced-options">
            <button
              type="button"
              className="advanced-options-toggle"
              onClick={() => setAdvancedMode((v) => !v)}
              aria-expanded={advancedMode}
            >
              {advancedMode ? '▾ Ocultar opciones avanzadas' : '▸ Opciones avanzadas (analistas)'}
            </button>

            {advancedMode ? (
              <div className="advanced-options-panel">
                <Select
                  label="Algoritmo de proyección"
                  id="reduccion-advanced"
                  value={metodoReduccion}
                  onChange={(e) => setMetodoReduccion(e.target.value)}
                  options={reduccionOptions}
                  helperText={descripcionMetodo}
                />

                {modalidad !== 'texto' &&
                modalidad !== 'imagen' &&
                modalidad !== 'multimodal' ? (
                  <>
                    <Input
                      label="Semilla (reproducibilidad)"
                      id="seed"
                      type="number"
                      min={0}
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      helperText="Misma semilla → mismos resultados al repetir el análisis."
                    />
                    <Input
                      label="Número de incidencias a analizar"
                      id="n-samples"
                      type="number"
                      min={30}
                      max={10000}
                      value={nSamples}
                      onChange={(e) => setNSamples(e.target.value)}
                      helperText="Máximo 10 000. Si el CSV es mayor, se toma una muestra aleatoria."
                    />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={ejecutarPipeline}
            disabled={!canExecute}
            className="btn-analyze"
          >
            {ejecutando ? 'Analizando incidencias…' : 'Analizar incidencias'}
          </Button>

          {error ? <Feedback variant="danger" message={error} /> : null}

          {lastRun?.id ? (
            <p className="note run-saved-note">
              Análisis guardado ·{' '}
              <Link to="/historial">Ver historial</Link>
            </p>
          ) : null}
        </Card>

        <Card className="panel-results">
          <h2>2. Resultados</h2>
          <p className="results-intro note">
            Revisa primero el resumen por grupos; el mapa visual muestra cómo se distribuyen las
            incidencias similares.
          </p>
          <div className="results-tabs" role="tablist" aria-label="Vista de resultados">
            <button
              type="button"
              role="tab"
              aria-selected={resultView === 'interpretation'}
              className={`result-tab ${
                resultView === 'interpretation' ? 'result-tab--active' : ''
              }`}
              onClick={() => setResultView('interpretation')}
            >
              Resumen por grupos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={resultView === 'visualization'}
              className={`result-tab ${
                resultView === 'visualization' ? 'result-tab--active' : ''
              }`}
              onClick={() => setResultView('visualization')}
            >
              Mapa visual
            </button>
          </div>

          <div hidden={resultView !== 'interpretation'} className="results-tab-panel">
            <ClusterInterpretationPanel result={resultado} run={lastRun} />
          </div>

          <div hidden={resultView !== 'visualization'} className="results-tab-panel">
            <Scatter2D
              X_2d={resultado?.X_2d}
              clusterLabels={resultado?.cluster_labels}
              metadata={resultado?.metadata}
              loading={ejecutando}
            />

            <p className="legend-note note">
              Cada color representa un grupo de incidencias parecidas. Los marcados en gris son
              casos atípicos. Pasa el cursor sobre un punto para ver el detalle.
            </p>
          </div>
        </Card>
      </div>

      <FloatingChatWidget run={lastRun} />
    </div>
  )
}
