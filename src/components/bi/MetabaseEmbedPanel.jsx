import { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { fetchMetabaseEmbedToken } from '@/api/metabase'
import { Card, LoadingPanel } from '@/ui'

export function MetabaseEmbedPanel({ className = '' }) {
  const [embedUrl, setEmbedUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadEmbed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMetabaseEmbedToken()
      if (result.status !== 'ok' || !result.embed_url) {
        throw new Error(result.message || 'No se pudo obtener la URL de incrustación')
      }
      setEmbedUrl(result.embed_url)
    } catch (err) {
      setEmbedUrl(null)
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEmbed(), 0)
    return () => window.clearTimeout(timer)
  }, [loadEmbed])

  useEffect(() => {
    if (!embedUrl) return undefined
    const refreshMs = 8 * 60 * 1000
    const timer = window.setInterval(() => {
      void loadEmbed()
    }, refreshMs)
    return () => window.clearInterval(timer)
  }, [embedUrl, loadEmbed])

  return (
    <Card className={`metabase-embed-panel ${className}`.trim()}>
      <div className="metabase-embed-panel__head">
        <div>
          <h2>Dashboard embebido</h2>
          <p>Visualiza el informe de Metabase sin salir de la plataforma.</p>
        </div>
        <button type="button" className="decision-link" onClick={() => void loadEmbed()}>
          Actualizar vista
        </button>
      </div>

      {loading ? (
        <LoadingPanel
          embedded
          title="Cargando dashboard…"
          description="Generando acceso seguro a Metabase."
        />
      ) : null}

      {!loading && error ? (
        <p className="metabase-embed-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && embedUrl ? (
        <iframe
          title="Dashboard Metabase"
          src={embedUrl}
          className="metabase-embed-panel__frame"
          allowTransparency
        />
      ) : null}
    </Card>
  )
}

MetabaseEmbedPanel.propTypes = {
  className: PropTypes.string,
}
