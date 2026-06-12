import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../styles/app.css'
import { Scatter2D } from '../Scatter2D'
import { uploadDataset } from '../api/datasets'
import { executeProjectRuns, fetchProject } from '../api/projects'
import { executePipeline, checkApiHealth } from '../api/pipeline'
import { validateCsvUploadFile } from '../utils/csvUpload'
import { AgentAnalysisPanel } from '../components/AgentAnalysisPanel'
import { ClusterInterpretationPanel } from '../components/ClusterInterpretationPanel'
import { FloatingChatWidget } from '../components/chat'
import { ProjectPrepareDialog } from '../components/ProjectPrepareDialog'
import { RunKpis } from '../components/RunKpis'
import { PageNavbar, Button, Card, Feedback } from '../ui'
import {
  ACTIVE_PROJECT_KEY,
  loadTabularScenario,
  saveTabularScenario,
  sourceTypeLabel,
} from '../utils/projectLabels'

const ONBOARDING_KEY = 'eda-dashboard-onboarding-dismissed'

export function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [modalidad, setModalidad] = useState('it_ops')
  const [metodoReduccion, setMetodoReduccion] = useState('UMAP')
  const [seed, setSeed] = useState('42')
  const [nSamples, setNSamples] = useState('2000')
  const [activeProject, setActiveProject] = useState(null)
  const [datasetProfile, setDatasetProfile] = useState(null)
  const [scenarioName, setScenarioName] = useState(() => loadTabularScenario().name)
  const [scenarioDescription, setScenarioDescription] = useState(
    () => loadTabularScenario().description,
  )
  const [idColumn, setIdColumn] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [prepareDialogOpen, setPrepareDialogOpen] = useState(false)
  const [projectRuns, setProjectRuns] = useState([])
  const [selectedRunIndex, setSelectedRunIndex] = useState(0)
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
  const [chatForceOpen, setChatForceOpen] = useState(false)
  const [chatExternalPrompt, setChatExternalPrompt] = useState(null)

  const loadActiveProject = useCallback(async (projectId) => {
    if (!projectId) {
      setActiveProject(null)
      return
    }
    try {
      const detail = await fetchProject(projectId)
      setActiveProject(detail)
      setModalidad('project')
    } catch {
      localStorage.removeItem(ACTIVE_PROJECT_KEY)
      setActiveProject(null)
    }
  }, [])

  useEffect(() => {
    checkApiHealth()
      .then(setApiOnline)
      .catch(() => setApiOnline(false))
  }, [])

  useEffect(() => {
    const storedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (storedId) {
      loadActiveProject(storedId)
    }
  }, [loadActiveProject])

  useEffect(() => {
    const state = location.state ?? {}
    if (!state.openPrepareDialog && !state.editProjectId) return

    if (state.editProjectId) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, state.editProjectId)
      void loadActiveProject(state.editProjectId).finally(() => {
        setPrepareDialogOpen(true)
      })
    } else {
      setPrepareDialogOpen(true)
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [loadActiveProject, location.pathname, location.state, navigate])

  useEffect(() => {
    if (modalidad !== 'project') {
      setProjectRuns([])
      setSelectedRunIndex(0)
    }
  }, [modalidad])

  useEffect(() => {
    if (modalidad === 'tabular' && datasetProfile?.n_rows) {
      setNSamples(String(datasetProfile.n_rows))
    } else if (modalidad === 'project' && activeProject?.total_rows) {
      setNSamples(String(activeProject.total_rows))
    }
  }, [modalidad, datasetProfile, activeProject])

  useEffect(() => {
    if (datasetProfile?.suggested_id_column) {
      setIdColumn(datasetProfile.suggested_id_column)
    }
  }, [datasetProfile])

  function handleOpenChatWithPrompt(prompt) {
    setChatExternalPrompt({ text: prompt, at: Date.now() })
    setChatForceOpen(true)
    setResultView('agents')
  }

  function handleChatPromptConsumed() {
    setChatExternalPrompt(null)
    setChatForceOpen(false)
  }

  function handleModalidadChange(value) {
    setModalidad(value)
    if (value === 'tabular') {
      setActiveProject(null)
      localStorage.removeItem(ACTIVE_PROJECT_KEY)
    } else if (value === 'project') {
      setDatasetProfile(null)
      setIdColumn('')
      setUploadError(null)
      setScenarioName('')
      setScenarioDescription('')
    } else if (value === 'it_ops') {
      setDatasetProfile(null)
      setIdColumn('')
      setUploadError(null)
      setActiveProject(null)
      localStorage.removeItem(ACTIVE_PROJECT_KEY)
    }
  }

  function handleProjectSaved(detail) {
    setActiveProject(detail)
    setModalidad('project')
    setDatasetProfile(null)
    setIdColumn('')
    setUploadError(null)
    localStorage.setItem(ACTIVE_PROJECT_KEY, detail.id)
  }

  async function onFileChange(file) {
    const validation = validateCsvUploadFile(file)
    if (!validation.ok) {
      setUploadError(validation.message)
      setDatasetProfile(null)
      return
    }

    setUploadError(null)
    setUploading(true)
    setDatasetProfile(null)
    try {
      const profile = await uploadDataset(file)
      setDatasetProfile(profile)
      if (!scenarioName.trim()) {
        const baseName = file.name.replace(/\.[^.]+$/i, '').trim()
        if (baseName) setScenarioName(baseName)
      }
      handleModalidadChange('tabular')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir el archivo tabular')
      setDatasetProfile(null)
    } finally {
      setUploading(false)
    }
  }

  function handleSelectProjectRun(index) {
    const run = projectRuns[index]
    if (!run) return
    setSelectedRunIndex(index)
    setLastRun(run)
    setResultado(run.result)
  }

  const canExecute =
    apiOnline !== false &&
    !ejecutando &&
    (modalidad === 'it_ops' ||
      (modalidad === 'tabular' && datasetProfile?.dataset_id && scenarioName.trim()) ||
      (modalidad === 'project' && activeProject?.csv_source_count > 0))

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
  }

  async function ejecutarPipeline() {
    setEjecutando(true)
    setError(null)

    const seedNum = Number.parseInt(seed, 10) || 42
    let nSamplesParam = null
    if (advancedMode) {
      let nSamplesNum = Number.parseInt(nSamples, 10)
      if (!Number.isFinite(nSamplesNum) || nSamplesNum < 30) {
        nSamplesNum = modalidad === 'it_ops' ? 2000 : 500
      }
      if (modalidad === 'tabular' && datasetProfile?.n_rows) {
        nSamplesNum = Math.min(nSamplesNum, datasetProfile.n_rows)
      } else if (activeProject?.total_rows) {
        nSamplesNum = Math.min(nSamplesNum, activeProject.total_rows)
      }
      nSamplesParam = nSamplesNum
    }

    try {
      if (modalidad === 'project') {
        const response = await executeProjectRuns(activeProject.id, {
          reductionMethod: metodoReduccion,
          seed: seedNum,
          nSamples: nSamplesParam,
        })
        setProjectRuns(response.runs)
        const primaryIndex = response.runs.findIndex((r) => r.id === response.primary_run_id)
        const index = primaryIndex >= 0 ? primaryIndex : 0
        setSelectedRunIndex(index)
        const primary = response.runs[index]
        setResultado(primary.result)
        setLastRun(primary)
        setResultView('interpretation')
      } else {
        if (modalidad === 'tabular') {
          saveTabularScenario({
            name: scenarioName,
            description: scenarioDescription,
          })
        }
        const { run, result } = await executePipeline({
          modality: modalidad,
          reductionMethod: metodoReduccion,
          seed: seedNum,
          nSamples: nSamplesParam,
          datasetId: modalidad === 'tabular' ? datasetProfile?.dataset_id : undefined,
          idColumn: modalidad === 'tabular' && idColumn ? idColumn : undefined,
          projectName: modalidad === 'tabular' ? scenarioName.trim() : undefined,
          sourceType: modalidad === 'tabular' ? 'incidents' : undefined,
        })
        setProjectRuns([])
        setResultado(result)
        setLastRun(run)
        setResultView('interpretation')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar las incidencias')
      setResultado(null)
      setLastRun(null)
      setProjectRuns([])
      throw err
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
              <li>Pulsa «Preparar datos» para configurar el escenario y las fuentes.</li>
              <li>Agrupa automáticamente las incidencias que se comportan de forma similar.</li>
              <li>Revisa grupos críticos, agentes asistidos y chat en lenguaje de negocio.</li>
            </ol>
          </div>
          <button type="button" className="onboarding-dismiss" onClick={dismissOnboarding}>
            Entendido
          </button>
        </div>
      ) : null}

      <RunKpis result={resultado} runMeta={lastRun} advancedMode={advancedMode} />

      <div className="app-main app-main--results-only">
        <Card className="panel-results">
          <div className="panel-results-head">
            <div className="panel-results-head-main">
              <h2>Resultados</h2>
              {lastRun?.id ? (
                <p className="note run-saved-note">
                  Análisis guardado
                  {lastRun.project_name ? ` · ${lastRun.project_name}` : ''}
                  {lastRun.source_name
                    ? ` · ${lastRun.source_name}`
                    : lastRun.source_type
                      ? ` · ${sourceTypeLabel(lastRun.source_type)}`
                      : ''} ·{' '}
                  <Link to="/historial">Ver historial</Link>
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="primary"
              className="prepare-data-btn"
              onClick={() => setPrepareDialogOpen(true)}
            >
              Preparar datos
            </Button>
          </div>
          {projectRuns.length > 1 ? (
            <label className="field project-runs-picker" htmlFor="project-run-select-main">
              <span className="field-label">Fuente analizada</span>
              <select
                id="project-run-select-main"
                className="field-input"
                value={selectedRunIndex}
                onChange={(e) => handleSelectProjectRun(Number(e.target.value))}
              >
                {projectRuns.map((run, index) => (
                  <option key={run.id} value={index}>
                    {run.source_name || sourceTypeLabel(run.source_type)} — {run.n_samples} incidencias
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
            {lastRun?.id ? (
              <button
                type="button"
                role="tab"
                aria-selected={resultView === 'agents'}
                className={`result-tab result-tab--llm ${
                  resultView === 'agents' ? 'result-tab--active' : ''
                }`}
                onClick={() => setResultView('agents')}
              >
                Análisis asistido
              </button>
            ) : null}
          </div>

          {!resultado && !ejecutando ? (
            <Feedback
              variant="info"
              message="Pulsa «Preparar datos» para configurar el escenario y ejecutar el análisis."
            />
          ) : null}

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

          <div hidden={resultView !== 'agents'} className="results-tab-panel">
            <AgentAnalysisPanel
              run={lastRun}
              projectId={activeProject?.id}
              onOpenChatWithPrompt={handleOpenChatWithPrompt}
            />
          </div>
        </Card>
      </div>

      <ProjectPrepareDialog
        open={prepareDialogOpen}
        onClose={() => setPrepareDialogOpen(false)}
        projectId={activeProject?.id}
        onProjectSaved={handleProjectSaved}
        modalidad={modalidad}
        onModalidadChange={handleModalidadChange}
        scenarioName={scenarioName}
        onScenarioNameChange={setScenarioName}
        scenarioDescription={scenarioDescription}
        onScenarioDescriptionChange={setScenarioDescription}
        datasetProfile={datasetProfile}
        idColumn={idColumn}
        onIdColumnChange={setIdColumn}
        uploading={uploading}
        uploadError={uploadError}
        onDatasetFileChange={onFileChange}
        onClearDataset={() => {
          setDatasetProfile(null)
          setIdColumn('')
          setUploadError(null)
        }}
        metodoReduccion={metodoReduccion}
        onMetodoReduccionChange={setMetodoReduccion}
        seed={seed}
        onSeedChange={setSeed}
        nSamples={nSamples}
        onNSamplesChange={setNSamples}
        advancedMode={advancedMode}
        onAdvancedModeChange={setAdvancedMode}
        canExecute={canExecute}
        ejecutando={ejecutando}
        error={error}
        apiOnline={apiOnline}
        onAnalyze={ejecutarPipeline}
        projectRuns={projectRuns}
        selectedRunIndex={selectedRunIndex}
        onSelectProjectRun={handleSelectProjectRun}
      />

      <FloatingChatWidget
        run={lastRun}
        forceOpen={chatForceOpen}
        externalPrompt={chatExternalPrompt}
        onExternalPromptConsumed={handleChatPromptConsumed}
      />
    </div>
  )
}
