import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import '../styles/app.css'
import '../styles/history.css'
import { deleteRun, fetchRun } from '../api/pipeline'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AgentAnalysisPanel } from '../components/AgentAnalysisPanel'
import { ClusterInterpretationPanel } from '../components/ClusterInterpretationPanel'
import { FloatingChatWidget } from '../components/chat'
import { RunKpis } from '../components/RunKpis'
import { Scatter2D } from '../Scatter2D'
import { Button, Card, Feedback, LoadingPanel, PageNavbar } from '../ui'
import { formatModality } from '../utils/runMetrics'
import { sourceTypeLabel } from '../utils/projectLabels'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function HistoryRunDetailPage() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [resultView, setResultView] = useState('interpretation')
  const [chatForceOpen, setChatForceOpen] = useState(false)
  const [chatExternalPrompt, setChatExternalPrompt] = useState(null)

  function handleOpenChatWithPrompt(prompt) {
    setChatExternalPrompt({ text: prompt, at: Date.now() })
    setChatForceOpen(true)
    setResultView('agents')
  }

  function handleChatPromptConsumed() {
    setChatExternalPrompt(null)
    setChatForceOpen(false)
  }

  const loadRun = useCallback(async () => {
    if (!runId) return
    setLoading(true)
    setError(null)
    try {
      const detail = await fetchRun(runId)
      setRun(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la ejecución')
      setRun(null)
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    void loadRun()
  }, [loadRun])

  async function confirmDeleteRun() {
    if (!runId || !run) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteRun(runId)
      navigate('/historial', {
        replace: true,
        state: {
          deletedMessage:
            result.message ?? 'Se eliminó la ejecución y sus datos analíticos asociados.',
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la ejecución')
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }

  return (
    <div className="history-page history-detail-page">
      <PageNavbar
        breadcrumbParent="Historial"
        breadcrumbCurrent="Resultados"
        title={
          run
            ? `Ejecución del ${formatDate(run.created_at)}`
            : 'Resultados de ejecución'
        }
       
        rightSlot={
          <div className="history-page-actions">
            <Button type="button" variant="secondary" onClick={() => navigate('/historial')}>
              Volver al historial
            </Button>
            {run ? (
              <Button
                type="button"
                variant="secondary"
                className="btn-danger"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleting || loading}
              >
                {deleting ? 'Eliminando…' : 'Eliminar ejecución'}
              </Button>
            ) : null}
          </div>
        }
      />

      <Feedback
        open={Boolean(error)}
        variant="danger"
        message={error ?? ''}
        onClose={() => setError(null)}
        position="bottom-right"
      />

      {loading ? (
        <LoadingPanel
          title="Cargando resultados…"
          description="Recuperando clusters, métricas y mapa visual de esta ejecución."
        />
      ) : run ? (
        <>
          <p className="muted history-detail-meta history-detail-meta--top">
            {run.project_name ?? formatModality(run.modality)}
            {run.source_name
              ? ` · ${run.source_name}`
              : run.source_type
                ? ` · ${sourceTypeLabel(run.source_type)}`
                : ''} ·{' '}
            {run.reduction_method} · seed {run.seed} · id{' '}
            <code className="history-run-id">{run.id.slice(0, 8)}…</code>
          </p>

          <RunKpis result={run.result} runMeta={run} />

          <Card className="panel-results history-detail-card">
            <div className="panel-header panel-header--stacked">
              <div>
                <h2>Resultados</h2>
                <p className="results-intro note">
                  Revisa el resumen por grupos o el mapa visual de la ejecución guardada.
                </p>
              </div>
            </div>

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
            </div>

            <div hidden={resultView !== 'interpretation'} className="results-tab-panel">
              <ClusterInterpretationPanel result={run.result} run={run} />
            </div>

            <div hidden={resultView !== 'visualization'} className="results-tab-panel">
              <Scatter2D
                X_2d={run.result?.X_2d}
                clusterLabels={run.result?.cluster_labels}
                metadata={run.result?.metadata}
              />
              <p className="legend-note note">
                Color = cluster HDBSCAN; gris = outlier (-1). Datos recuperados del historial.
              </p>
            </div>

            <div hidden={resultView !== 'agents'} className="results-tab-panel">
              <AgentAnalysisPanel run={run} onOpenChatWithPrompt={handleOpenChatWithPrompt} />
            </div>
          </Card>

          <p className="history-detail-back">
            <Link to="/historial">← Volver al historial de ejecuciones</Link>
          </p>

          <FloatingChatWidget
            run={run}
            forceOpen={chatForceOpen}
            externalPrompt={chatExternalPrompt}
            onExternalPromptConsumed={handleChatPromptConsumed}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) setDeleteConfirmOpen(false)
        }}
        title="Eliminar ejecución"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        danger
        busy={deleting}
        onConfirm={confirmDeleteRun}
      >
        {run ? (
          <>
            <p>¿Seguro que quieres eliminar esta ejecución del historial?</p>
            <div className="confirm-dialog-highlight">   
            </div>
            <p className="note">
              Se borrarán resultados, evidencias, agentes e insights asociados.
            </p>
          </>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
