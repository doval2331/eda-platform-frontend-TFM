import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createProject,
  fetchProject,
  removeProjectSource,
  updateProject,
  uploadProjectSource,
  validateProjectSources,
  waitForProjectSourceUploadJob,
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
      { value: PREPARE_TAB.data, label: 'Datos' },
      { value: PREPARE_TAB.params, label: 'Parámetros' },
    ],
    [],
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
      let detail = await fetchProject(id)
      const hasText = (detail.sources ?? []).some((source) => !isTabularSource(source))
      const hasTabular = (detail.sources ?? []).some((source) => isTabularSource(source))
      if (hasText && hasTabular) {
        try {
          detail = await validateProjectSources(id)
        } catch {
          // Mantener detalle sin revalidar si falla la API.
        }
      }
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
    uploadingTypeRef.current = uploadingType
  }, [uploadingType])

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true
    if (!justOpened) return

    const timer = window.setTimeout(() => {
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
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, projectId])

  useEffect(() => {
    if (!open || !projectId || uploadingTypeRef.current) return
    loadProject(projectId)
  }, [open, projectId, loadProject])

  useEffect(() => {
    if (strategy !== 'merged' || csvCount >= 2) return
    const timer = window.setTimeout(() => {
      setStrategy('per_source')
    }, 0)
    return () => window.clearTimeout(timer)
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
        const baseProgress = {
          current: index + 1,
          total,
          filename: file.name,
          phase: 'uploading',
          message: 'Subiendo archivo...',
          loadedBytes: 0,
          totalBytes: file.size || null,
        }
        setUploadProgress(baseProgress)
        const uploadJob = await uploadProjectSource(current.id, sourceType, file, sourceName, {
          onUploadProgress: (progress) => {
            setUploadProgress({
              ...baseProgress,
              loadedBytes: progress.loaded,
              totalBytes: progress.total || file.size || null,
              percent: progress.percent,
              message:
                progress.percent != null
                  ? `Subiendo archivo (${progress.percent}%)`
                  : 'Subiendo archivo...',
            })
          },
        })
        setUploadProgress({
          ...baseProgress,
          phase: uploadJob.status,
          jobId: uploadJob.job_id,
          loadedBytes: file.size || null,
          totalBytes: file.size || null,
          percent: 100,
          message: uploadJob.message || 'Archivo recibido. Procesando...',
        })
        const completedJob =
          uploadJob.status === 'completed'
            ? uploadJob
            : await waitForProjectSourceUploadJob(current.id, uploadJob.job_id, {
                onUpdate: (job) => {
                  setUploadProgress({
                    ...baseProgress,
                    phase: job.status,
                    jobId: job.job_id,
                    loadedBytes: file.size || null,
                    totalBytes: file.size || null,
                    percent: 100,
                    message: job.message || 'Procesando archivo...',
                  })
                },
              })
        latestDetail = completedJob.project
        if (!latestDetail) {
          latestDetail = await fetchProject(current.id)
        }
        pendingFiles = pendingFiles.slice(1)
        setNewSourceFiles(pendingFiles)
        setProject(latestDetail)
      }
      onProjectSaved?.(latestDetail)
      setNewSourceName('')
      setNewSourceType(AUTO_SOURCE_TYPE)
      setNewSourceFiles([])
      setSourceFileInputKey((current) => current + 1)
      const hasText = (latestDetail.sources ?? []).some((source) => !isTabularSource(source))
      const hasTabular = (latestDetail.sources ?? []).some((source) => isTabularSource(source))
      if (hasText && hasTabular) {
        try {
          const validated = await validateProjectSources(latestDetail.id)
          setProject(validated)
          onProjectSaved?.(validated)
        } catch {
          // La validación puede fallar offline; se conserva el detalle subido.
        }
      }
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
      setActiveTab(PREPARE_TAB.data)
      return
    }
    if (activeTab === PREPARE_TAB.data) {
      if (!validateTab(PREPARE_TAB.data)) return
      setActiveTab(PREPARE_TAB.params)
    }
  }, [activeTab, validateTab])

  const goPrevTab = useCallback(() => {
    setLocalError(null)
    if (activeTab === PREPARE_TAB.params) {
      setActiveTab(PREPARE_TAB.data)
      return
    }
    if (activeTab === PREPARE_TAB.data) {
      setActiveTab(PREPARE_TAB.origin)
    }
  }, [activeTab])

  const handleAnalyze = useCallback(async () => {
    setLocalError(null)
    if (!validateTab(PREPARE_TAB.data)) {
      setActiveTab(PREPARE_TAB.data)
      return
    }
    setSaving(true)
    try {
      let projectForAnalysis = null
      if (modalidad === 'project') {
        projectForAnalysis = await ensureProject()
      }
      onClose?.()
      window.setTimeout(() => {
        Promise.resolve(onAnalyze?.({ project: projectForAnalysis })).catch(() => {})
      }, 0)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setSaving(false)
    }
  }, [validateTab, modalidad, ensureProject, onAnalyze, onClose])

  const handleTabChange = useCallback(
    (tab) => {
      setLocalError(null)
      if (tab === PREPARE_TAB.params && !validateTab(PREPARE_TAB.data)) {
        return
      }
      setActiveTab(tab)
    },
    [validateTab],
  )

  const displayError = localError || error
  const busy = saving || ejecutando || Boolean(uploadingType) || uploading
  const isLastTab = activeTab === PREPARE_TAB.params
  const excludedSourceWarning = useMemo(() => {
    const excluded = (project?.sources ?? []).filter(
      (source) => !isTabularSource(source) && source.relationship_status === 'excluded',
    )
    if (!excluded.length) return null
    const names = excluded.map((source) => source.source_name || source.filename).join(', ')
    return `${excluded.length} documento(s) sin relación con el dataset (${names}) quedaron excluidos del análisis.`
  }, [project])

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
    excludedSourceWarning,
  }
}
