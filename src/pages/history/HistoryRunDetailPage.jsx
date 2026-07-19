import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import '@/styles/app.css'
import '@/styles/history.css'
import { deleteRun } from '@/api/pipeline'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AnalysisFlowStrip, MetabaseFlowCTA, MetabaseFlowNextLink } from '@/components/bi'
import { AgentAnalysisPanel } from '@/components/agent'
import { ClusterInterpretationPanel } from '@/components/ClusterInterpretationPanel'
import { FloatingChatWidget } from '@/components/chat'
import { RunKpis } from '@/components/RunKpis'
import { Scatter2D } from '@/Scatter2D'
import { useLazyTabs } from '@/hooks/useLazyTabs'
import { runQueryKey, useRun } from '@/hooks/queries'
import {
  Button,
  Card,
  Feedback,
  LoadingPanel,
  LoadingSlot,
  PageNavbar,
  ResultsTabs,
  RunMetaChips,
} from '@/ui'
import { formatModality } from '@/utils/runMetrics'
import { ACTIVE_PROJECT_KEY, sourceTypeLabel } from '@/utils/projectLabels'

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
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: run, isLoading: loading, error: queryError } = useRun(runId)
  const [actionError, setActionError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [resultView, setResultView] = useState('interpretation')
  const [chatForceOpen, setChatForceOpen] = useState(false)
  const [chatExternalPrompt, setChatExternalPrompt] = useState(null)
  const consumedNavigationPromptRef = useRef('')

  const { isVisited } = useLazyTabs(run ? resultView : null, run ? ['interpretation'] : [])

  const error =
    actionError ??
    (queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'No se pudo cargar la ejecución'
        : null)

  function handleOpenChatWithPrompt(prompt) {
    setChatExternalPrompt({ text: prompt, at: Date.now() })
    setChatForceOpen(true)
    setResultView('agents')
  }

  function handleChatPromptConsumed() {
    setChatExternalPrompt(null)
    setChatForceOpen(false)
  }

  function handleEditScenario() {
    if (!run?.project_id) return
    localStorage.setItem(ACTIVE_PROJECT_KEY, run.project_id)
    navigate('/', {
      state: {
        editProjectId: run.project_id,
        openPrepareDialog: true,
      },
    })
  }

  useEffect(() => {
    const state = location.state ?? {}
    if (!state.openChat) return
    const promptKey = `${location.key}:${state.chatPrompt ?? ''}`
    if (consumedNavigationPromptRef.current === promptKey) return
    consumedNavigationPromptRef.current = promptKey
    const timer = window.setTimeout(() => {
      if (state.chatPrompt) {
        setChatExternalPrompt({ text: state.chatPrompt, at: Date.now() })
      }
      setChatForceOpen(true)
      navigate(location.pathname, { replace: true, state: null })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.key, location.pathname, location.state, navigate])

  async function confirmDeleteRun() {
    if (!runId || !run) return
    setDeleting(true)
    setActionError(null)
    try {
      const result = await deleteRun(runId)
      queryClient.removeQueries({ queryKey: runQueryKey(runId) })
      navigate('/historial', {
        replace: true,
        state: {
          deletedMessage:
            result.message ?? 'Se eliminó la ejecución y sus datos analíticos asociados.',
        },
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo eliminar la ejecución')
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }

  return (
    <div
      className={`history-page history-detail-page history-run-detail-page${
        loading ? ' history-page--loading' : ''
      }`}
    >
      <PageNavbar
        breadcrumbParent="Historial"
        breadcrumbCurrent="Resultados"
        title={
          run
            ? run.project_name ?? formatModality(run.modality)
            : 'Resultados de ejecución'
        }
       
        rightSlot={
          <div className="history-page-actions">
            {run?.project_id ? (
              <Button type="button" variant="secondary" onClick={handleEditScenario}>
                Editar escenario
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => navigate('/historial')}>
              Volver al historial
            </Button>
            {run ? (
              <MetabaseFlowNextLink currentStepId="explore" runId={run.id} className="decision-link" />
            ) : null}
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
        onClose={() => setActionError(null)}
        position="bottom-right"
      />

      {loading ? (
        <Card className="history-detail-loading-card decision-empty decision-empty--loading">
          <LoadingSlot variant="card">
            <LoadingPanel bare compact title="Cargando resultados…" />
          </LoadingSlot>
        </Card>
      ) : run ? (
        <>
          <RunKpis result={run.result} runMeta={run} />

          <AnalysisFlowStrip currentStepId="explore" compact />
          <MetabaseFlowCTA variant="explore" runId={run.id} />

          <Card className="panel-results history-detail-card">
            <div className="panel-header panel-header--stacked">
              <div>
                <h2>Resultados</h2>
                <RunMetaChips
                  items={[
                    { label: formatDate(run.created_at) },
                    ...(run.source_name
                      ? [{ label: run.source_name }]
                      : run.source_type
                        ? [{ label: sourceTypeLabel(run.source_type) }]
                        : []),
                    { label: run.reduction_method },
                    { label: `Seed ${run.seed}` },
                  ]}
                />
              </div>
            </div>

            <ResultsTabs value={resultView} onChange={setResultView} />

            {isVisited('interpretation') ? (
              <div hidden={resultView !== 'interpretation'} className="results-tab-panel">
                <ClusterInterpretationPanel result={run.result} run={run} />
              </div>
            ) : null}

            {isVisited('visualization') ? (
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
            ) : null}

            {isVisited('agents') ? (
              <div hidden={resultView !== 'agents'} className="results-tab-panel">
                <AgentAnalysisPanel
                  run={run}
                  enabled={resultView === 'agents'}
                  onOpenChatWithPrompt={handleOpenChatWithPrompt}
                />
              </div>
            ) : null}
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
