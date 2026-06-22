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

  const analysisStatusMessage = useMemo(
    () =>
      buildAnalysisStatusMessage({
        modalidad,
        datasetProfile,
        activeProject,
      }),
    [modalidad, datasetProfile, activeProject],
  )

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
