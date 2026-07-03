import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { uploadDataset } from '@/api/datasets'
import { executeProjectRuns, fetchProject } from '@/api/projects'
import { executePipeline, checkApiHealth } from '@/api/pipeline'
import { validateCsvUploadFile } from '@/utils/csvUpload'
import { buildAnalysisStatusMessage } from '@/utils/analysisStatus'
import {
  ACTIVE_PROJECT_KEY,
  loadTabularScenario,
  saveTabularScenario,
} from '@/utils/projectLabels'

const ONBOARDING_KEY = 'eda-dashboard-onboarding-dismissed'

const ANALYSIS_STAGES = [
  {
    id: 'prepare',
    start: 0,
    doneAt: 18,
    label: 'Preparando datos',
    detail: 'Validando fuentes, columnas y parametros del escenario.',
  },
  {
    id: 'features',
    start: 18,
    doneAt: 36,
    label: 'Construyendo variables',
    detail: 'Normalizando columnas y preparando atributos para el modelo.',
  },
  {
    id: 'reduction',
    start: 36,
    doneAt: 58,
    label: 'Reduciendo dimensiones',
    detail: 'Proyectando incidencias para generar el mapa visual.',
  },
  {
    id: 'clustering',
    start: 58,
    doneAt: 76,
    label: 'Agrupando incidencias',
    detail: 'Buscando patrones similares y casos atipicos.',
  },
  {
    id: 'metrics',
    start: 76,
    doneAt: 88,
    label: 'Calculando metricas',
    detail: 'Evaluando calidad de grupos y resumiendo perfiles.',
  },
  {
    id: 'persist',
    start: 88,
    doneAt: 100,
    label: 'Guardando resultados',
    detail: 'Persistiendo la ejecucion y preparando la visualizacion.',
  },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parsePositiveInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function activeStageForPercent(percent) {
  return (
    [...ANALYSIS_STAGES]
      .reverse()
      .find((stage) => percent >= stage.start) ?? ANALYSIS_STAGES[0]
  )
}

function buildAnalysisProgressContext({
  modalidad,
  datasetProfile,
  activeProject,
  metodoReduccion,
  nSamples,
  nSamplesParam,
}) {
  const projectSourceCount =
    activeProject?.csv_source_count ||
    activeProject?.source_count ||
    activeProject?.sources?.length ||
    0
  const sourceCount = modalidad === 'project' ? projectSourceCount : 1
  const rowCount =
    nSamplesParam ||
    (modalidad === 'project'
      ? activeProject?.total_rows
      : modalidad === 'tabular'
        ? datasetProfile?.n_rows
        : parsePositiveInteger(nSamples, 2000)) ||
    0
  const rowBlocks = rowCount ? Math.ceil(rowCount / 10000) : 1
  const methodCostMs = metodoReduccion === 'UMAP' ? 12000 : 7000
  const estimatedMs = clamp(18000 + sourceCount * 6000 + rowBlocks * 5000 + methodCostMs, 35000, 240000)

  return {
    sourceCount,
    rowCount,
    metodoReduccion,
    estimatedMs,
  }
}

function buildAnalysisProgressSnapshot(context, elapsedMs) {
  const rawPercent = 7 + (elapsedMs / context.estimatedMs) * 86
  const percent = Math.round(clamp(rawPercent, 7, 94))
  const currentStage = activeStageForPercent(percent)

  return {
    ...context,
    percent,
    label: currentStage.label,
    detail:
      currentStage.id === 'reduction'
        ? `Aplicando ${context.metodoReduccion} y preparando coordenadas visuales.`
        : currentStage.detail,
    stages: ANALYSIS_STAGES.map((stage) => ({
      id: stage.id,
      label: stage.label,
      status:
        percent >= stage.doneAt
          ? 'completed'
          : stage.id === currentStage.id
            ? 'current'
            : 'pending',
    })),
  }
}

export function useDashboardPage() {
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
  const [loadingProject, setLoadingProject] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [prepareDialogOpen, setPrepareDialogOpen] = useState(false)
  const [projectRuns, setProjectRuns] = useState([])
  const [selectedRunIndex, setSelectedRunIndex] = useState(0)
  const [ejecutando, setEjecutando] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(null)
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
  const resultsPanelRef = useRef(null)
  const analysisProgressTimerRef = useRef(null)

  const analysisStatusMessage = useMemo(
    () =>
      buildAnalysisStatusMessage({
        modalidad,
        datasetProfile,
        activeProject,
      }),
    [modalidad, datasetProfile, activeProject],
  )

  const analysisFeedbackMessage = useMemo(() => {
    if (!analysisProgress) return analysisStatusMessage
    return `${analysisProgress.percent}% estimado - ${analysisProgress.label}. ${analysisStatusMessage}`
  }, [analysisProgress, analysisStatusMessage])

  const loadActiveProject = useCallback(async (projectId) => {
    if (!projectId) {
      setActiveProject(null)
      return
    }
    setLoadingProject(true)
    try {
      const detail = await fetchProject(projectId)
      setActiveProject(detail)
      setModalidad('project')
    } catch {
      localStorage.removeItem(ACTIVE_PROJECT_KEY)
      setActiveProject(null)
    } finally {
      setLoadingProject(false)
    }
  }, [])

  useEffect(() => {
    checkApiHealth()
      .then(setApiOnline)
      .catch(() => setApiOnline(false))
  }, [])

  useEffect(() => {
    const storedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (storedId) loadActiveProject(storedId)
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

  useEffect(() => {
    if (!ejecutando) return
    resultsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [ejecutando])

  const handleOpenChatWithPrompt = useCallback((prompt) => {
    setChatExternalPrompt({ text: prompt, at: Date.now() })
    setChatForceOpen(true)
    setResultView('agents')
  }, [])

  const handleChatPromptConsumed = useCallback(() => {
    setChatExternalPrompt(null)
    setChatForceOpen(false)
  }, [])

  const handleModalidadChange = useCallback((value) => {
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
  }, [])

  const handleProjectSaved = useCallback((detail) => {
    setActiveProject(detail)
    setModalidad('project')
    setDatasetProfile(null)
    setIdColumn('')
    setUploadError(null)
    localStorage.setItem(ACTIVE_PROJECT_KEY, detail.id)
  }, [])

  const onFileChange = useCallback(
    async (file) => {
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
    },
    [handleModalidadChange, scenarioName],
  )

  const handleSelectProjectRun = useCallback(
    (index) => {
      const run = projectRuns[index]
      if (!run) return
      setSelectedRunIndex(index)
      setLastRun(run)
      setResultado(run.result)
    },
    [projectRuns],
  )

  const canExecute =
    apiOnline !== false &&
    !ejecutando &&
    (modalidad === 'it_ops' ||
      (modalidad === 'tabular' && datasetProfile?.dataset_id && scenarioName.trim()) ||
      (modalidad === 'project' && activeProject?.csv_source_count > 0))

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
  }, [])

  const clearAnalysisProgressTimer = useCallback(() => {
    if (analysisProgressTimerRef.current) {
      window.clearInterval(analysisProgressTimerRef.current)
      analysisProgressTimerRef.current = null
    }
  }, [])

  const stopAnalysisProgress = useCallback(() => {
    clearAnalysisProgressTimer()
    setAnalysisProgress(null)
  }, [clearAnalysisProgressTimer])

  const startAnalysisProgress = useCallback((context) => {
    clearAnalysisProgressTimer()
    const startedAt = Date.now()
    setAnalysisProgress(buildAnalysisProgressSnapshot(context, 0))
    analysisProgressTimerRef.current = window.setInterval(() => {
      setAnalysisProgress(buildAnalysisProgressSnapshot(context, Date.now() - startedAt))
    }, 1000)
  }, [clearAnalysisProgressTimer])

  useEffect(() => () => clearAnalysisProgressTimer(), [clearAnalysisProgressTimer])

  const ejecutarPipeline = useCallback(async () => {
    setPrepareDialogOpen(false)
    setEjecutando(true)
    setError(null)
    setResultado(null)
    setLastRun(null)
    setProjectRuns([])
    setResultView('interpretation')

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
    startAnalysisProgress(
      buildAnalysisProgressContext({
        modalidad,
        datasetProfile,
        activeProject,
        metodoReduccion,
        nSamples,
        nSamplesParam,
      }),
    )

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
          saveTabularScenario({ name: scenarioName, description: scenarioDescription })
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
      stopAnalysisProgress()
    }
  }, [
    activeProject,
    advancedMode,
    datasetProfile,
    idColumn,
    metodoReduccion,
    modalidad,
    nSamples,
    scenarioDescription,
    scenarioName,
    seed,
    startAnalysisProgress,
    stopAnalysisProgress,
  ])

  const clearDataset = useCallback(() => {
    setDatasetProfile(null)
    setIdColumn('')
    setUploadError(null)
  }, [])

  const openPrepareDialog = useCallback(() => {
    setError(null)
    setPrepareDialogOpen(true)
  }, [])

  return {
    modalidad,
    metodoReduccion,
    setMetodoReduccion,
    seed,
    setSeed,
    nSamples,
    setNSamples,
    activeProject,
    datasetProfile,
    scenarioName,
    setScenarioName,
    scenarioDescription,
    setScenarioDescription,
    idColumn,
    setIdColumn,
    uploading,
    loadingProject,
    uploadError,
    prepareDialogOpen,
    setPrepareDialogOpen,
    projectRuns,
    selectedRunIndex,
    ejecutando,
    resultado,
    lastRun,
    error,
    setError,
    apiOnline,
    resultView,
    setResultView,
    advancedMode,
    setAdvancedMode,
    showOnboarding,
    chatForceOpen,
    chatExternalPrompt,
    resultsPanelRef,
    analysisStatusMessage,
    analysisFeedbackMessage,
    analysisProgress,
    handleModalidadChange,
    handleProjectSaved,
    onFileChange,
    handleSelectProjectRun,
    canExecute,
    dismissOnboarding,
    ejecutarPipeline,
    clearDataset,
    openPrepareDialog,
    handleOpenChatWithPrompt,
    handleChatPromptConsumed,
  }
}
