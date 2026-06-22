import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createProject,
  fetchProject,
  removeProjectSource,
  updateProject,
  uploadProjectSource,
} from '@/api/projects'
import { REDUCTION_OPTIONS } from '@/utils/businessLabels'
import {
  ACTIVE_PROJECT_KEY,
  defaultSourceName,
  normalizeProjectStrategy,
} from '@/utils/projectLabels'
import { AUTO_SOURCE_TYPE, PREPARE_TAB } from './constants'
import { buildAnalysisStatusMessage } from '@/utils/analysisStatus'
import { isTabularSource, resolveSourceTypeSelection } from './helpers'

export function useProjectPrepareDialog({
  open,
  projectId,
  onProjectSaved,
  onClose,
  onAnalyze,
  modalidad,
  onModalidadChange,
  metodoReduccion,
  advancedMode,
  scenarioName,
  datasetProfile,
  error,
  ejecutando,
  uploading,
}) {
  const [activeTab, setActiveTab] = useState(PREPARE_TAB.origin)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [strategy, setStrategy] = useState('per_source')
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingType, setUploadingType] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceType, setNewSourceType] = useState(AUTO_SOURCE_TYPE)
  const [newSourceFiles, setNewSourceFiles] = useState([])
  const [sourceFileInputKey, setSourceFileInputKey] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(null)
  const wasOpenRef = useRef(false)
  const uploadingTypeRef = useRef(null)
  uploadingTypeRef.current = uploadingType

  const csvCount = useMemo(
    () => (project?.sources ?? []).filter((s) => isTabularSource(s)).length,
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

  const rowCountHint = useMemo(() => {
    if (modalidad === 'tabular' && datasetProfile?.n_rows) {
      return `las ${datasetProfile.n_rows} incidencias del archivo`
    }
    if (modalidad === 'project' && project?.total_rows) {
      return `las ${project.total_rows} filas del escenario`
    }
    return 'todas las incidencias del dataset'
  }, [modalidad, datasetProfile, project])

  const processingMessage = useMemo(
    () =>
      buildAnalysisStatusMessage({
        modalidad,
        datasetProfile,
        activeProject: modalidad === 'project' ? project : null,
      }),
    [modalidad, datasetProfile, project],
  )

  const prepareTabs = useMemo(
    () => [
      { value: PREPARE_TAB.origin, label: 'Origen' },
      { value: PREPARE_TAB.data, label: 'Datos', disabled: modalidad === 'it_ops' },
      { value: PREPARE_TAB.params, label: 'Parámetros' },
    ],
    [modalidad],
  )

  const idColumnOptions = useMemo(() => {
    if (!datasetProfile?.all_columns?.length) return []
    return [
      { value: '', label: '(sin identificador)' },
      ...datasetProfile.all_columns.map((column) => ({ value: column, label: column })),
    ]
  }, [datasetProfile])

  const loadProject = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    setLocalError(null)
    try {
      const detail = await fetchProject(id)
      setProject(detail)
      setName(detail.name)
      setDescription(detail.description ?? '')
      const tabularCount = (detail.sources ?? []).filter((source) => isTabularSource(source)).length
      setStrategy(normalizeProjectStrategy(detail.strategy ?? 'per_source', tabularCount))
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo cargar el escenario')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true
    if (!justOpened) return

    setActiveTab(projectId ? PREPARE_TAB.data : PREPARE_TAB.origin)
    setLocalError(null)
    setNewSourceName('')
    setNewSourceType(AUTO_SOURCE_TYPE)
    setNewSourceFiles([])
    setUploadProgress(null)
    setSourceFileInputKey((current) => current + 1)
    if (!projectId) {
      setProject(null)
      setName('')
      setDescription('')
      setStrategy('per_source')
    }
  }, [open, projectId])

  useEffect(() => {
    if (!open || !projectId || uploadingTypeRef.current) return
    loadProject(projectId)
  }, [open, projectId, loadProject])

  useEffect(() => {
    if (modalidad === 'it_ops' && activeTab === PREPARE_TAB.data) {
      setActiveTab(PREPARE_TAB.params)
    }
  }, [modalidad, activeTab])

  useEffect(() => {
    if (strategy === 'merged' && csvCount < 2) {
      setStrategy('per_source')
    }
  }, [strategy, csvCount])

  const ensureProject = useCallback(async () => {
    if (!name.trim()) {
      throw new Error('Indica un nombre para el escenario.')
    }
    const existingId = project?.id ?? projectId ?? null
    const effectiveStrategy = normalizeProjectStrategy(strategy, csvCount)
    if (existingId) {
      const updated = await updateProject(existingId, {
        name: name.trim(),
        description: description.trim(),
        strategy: effectiveStrategy,
      })
      setProject(updated)
      onProjectSaved?.(updated)
      return updated
    }
    const created = await createProject({
      name: name.trim(),
      description: description.trim(),
      strategy: effectiveStrategy,
    })
    setProject(created)
    localStorage.setItem(ACTIVE_PROJECT_KEY, created.id)
    onProjectSaved?.(created)
    return created
  }, [name, description, strategy, csvCount, project, projectId, onProjectSaved])

  const handleNewSourceFileChange = useCallback((fileList) => {
    const files = Array.from(fileList ?? [])
    setNewSourceFiles((previousFiles) => {
      const previousFile = previousFiles.length === 1 ? previousFiles[0] : null
      const previousDefaultName = previousFile ? defaultSourceName(previousFile) : ''
      if (files.length === 1) {
        setNewSourceName((current) =>
          !current || current === previousDefaultName ? defaultSourceName(files[0]) : current,
        )
      } else if (files.length > 1) {
        setNewSourceName('')
      }
      return files
    })
    setUploadProgress(null)
  }, [])

  const handleAddSource = useCallback(async () => {
    setLocalError(null)
    if (!newSourceFiles.length) {
      setLocalError('Selecciona uno o varios archivos para agregarlos al escenario.')
      return
    }
    setUploadingType('new-source')
    let pendingFiles = [...newSourceFiles]
    let failedFilename = ''
    try {
      if (modalidad !== 'project') {
        onModalidadChange('project')
      }
      const current = await ensureProject()
      const total = newSourceFiles.length
      let latestDetail = current
      for (let index = 0; index < newSourceFiles.length; index += 1) {
        const file = newSourceFiles[index]
        failedFilename = file.name
        setUploadProgress({ current: index + 1, total, filename: file.name })
        const sourceType = resolveSourceTypeSelection(newSourceType, file)
        const sourceName =
          total === 1 ? newSourceName || defaultSourceName(file) : defaultSourceName(file)
        latestDetail = await uploadProjectSource(current.id, sourceType, file, sourceName)
        pendingFiles = pendingFiles.slice(1)
        setNewSourceFiles(pendingFiles)
        setProject(latestDetail)
      }
      onProjectSaved?.(latestDetail)
      setNewSourceName('')
      setNewSourceType(AUTO_SOURCE_TYPE)
      setNewSourceFiles([])
      setSourceFileInputKey((current) => current + 1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir el archivo'
      setNewSourceFiles(pendingFiles)
      setLocalError(failedFilename ? `No se pudo procesar ${failedFilename}: ${message}` : message)
    } finally {
      setUploadingType(null)
      setUploadProgress(null)
    }
  }, [
    newSourceFiles,
    modalidad,
    onModalidadChange,
    ensureProject,
    newSourceType,
    newSourceName,
    onProjectSaved,
  ])

  const handleRemove = useCallback(
    async (source) => {
      if (!project?.id) return
      setLocalError(null)
      setUploadingType(source.id)
      try {
        const detail = await removeProjectSource(project.id, source.id)
        setProject(detail)
        onProjectSaved?.(detail)
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'No se pudo quitar la fuente')
      } finally {
        setUploadingType(null)
      }
    },
    [project, onProjectSaved],
  )

  const validateTab = useCallback(
    (tab) => {
      if (tab === PREPARE_TAB.origin) return true
      if (tab === PREPARE_TAB.data) {
        if (modalidad === 'tabular') {
          if (!scenarioName.trim()) {
            setLocalError('Indica un nombre para el escenario.')
            return false
          }
          if (!datasetProfile?.dataset_id) {
            setLocalError('Sube un archivo tabular antes de continuar.')
            return false
          }
        }
        if (modalidad === 'project') {
          if (!name.trim()) {
            setLocalError('Indica un nombre para el escenario.')
            return false
          }
          if (csvCount < 1) {
            setLocalError('Sube al menos una fuente tabular antes de continuar.')
            return false
          }
          if (strategy === 'merged' && csvCount < 2) {
            setLocalError(
              'La estrategia unificada multifuente requiere al menos dos fuentes tabulares.',
            )
            return false
          }
        }
      }
      return true
    },
    [modalidad, scenarioName, datasetProfile, name, csvCount, strategy],
  )

  const goNextTab = useCallback(() => {
    setLocalError(null)
    if (activeTab === PREPARE_TAB.origin) {
      if (modalidad === 'it_ops') {
        setActiveTab(PREPARE_TAB.params)
        return
      }
      if (!validateTab(PREPARE_TAB.data)) return
      setActiveTab(PREPARE_TAB.data)
      return
    }
    if (activeTab === PREPARE_TAB.data) {
      if (!validateTab(PREPARE_TAB.data)) return
      setActiveTab(PREPARE_TAB.params)
    }
  }, [activeTab, modalidad, validateTab])

  const goPrevTab = useCallback(() => {
    setLocalError(null)
    if (activeTab === PREPARE_TAB.params) {
      setActiveTab(modalidad === 'it_ops' ? PREPARE_TAB.origin : PREPARE_TAB.data)
      return
    }
    if (activeTab === PREPARE_TAB.data) {
      setActiveTab(PREPARE_TAB.origin)
    }
  }, [activeTab, modalidad])

  const handleAnalyze = useCallback(async () => {
    setLocalError(null)
    if (!validateTab(PREPARE_TAB.data)) {
      setActiveTab(modalidad === 'it_ops' ? PREPARE_TAB.origin : PREPARE_TAB.data)
      return
    }
    setSaving(true)
    try {
      if (modalidad === 'project') {
        await ensureProject()
      }
      onClose?.()
      await onAnalyze?.()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setSaving(false)
    }
  }, [validateTab, modalidad, ensureProject, onAnalyze, onClose])

  const handleTabChange = useCallback(
    (tab) => {
      setLocalError(null)
      if (tab === PREPARE_TAB.data && modalidad === 'it_ops') return
      if (tab === PREPARE_TAB.params && modalidad !== 'it_ops' && !validateTab(PREPARE_TAB.data)) {
        return
      }
      setActiveTab(tab)
    },
    [modalidad, validateTab],
  )

  const displayError = localError || error
  const busy = saving || ejecutando || Boolean(uploadingType) || uploading
  const isLastTab = activeTab === PREPARE_TAB.params

  return {
    activeTab,
    setLocalError,
    name,
    setName,
    description,
    setDescription,
    strategy,
    setStrategy,
    project,
    loading,
    uploadingType,
    newSourceName,
    setNewSourceName,
    newSourceType,
    setNewSourceType,
    newSourceFiles,
    sourceFileInputKey,
    uploadProgress,
    csvCount,
    reduccionOptions,
    descripcionMetodo,
    rowCountHint,
    processingMessage,
    prepareTabs,
    idColumnOptions,
    handleNewSourceFileChange,
    handleAddSource,
    handleRemove,
    goNextTab,
    goPrevTab,
    handleAnalyze,
    handleTabChange,
    displayError,
    busy,
    isLastTab,
    saving,
  }
}
