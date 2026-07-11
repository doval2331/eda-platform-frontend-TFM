import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createMetabaseDashboard,
  fetchMetabaseEmbedToken,
  fetchMetabaseStatus,
  syncBiTables,
} from '@/api/metabase'
import { listRuns } from '@/api/pipeline'

function tableCount(tables, name) {
  if (!tables) return 0
  const value = tables[name]
  return value != null ? Number(value) : 0
}

function hasPublishedTables(tables) {
  return (
    tableCount(tables, 'bi_evidences') > 0 ||
    tableCount(tables, 'bi_selected_insights') > 0
  )
}

function hasPublishedData(status) {
  return hasPublishedTables(status?.tables)
}

function canEmbedNow(status) {
  return (
    Boolean(status?.enabled) &&
    status?.postgres_status === 'ok' &&
    hasPublishedData(status) &&
    Boolean(status?.embedding_configured) &&
    Boolean(status?.dashboard_url)
  )
}

const PROGRESS_STAGES = {
  idle: {
    value: 0,
    label: 'Preparando informes',
    detail: '',
  },
  status: {
    value: 12,
    label: 'Verificando servicios BI',
    detail: 'Comprobando PostgreSQL, Metabase y tablas publicadas.',
  },
  existing: {
    value: 24,
    label: 'Mostrando informe disponible',
    detail: 'Cargando el informe existente mientras se actualizan datos en segundo plano.',
  },
  syncRun: {
    value: 42,
    label: 'Publicando ejecucion activa',
    detail: 'Sincronizando solo los hallazgos y evidencias del run activo.',
  },
  syncAll: {
    value: 42,
    label: 'Publicando todas las ejecuciones',
    detail: 'No se recibio run activo; se sincroniza todo el historico y puede tardar mas.',
  },
  validate: {
    value: 72,
    label: 'Validando datos publicados',
    detail: 'Revisando que existan evidencias o hallazgos para el informe.',
  },
  dashboard: {
    value: 84,
    label: 'Preparando dashboard Metabase',
    detail: 'Creando o verificando el dashboard de informes.',
  },
  embed: {
    value: 94,
    label: 'Cargando visualizacion',
    detail: 'Generando enlace seguro para abrir Metabase.',
  },
  done: {
    value: 100,
    label: 'Informe listo',
    detail: 'Datos BI publicados y visualizacion cargada.',
  },
}

function progressForStage(stage) {
  return PROGRESS_STAGES[stage] ?? PROGRESS_STAGES.idle
}

function describeSyncedTables(tables) {
  const summary = Object.entries(tables || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([table, count]) => `${table}: ${count}`)
    .slice(0, 3)
    .join(' | ')
  return summary ? `Tablas publicadas: ${summary}.` : 'No se publicaron filas para el informe.'
}

async function resolveSyncRunId(fromRunId, setProgressStage) {
  if (fromRunId) return fromRunId
  setProgressStage(
    'status',
    'No llego una ejecucion activa; buscando la ultima ejecucion para evitar publicar todo el historico.',
  )
  try {
    const runs = await listRuns(1)
    return runs?.[0]?.id || ''
  } catch {
    return ''
  }
}

export function useMetabaseReportsPage(fromRunId) {
  const [phase, setPhase] = useState('loading')
  const [embedUrl, setEmbedUrl] = useState(null)
  const [dashboardUrl, setDashboardUrl] = useState(null)
  const [error, setError] = useState(null)
  const [emptyDetail, setEmptyDetail] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [backgroundSyncing, setBackgroundSyncing] = useState(false)
  const [progressState, setProgressState] = useState(PROGRESS_STAGES.idle)
  const [publishedRunId, setPublishedRunId] = useState(fromRunId || '')
  const bootstrappedRef = useRef('')
  const progressStageRef = useRef('idle')

  const setProgressStage = useCallback((stage, detailOverride) => {
    progressStageRef.current = stage
    const next = progressForStage(stage)
    setProgressState({
      ...next,
      detail: detailOverride ?? next.detail,
    })
  }, [])

  const loadEmbed = useCallback(async (runIdOverride = '') => {
    const result = await fetchMetabaseEmbedToken(runIdOverride || fromRunId || publishedRunId)
    if (result.status !== 'ok' || !result.embed_url) {
      throw new Error(result.message || 'No se pudo cargar el informe')
    }
    setEmbedUrl(result.embed_url)
    return result
  }, [fromRunId, publishedRunId])

  const refresh = useCallback(
    async ({ soft = false } = {}) => {
      if (soft) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setBackgroundSyncing(false)
      setError(null)
      setEmptyDetail(null)
      setDashboardUrl(null)
      if (!soft) {
        setMessage(null)
      }
      setProgressStage('status')

      let showedExistingReport = false

      try {
        const initialStatus = await fetchMetabaseStatus()
        setDashboardUrl(initialStatus.dashboard_url || null)

        if (!initialStatus.enabled || initialStatus.postgres_status !== 'ok') {
          setPhase('empty')
          setEmbedUrl(null)
          setEmptyDetail(
            'El servicio BI no esta disponible. Verifica PostgreSQL/Metabase y vuelve a actualizar el informe.',
          )
          return
        }

        if (!soft && !fromRunId && canEmbedNow(initialStatus)) {
          setProgressStage('existing')
          await loadEmbed(fromRunId || publishedRunId)
          setPhase('ready')
          setLoading(false)
          setBackgroundSyncing(true)
          showedExistingReport = true
        }

        const effectiveRunId = await resolveSyncRunId(fromRunId, setProgressStage)
        setProgressStage(
          effectiveRunId ? 'syncRun' : 'syncAll',
          effectiveRunId
            ? 'Sincronizando hallazgos y evidencias de la ejecucion seleccionada.'
            : PROGRESS_STAGES.syncAll.detail,
        )
        const syncResult = await syncBiTables(effectiveRunId)
        if (syncResult.status !== 'ok') {
          throw new Error(syncResult.message || 'No se pudieron actualizar los datos del informe')
        }
        if (effectiveRunId) {
          setPublishedRunId(effectiveRunId)
        }

        setProgressStage('validate', describeSyncedTables(syncResult.tables))
        if (effectiveRunId && !hasPublishedTables(syncResult.tables)) {
          setPhase('empty')
          setEmbedUrl(null)
          setEmptyDetail(
            'La ejecucion activa no publico evidencias ni hallazgos seleccionados para Metabase. Guarda hallazgos en Analisis asistido o en el Dashboard conversacional y pulsa Actualizar informe.',
          )
          return
        }

        let status = await fetchMetabaseStatus()
        setDashboardUrl(status.dashboard_url || null)
        if (!status.dashboard_url) {
          setProgressStage('dashboard')
          const dashboardResult = await createMetabaseDashboard()
          if (dashboardResult.status !== 'ok') {
            throw new Error(
              dashboardResult.message ||
                'No se pudo crear el dashboard en Metabase. Verifica credenciales y conexion.',
            )
          }
          status = await fetchMetabaseStatus()
          setDashboardUrl(status.dashboard_url || dashboardResult.dashboard_url || null)
          if (!status.dashboard_url && dashboardResult.dashboard_url) {
            status = {
              ...status,
              dashboard_url: dashboardResult.dashboard_url,
              embed_url: dashboardResult.embed_url || status.embed_url,
            }
          }
        }

        if (!hasPublishedData(status)) {
          setPhase('empty')
          setEmbedUrl(null)
          setEmptyDetail(
            effectiveRunId
              ? 'No se encontraron filas BI publicadas para la ejecucion activa despues de sincronizar.'
              : 'No se encontraron filas BI publicadas. Selecciona una ejecucion con hallazgos guardados.',
          )
          return
        }

        if (!status.embedding_configured) {
          if (status.dashboard_url) {
            setPhase('external')
            setEmbedUrl(null)
            setProgressStage(
              'done',
              'Los datos fueron publicados. Metabase no tiene embedding configurado, pero puedes abrir el dashboard directamente.',
            )
            if (soft) {
              setMessage('Informe publicado. Abre Metabase para visualizarlo.')
            }
            return
          }
          setPhase('error')
          setEmbedUrl(null)
          setError(
            'Los datos se publicaron, pero falta configurar el dashboard o el embedding de Metabase.',
          )
          return
        }

        setProgressStage('embed')
        await loadEmbed(effectiveRunId)
        setProgressStage('done')
        setPhase('ready')
        if (soft) {
          setMessage('Informe actualizado.')
        }
      } catch (err) {
        if (!showedExistingReport && !soft) {
          setPhase('error')
          setEmbedUrl(null)
          setError(err instanceof Error ? err.message : 'No pudimos actualizar el informe.')
        } else if (soft) {
          setError(err instanceof Error ? err.message : 'No pudimos actualizar el informe.')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
        setBackgroundSyncing(false)
      }
    },
    [fromRunId, loadEmbed, publishedRunId, setProgressStage],
  )

  useEffect(() => {
    const bootstrapKey = fromRunId || '__latest__'
    if (bootstrappedRef.current === bootstrapKey) return
    bootstrappedRef.current = bootstrapKey
    setPublishedRunId(fromRunId || '')
    void refresh()
  }, [fromRunId, refresh])

  useEffect(() => {
    if (!loading && !refreshing && !backgroundSyncing) return undefined
    const timer = window.setInterval(() => {
      setProgressState((current) => {
        const isSyncStage = progressStageRef.current === 'syncRun' || progressStageRef.current === 'syncAll'
        const cap = isSyncStage ? 68 : 96
        if (current.value >= cap) return current
        const increment = current.value < 50 ? 2 : 1
        return {
          ...current,
          value: Math.min(cap, current.value + increment),
        }
      })
    }, 1200)
    return () => window.clearInterval(timer)
  }, [loading, refreshing, backgroundSyncing])

  useEffect(() => {
    if (!embedUrl) return undefined
    const refreshMs = 8 * 60 * 1000
    const timer = window.setInterval(() => {
      void loadEmbed().catch(() => {})
    }, refreshMs)
    return () => window.clearInterval(timer)
  }, [embedUrl, loadEmbed])

  return {
    phase,
    embedUrl,
    dashboardUrl,
    error,
    emptyDetail,
    message,
    setMessage,
    setError,
    loading,
    refreshing,
    backgroundSyncing,
    syncing: refreshing || backgroundSyncing,
    progress: progressState.value,
    progressLabel: progressState.label,
    progressDetail: progressState.detail,
    refresh,
  }
}
