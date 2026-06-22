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

export function useMetabaseReportsPage(fromRunId) {
  const [phase, setPhase] = useState('loading')
  const [embedUrl, setEmbedUrl] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const bootstrappedRef = useRef(false)

  const loadEmbed = useCallback(async () => {
    const result = await fetchMetabaseEmbedToken()
    if (result.status !== 'ok' || !result.embed_url) {
      throw new Error(result.message || 'No se pudo cargar el informe')
    }
    setEmbedUrl(result.embed_url)
    return result
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    setMessage(null)
    try {
      const status = await fetchMetabaseStatus()
      if (!status.enabled || status.postgres_status !== 'ok') {
        setPhase('empty')
        setEmbedUrl(null)
        setError(null)
        return
      }

      const syncResult = await syncBiTables(fromRunId)
      if (syncResult.status !== 'ok') {
        throw new Error(syncResult.message || 'No se pudieron actualizar los datos del informe')
      }

      let embeddingReady = Boolean(status.embedding_configured)
      let dashboardUrl = status.dashboard_url

      if (!dashboardUrl) {
        const dashboardResult = await createMetabaseDashboard()
        if (dashboardResult.status === 'ok') {
          dashboardUrl = dashboardResult.dashboard_url
        }
      }

      const refreshedStatus = await fetchMetabaseStatus()
      embeddingReady = Boolean(refreshedStatus.embedding_configured)
      dashboardUrl = refreshedStatus.dashboard_url || dashboardUrl

      const evidences = tableCount(refreshedStatus.tables, 'bi_evidences')
      const insights = tableCount(refreshedStatus.tables, 'bi_selected_insights')
      if (!evidences && !insights) {
        setPhase('empty')
        setEmbedUrl(null)
        return
      }

      if (!embeddingReady) {
        setPhase('error')
        setEmbedUrl(null)
        setError('El informe aún no está disponible. Contacta al administrador de la plataforma.')
        return
      }

      await loadEmbed()
      setPhase('ready')
      setLastUpdatedAt(new Date())
      setMessage('Informe actualizado.')
    } catch (err) {
      setPhase('error')
      setEmbedUrl(null)
      setError(err instanceof Error ? err.message : 'No pudimos actualizar el informe.')
    } finally {
      setRefreshing(false)
    }
  }, [fromRunId, loadEmbed])

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
    lastUpdatedAt,
    refreshing,
    refresh,
  }
}
