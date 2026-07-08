import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { uploadDataset } from '@/api/datasets'
import { executeProjectRuns, fetchProject } from '@/api/projects'
import { executePipeline, checkApiHealth, fetchRun } from '@/api/pipeline'
import { validateCsvUploadFile } from '@/utils/csvUpload'
import { buildAnalysisStatusMessage } from '@/utils/analysisStatus'
import { REDUCTION_OPTIONS, recommendReductionMethod } from '@/utils/businessLabels'
import { runsListQueryKey } from '@/hooks/queries'
import {
  ACTIVE_PROJECT_KEY,
  loadTabularScenario,
  saveTabularScenario,
} from '@/utils/projectLabels'

const ONBOARDING_KEY = 'eda-dashboard-onboarding-dismissed'
const DEFAULT_PIPELINE_TUNING = {
  umapNNeighbors: '15',
  umapMinDist: '0.1',
  hdbscanMinClusterSize: '',
  hdbscanMinSamples: '',
  dbscanEps: '0.027',
}
const MIN_ANALYSIS_SAMPLES = 30
const MAX_ANALYSIS_SAMPLES = 10000

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
    label: 'Finalizando procesamiento',
    detail: 'Persistiendo resultados y preparando la visualizacion.',
  },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parsePositiveInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseOptionalInteger(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseOptionalFloat(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parsePositiveFloat(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function defaultSampleLimitForRows(rowCount) {
  return rowCount > MAX_ANALYSIS_SAMPLES ? '' : String(rowCount)
}

function availableRowsForAnalysis({ modalidad, datasetProfile, activeProject }) {
  if (modalidad === 'tabular') return datasetProfile?.n_rows || null
  if (modalidad === 'project') return activeProject?.total_rows || null
  return null
}

function normalizeSampleLimit(value, availableRows) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return null
  if (availableRows && parsed >= availableRows) return null

  const boundedByRows = availableRows ? Math.min(parsed, availableRows) : parsed
  return clamp(boundedByRows, MIN_ANALYSIS_SAMPLES, MAX_ANALYSIS_SAMPLES)
}

function buildPipelineTuningPayload(tuning) {
  const values = {
    umapNNeighbors: parseOptionalInteger(tuning.umapNNeighbors),
    umapMinDist: parseOptionalFloat(tuning.umapMinDist),
    hdbscanMinClusterSize: parseOptionalInteger(tuning.hdbscanMinClusterSize),
    hdbscanMinSamples: parseOptionalInteger(tuning.hdbscanMinSamples),
    dbscanEps: parsePositiveFloat(tuning.dbscanEps),
  }
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value != null))
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
  const rowRatio = rowCount ? Math.max(rowCount / 10000, 0.4) : 0.8
  const rowCostMs =
    Math.pow(rowRatio, metodoReduccion === 'UMAP' ? 1.25 : 1.1) *
    (metodoReduccion === 'UMAP' ? 22000 : 12000)
  const methodCostMs = metodoReduccion === 'UMAP' ? 35000 : 12000
  const estimatedMs = clamp(
    20000 + sourceCount * 7000 + rowCostMs + methodCostMs,
    45000,
    360000,
  )

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

export function useDashboardPage({ onRunStateChange, isExpert = false } = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalidad, setModalidad] = useState('tabular')
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
  const [prepareProjectId, setPrepareProjectId] = useState(null)
  const [projectRuns, setProjectRuns] = useState([])
  const [selectedRunIndex, setSelectedRunIndex] = useState(0)
  const [ejecutando, setEjecutando] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [lastRun, setLastRun] = useState(null)
  const [error, setError] = useState(null)
  const [apiOnline, setApiOnline] = useState(null)
  const [resultView, setResultView] = useState('interpretation')
  const advancedMode = isExpert
  const [pipelineTuning, setPipelineTuning] = useState(DEFAULT_PIPELINE_TUNING)
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== '1',
  )
  const [chatForceOpen, setChatForceOpen] = useState(false)
  const [chatExternalPrompt, setChatExternalPrompt] = useState(null)
  const [analysisConfigOpen, setAnalysisConfigOpen] = useState(false)
  const resultsPanelRef = useRef(null)
  const analysisProgressTimerRef = useRef(null)
  const reductionAutoAppliedRef = useRef(false)

  useEffect(() => {
    if (!isExpert) {
      setAnalysisConfigOpen(false)
    }
  }, [isExpert])

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

  const reductionRecommendation = useMemo(() => {
    const tabularSource = activeProject?.sources?.find((source) => source?.n_rows != null)
    const nRows =
      modalidad === 'tabular'
        ? datasetProfile?.n_rows ?? 0
        : activeProject?.total_rows ?? tabularSource?.n_rows ?? 0
    const nCols = datasetProfile?.n_cols ?? tabularSource?.all_columns?.length ?? 0
    const categoricalCount =
      datasetProfile?.categorical_columns?.length ??
      tabularSource?.categorical_columns?.length ??
      0
    return recommendReductionMethod({ nRows, nCols, categoricalCount })
  }, [modalidad, datasetProfile, activeProject])

  const reduccionOptions = useMemo(
    () =>
      REDUCTION_OPTIONS.map(({ value, label }) => ({
        value,
        label: advancedMode ? `${label} (${value})` : label,
      })),
    [advancedMode],
  )

  const descripcionMetodo = useMemo(() => {
    const found = REDUCTION_OPTIONS.find((option) => option.value === metodoReduccion)
    return found?.helper ?? ''
  }, [metodoReduccion])

  const rowCountHint = useMemo(() => {
    if (modalidad === 'tabular' && datasetProfile?.n_rows) {
      return `las ${datasetProfile.n_rows} incidencias del archivo`
    }
    if (modalidad === 'project' && activeProject?.total_rows) {
      return `las ${activeProject.total_rows} filas del escenario`
    }
    return 'todas las incidencias del dataset'
  }, [modalidad, datasetProfile, activeProject])

  useEffect(() => {
    if (reductionAutoAppliedRef.current) return
    const hasDataset =
      Boolean(datasetProfile?.dataset_id) || Boolean(activeProject?.total_rows || activeProject?.csv_source_count)
    if (!hasDataset) return
    setMetodoReduccion(reductionRecommendation.method)
    reductionAutoAppliedRef.current = true
  }, [reductionRecommendation, datasetProfile, activeProject])

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

  const refreshApiHealth = useCallback(async () => {
    try {
      const online = await checkApiHealth()
      setApiOnline(online)
      return online
    } catch {
      setApiOnline(false)
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      try {
        const online = await checkApiHealth()
        if (!cancelled) setApiOnline(online)
      } catch {
        if (!cancelled) setApiOnline(false)
      }
    }
    void refresh()
    const timer = window.setInterval(() => {
      void refresh()
    }, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const storedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (!storedId) return
    const timer = window.setTimeout(() => {
      void loadActiveProject(storedId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadActiveProject])

  useEffect(() => {
    const state = location.state ?? {}
    if (!state.openPrepareDialog && !state.editProjectId) return

    const timer = window.setTimeout(() => {
      if (state.editProjectId) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, state.editProjectId)
        setPrepareProjectId(state.editProjectId)
        void loadActiveProject(state.editProjectId).finally(() => {
          setPrepareDialogOpen(true)
        })
      } else {
        setPrepareProjectId(null)
        setPrepareDialogOpen(true)
      }
      navigate(location.pathname, { replace: true, state: null })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadActiveProject, location.pathname, location.state, navigate])

  useEffect(() => {
    if (modalidad === 'project') return
    const timer = window.setTimeout(() => {
      setProjectRuns([])
      setSelectedRunIndex(0)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [modalidad])

  useEffect(() => {
    const nextSamples =
      modalidad === 'tabular' && datasetProfile?.n_rows
        ? defaultSampleLimitForRows(datasetProfile.n_rows)
        : modalidad === 'project' && activeProject?.total_rows
          ? defaultSampleLimitForRows(activeProject.total_rows)
          : null
    if (nextSamples == null) return
    const timer = window.setTimeout(() => {
      setNSamples(nextSamples)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [modalidad, datasetProfile, activeProject])

  useEffect(() => {
    if (!datasetProfile?.suggested_id_column) return
    const timer = window.setTimeout(() => {
      setIdColumn(datasetProfile.suggested_id_column)
    }, 0)
    return () => window.clearTimeout(timer)
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

  useEffect(() => {
    onRunStateChange?.({
      hasResults: Boolean(resultado && lastRun?.id),
      runId: lastRun?.id,
      isNewRun: false,
    })
  }, [resultado, lastRun?.id, onRunStateChange])

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
    async (index) => {
      const run = projectRuns[index]
      if (!run) return
      setSelectedRunIndex(index)
      if (run.result) {
        setLastRun(run)
        setResultado(run.result)
        return
      }
      setLastRun(run)
      setResultado(null)
      try {
        const detail = await fetchRun(run.id)
        setProjectRuns((current) =>
          current.map((item) => (item.id === detail.id ? detail : item)),
        )
        setLastRun(detail)
        setResultado(detail.result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la fuente seleccionada')
      }
    },
    [projectRuns],
  )

  const canExecute =
    apiOnline !== false &&
    !ejecutando &&
    ((modalidad === 'tabular' && datasetProfile?.dataset_id && scenarioName.trim()) ||
      (modalidad === 'project' && activeProject?.csv_source_count > 0))

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
  }, [])

  const handlePipelineTuningChange = useCallback((field, value) => {
    setPipelineTuning((current) => ({
      ...current,
      [field]: value,
    }))
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

  const ejecutarPipeline = useCallback(async ({ project: projectOverride } = {}) => {
    const backendReady = await refreshApiHealth()
    if (!backendReady) {
      setError('No se pudo confirmar la conexion con el backend. Verifica que FastAPI este corriendo en el puerto 8000.')
      return
    }
    const projectForAnalysis = projectOverride ?? activeProject
    if (projectOverride) {
      setActiveProject(projectOverride)
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectOverride.id)
    }
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
      const availableRows = availableRowsForAnalysis({
        modalidad,
        datasetProfile,
        activeProject: projectForAnalysis,
      })
      nSamplesParam = normalizeSampleLimit(nSamples, availableRows)
      if (nSamplesParam != null && String(nSamplesParam) !== String(nSamples).trim()) {
        setNSamples(String(nSamplesParam))
      }
    }
    const pipelineTuningParam = advancedMode ? buildPipelineTuningPayload(pipelineTuning) : null
    startAnalysisProgress(
      buildAnalysisProgressContext({
        modalidad,
        datasetProfile,
        activeProject: projectForAnalysis,
        metodoReduccion,
        nSamples,
        nSamplesParam,
      }),
    )

    try {
      if (modalidad === 'project') {
        if (!projectForAnalysis?.id) {
          throw new Error('No se encontro el escenario activo para analizar.')
        }
        const response = await executeProjectRuns(projectForAnalysis.id, {
          reductionMethod: metodoReduccion,
          seed: seedNum,
          nSamples: nSamplesParam,
          pipelineTuning: pipelineTuningParam,
        })
        const primary = response.primary_run ?? response.runs.find((r) => r.id === response.primary_run_id)
        const runs = response.runs?.length ? response.runs : primary ? [primary] : []
        const hydratedRuns = runs.map((run) => (run.id === primary?.id ? primary : run))
        setProjectRuns(hydratedRuns)
        const primaryIndex = hydratedRuns.findIndex((r) => r.id === response.primary_run_id)
        const index = primaryIndex >= 0 ? primaryIndex : 0
        setSelectedRunIndex(index)
        const selected = hydratedRuns[index]
        setResultado(selected?.result ?? primary?.result ?? null)
        setLastRun(selected?.result ? selected : primary)
        setResultView('interpretation')
        onRunStateChange?.({
          hasResults: true,
          runId: primary.id,
          isNewRun: true,
        })
        void queryClient.invalidateQueries({ queryKey: runsListQueryKey(50) })
        if (selected?.dataset_id) {
          void queryClient.invalidateQueries({
            queryKey: ['datasetExploreProfile', selected.dataset_id],
          })
        }
        if (primary?.id) {
          void queryClient.invalidateQueries({ queryKey: ['clusterProfiles', primary.id] })
        }
      } else {
        if (modalidad === 'tabular') {
          saveTabularScenario({ name: scenarioName, description: scenarioDescription })
        }
        const { run, result } = await executePipeline({
          modality: modalidad,
          reductionMethod: metodoReduccion,
          seed: seedNum,
          nSamples: nSamplesParam,
          pipelineTuning: pipelineTuningParam,
          datasetId: modalidad === 'tabular' ? datasetProfile?.dataset_id : undefined,
          idColumn: modalidad === 'tabular' && idColumn ? idColumn : undefined,
          projectName: modalidad === 'tabular' ? scenarioName.trim() : undefined,
          sourceType: modalidad === 'tabular' ? 'incidents' : undefined,
        })
        setProjectRuns([])
        setResultado(result)
        setLastRun(run)
        setResultView('interpretation')
        onRunStateChange?.({
          hasResults: true,
          runId: run.id,
          isNewRun: true,
        })
        void queryClient.invalidateQueries({ queryKey: runsListQueryKey(50) })
        if (run?.dataset_id) {
          void queryClient.invalidateQueries({
            queryKey: ['datasetExploreProfile', run.dataset_id],
          })
        }
        if (run?.id) {
          void queryClient.invalidateQueries({ queryKey: ['clusterProfiles', run.id] })
        }
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
    pipelineTuning,
    scenarioDescription,
    scenarioName,
    seed,
    startAnalysisProgress,
    stopAnalysisProgress,
    refreshApiHealth,
  ])

  const clearDataset = useCallback(() => {
    setDatasetProfile(null)
    setIdColumn('')
    setUploadError(null)
  }, [])

  const openPrepareDialog = useCallback(() => {
    setError(null)
    setPrepareProjectId(null)
    setDatasetProfile(null)
    setIdColumn('')
    setUploadError(null)
    setScenarioName('')
    setScenarioDescription('')
    setPrepareDialogOpen(true)
  }, [])

  const closePrepareDialog = useCallback(() => {
    setPrepareDialogOpen(false)
    setPrepareProjectId(null)
  }, [])

  const openAnalysisConfig = useCallback(() => {
    setAnalysisConfigOpen(true)
  }, [])

  const handleRecalculateFromConfig = useCallback(async () => {
    setAnalysisConfigOpen(false)
    await ejecutarPipeline()
  }, [ejecutarPipeline])

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
    prepareProjectId,
    closePrepareDialog,
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
    isExpert,
    pipelineTuning,
    handlePipelineTuningChange,
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
    analysisConfigOpen,
    setAnalysisConfigOpen,
    openAnalysisConfig,
    handleRecalculateFromConfig,
    reductionRecommendation,
    reduccionOptions,
    descripcionMetodo,
    rowCountHint,
  }
}
