import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createMetabaseDashboard,
  fetchMetabaseEmbedToken,
  fetchMetabaseStatus,
  syncBiTables,
} from '@/api/metabase'

function tableCount(tables, name) {
  if (!tables) return 0
  const value = tables[name]
  return value != null ? Number(value) : 0
}

function hasPublishedData(status) {
  return (
    tableCount(status?.tables, 'bi_evidences') > 0 ||
    tableCount(status?.tables, 'bi_selected_insights') > 0
  )
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

export function useMetabaseReportsPage(fromRunId) {
  const [phase, setPhase] = useState('loading')
  const [embedUrl, setEmbedUrl] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [backgroundSyncing, setBackgroundSyncing] = useState(false)
  const bootstrappedRef = useRef(false)

  const loadEmbed = useCallback(async () => {
    const result = await fetchMetabaseEmbedToken()
    if (result.status !== 'ok' || !result.embed_url) {
      throw new Error(result.message || 'No se pudo cargar el informe')
    }
    setEmbedUrl(result.embed_url)
    return result
  }, [])

  const refresh = useCallback(
    async ({ soft = false } = {}) => {
      if (soft) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setBackgroundSyncing(false)
      setError(null)
      if (!soft) {
        setMessage(null)
      }

      let showedExistingReport = false

      try {
        const initialStatus = await fetchMetabaseStatus()

        if (!initialStatus.enabled || initialStatus.postgres_status !== 'ok') {
          setPhase('empty')
          setEmbedUrl(null)
          return
        }

        if (!soft && canEmbedNow(initialStatus)) {
          await loadEmbed()
          setPhase('ready')
          setLoading(false)
          setBackgroundSyncing(true)
          showedExistingReport = true
        }

        const syncResult = await syncBiTables(fromRunId)
        if (syncResult.status !== 'ok') {
          throw new Error(syncResult.message || 'No se pudieron actualizar los datos del informe')
        }

        let status = await fetchMetabaseStatus()
        if (!status.dashboard_url) {
          const dashboardResult = await createMetabaseDashboard()
          if (dashboardResult.status === 'ok') {
            status = await fetchMetabaseStatus()
          }
        }

        if (!hasPublishedData(status)) {
          setPhase('empty')
          setEmbedUrl(null)
          return
        }

        if (!status.embedding_configured) {
          setPhase('error')
          setEmbedUrl(null)
          setError('El informe aún no está disponible. Contacta al administrador de la plataforma.')
          return
        }

        await loadEmbed()
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
    [fromRunId, loadEmbed],
  )

  useEffect(() => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    void refresh()
  }, [refresh])

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
    error,
    message,
    setMessage,
    setError,
    loading,
    refreshing,
    backgroundSyncing,
    syncing: refreshing || backgroundSyncing,
    refresh,
  }
}
