import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/app.css'
import { Scatter2D } from '../Scatter2D'
import { uploadDataset } from '../api/datasets'
import { executePipeline, checkApiHealth } from '../api/pipeline'
import { ClusterInterpretationPanel } from '../components/ClusterInterpretationPanel'
import { ConversationPanel } from '../components/ConversationPanel'
import { RunKpis } from '../components/RunKpis'
import { Button, Card, Feedback, SectionHeader, Select } from '../ui'
import Input from '../ui/Input'

const MODALIDADES = [
  { value: 'tabular', label: 'CSV tabular (subir archivo)' },
  { value: 'it_ops', label: 'Operaciones IT (referencia — 10k clientes)' },
  { value: 'texto', label: 'Texto (demo sintético)' },
  { value: 'imagen', label: 'Imagen (demo sintético)' },
  { value: 'multimodal', label: 'Multimodal (demo sintético)' },
]

const REDUCCION = [
  { value: 'PCA', label: 'PCA' },
  { value: 't-SNE', label: 't-SNE' },
  { value: 'UMAP', label: 'UMAP' },
]

export function DashboardPage() {
  const [modalidad, setModalidad] = useState('tabular')
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
  const [resultView, setResultView] = useState('visualization')

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

  const descripcionMetodo = useMemo(() => {
    if (metodoReduccion === 'PCA') {
      return 'Proyección lineal sobre las direcciones de máxima varianza.'
    }
    if (metodoReduccion === 't-SNE') {
      return 'Proyección no lineal optimizada para preservar estructuras locales.'
    }
    return 'Proyección no lineal (UMAP) que preserva estructura local y global.'
  }, [metodoReduccion])

  const helperModalidad = useMemo(() => {
    if (modalidad === 'tabular') {
      return 'Sube un CSV con filas = observaciones y columnas numéricas/categóricas. El sistema infiere tipos automáticamente.'
    }
    if (modalidad === 'it_ops') {
      return 'Dataset de referencia IT Ops en el servidor.'
    }
    return 'Demos sintéticas del backend para texto, imagen o multimodal.'
  }, [modalidad])

  const idColumnOptions = useMemo(() => {
    if (!datasetProfile?.all_columns?.length) return []
    return [
      { value: '', label: '(sin columna ID)' },
      ...datasetProfile.all_columns.map((c) => ({ value: c, label: c })),
    ]
  }, [datasetProfile])

  const canExecute =
    apiOnline !== false &&
    !ejecutando &&
    (modalidad !== 'tabular' || datasetProfile?.dataset_id)

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
      setResultView('visualization')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar el pipeline')
      setResultado(null)
      setLastRun(null)
    } finally {
      setEjecutando(false)
    }
  }

  return (
    <div className="dashboard-page">
      <Card as="header" className="shell-header">
        <SectionHeader
          titleAs="h1"
          eyebrow="Análisis exploratorio"
          title="Reducción de dimensionalidad y clustering"
        
        />
      </Card>

      <div className="app-main">
        <Card className="panel-config">
          <h2>1. Configuración del experimento</h2>

          <Select
            label="Modalidad de los datos"
            id="modalidad"
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            options={MODALIDADES}
            helperText={helperModalidad}
          />

          {modalidad === 'tabular' ? (
            <div className="dataset-upload-block">
              <label className="field field--full">
                <span className="field-label">Archivo CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFileChange}
                  disabled={uploading}
                  className="file-input"
                />
              </label>
              {uploading ? <p className="note">Analizando columnas…</p> : null}
              {uploadError ? <Feedback variant="danger" message={uploadError} /> : null}
              {datasetProfile ? (
                <div className="dataset-profile note">
                  <strong>{datasetProfile.filename}</strong>
                  <span>
                    {' '}
                    — {datasetProfile.n_rows} filas · {datasetProfile.numeric_columns.length}{' '}
                    numéricas · {datasetProfile.categorical_columns.length} categóricas
                  </span>
                  {datasetProfile.excluded_columns?.length ? (
                    <p className="dataset-profile-excluded">
                      Excluidas automáticamente:{' '}
                      {datasetProfile.excluded_columns.slice(0, 6).join(', ')}
                      {datasetProfile.excluded_columns.length > 6 ? '…' : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {datasetProfile ? (
                <Select
                  label="Columna identificador (opcional)"
                  id="id-column"
                  value={idColumn}
                  onChange={(e) => setIdColumn(e.target.value)}
                  options={idColumnOptions}
                  helperText="Se usa en tooltips y etiquetas de puntos."
                />
              ) : null}
            </div>
          ) : null}

          <Select
            label="Método de reducción"
            id="reduccion"
            value={metodoReduccion}
            onChange={(e) => setMetodoReduccion(e.target.value)}
            options={REDUCCION}
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
                helperText="Misma semilla → misma submuestra y resultados comparables."
              />
              <Input
                label="Tamaño de muestra (filas)"
                id="n-samples"
                type="number"
                min={30}
                max={10000}
                value={nSamples}
                onChange={(e) => setNSamples(e.target.value)}
                helperText="Máximo 10 000. Se submuestrea aleatoriamente si el CSV es mayor."
              />
            </>
          ) : null}

          <Button
            type="button"
            variant="primary"
            onClick={ejecutarPipeline}
            disabled={!canExecute}
          >
            {ejecutando ? 'Ejecutando pipeline…' : 'Ejecutar pipeline'}
          </Button>

          {ejecutando ? (
            <Feedback
              variant="info"
              message="Ejecutando reduccion dimensional y clustering. Con UMAP/HDBSCAN puede tardar cerca de un minuto para 2000 incidencias."
            />
          ) : null}
          {apiOnline === false ? (
            <Feedback
              variant="warning"
              message="No pude confirmar el health check del backend. Si el CSV subio bien, podes reintentar; si falla, revisa que FastAPI este en 127.0.0.1:8000."
            />
          ) : null}
          {error ? <Feedback variant="danger" message={error} /> : null}

          {lastRun?.id ? (
            <p className="note run-saved-note">
              Guardado en historial ·{' '}
              <Link to="/historial">Ver todas las ejecuciones</Link>
            </p>
          ) : null}

          <p className="note">Pipeline en FastAPI: PCA / t-SNE / UMAP + HDBSCAN.</p>
        </Card>

        <Card className="panel-results">
          <h2>2. Proyección 2D y clusters</h2>
          <div className="results-tabs" role="tablist" aria-label="Vista de resultados">
            <button
              type="button"
              role="tab"
              aria-selected={resultView === 'visualization'}
              className={`result-tab ${
                resultView === 'visualization' ? 'result-tab--active' : ''
              }`}
              onClick={() => setResultView('visualization')}
            >
              Visualizaci&oacute;n
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={resultView === 'interpretation'}
              className={`result-tab ${
                resultView === 'interpretation' ? 'result-tab--active' : ''
              }`}
              onClick={() => setResultView('interpretation')}
            >
              Interpretaci&oacute;n
            </button>
          </div>

          <div hidden={resultView !== 'visualization'} className="results-tab-panel">
            <RunKpis result={resultado} runMeta={lastRun} />

          {ejecutando ? (
            <Feedback
              variant="info"
              message="Pipeline en curso. La visualizacion aparecera cuando termine la proyeccion 2D y el clustering."
            />
          ) : null}

          <Scatter2D
            X_2d={resultado?.X_2d}
            clusterLabels={resultado?.cluster_labels}
            metadata={resultado?.metadata}
          />

          <p className="legend-note note">
            Color = cluster HDBSCAN; gris = outlier (-1). Pasa el cursor sobre un punto para ver
            detalle de la observación.
          </p>

          </div>

          <div hidden={resultView !== 'interpretation'} className="results-tab-panel">
            <ClusterInterpretationPanel result={resultado} run={lastRun} />
          </div>
        </Card>

        <ConversationPanel run={lastRun} />
      </div>
    </div>
  )
}
