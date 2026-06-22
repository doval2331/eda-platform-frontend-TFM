import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CircularProgress, IconButton, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import '@/styles/history.css'
import '@/styles/app.css'
import { clearAllRuns, deleteRun, listRuns } from '@/api/pipeline'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  Button,
  Card,
  Feedback,
  PageNavbar,
  DataTableEmpty,
  DataTableRoot,
  DataTableScroll,
  DataTableTable,
  LoadingPanel,
  LoadingSlot,
} from '@/ui'
import { formatModality } from '@/utils/runMetrics'
import { sourceTypeLabel } from '@/utils/projectLabels'

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

function runLabel(run) {
  return run.project_name ?? formatModality(run.modality)
}

export function HistoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [deletingRunId, setDeletingRunId] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listRuns(50)
      setRuns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    const deletedMessage = location.state?.deletedMessage
    if (!deletedMessage) return
    setMessage(deletedMessage)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const confirmBusy = Boolean(clearing || deletingRunId)
  const pendingRun = confirmState?.type === 'single' ? confirmState.run : null

  function openRun(runId) {
    navigate(`/historial/${runId}`)
  }

  function closeConfirm() {
    if (confirmBusy) return
    setConfirmState(null)
  }

  function requestDeleteRun(run) {
    setConfirmState({ type: 'single', run })
  }

  function requestClearHistory() {
    setConfirmState({ type: 'all' })
  }

  async function confirmDeleteRun() {
    const run = confirmState?.run
    if (!run) return

    setDeletingRunId(run.id)
    setError(null)
    setMessage(null)
    try {
      const result = await deleteRun(run.id)
      setRuns((current) => current.filter((item) => item.id !== run.id))
      setMessage(result.message ?? 'Ejecución eliminada.')
      setConfirmState(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la ejecución')
    } finally {
      setDeletingRunId(null)
    }
  }

  async function confirmClearHistory() {
    setClearing(true)
    setError(null)
    setMessage(null)
    try {
      const result = await clearAllRuns()
      setRuns([])
      setMessage(result.message ?? `Se eliminaron ${result.deleted_runs} ejecuciones.`)
      setConfirmState(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vaciar el historial')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className={`history-page${loading ? ' history-page--loading' : ''}`}>
      <PageNavbar
        breadcrumbParent="Plataforma"
        breadcrumbCurrent="Historial"
        title="Historial de ejecuciones"
        rightSlot={
          <div className="history-page-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={requestClearHistory}
              disabled={loading || clearing || runs.length === 0}
            >
              {clearing ? 'Borrando…' : 'Vaciar historial'}
            </Button>
            <Button type="button" variant="secondary" onClick={loadList} disabled={loading}>
              Actualizar
            </Button>
          </div>
        }
      />

      <Card className="history-table-card">
        <h2 className="history-section-title">Ejecuciones recientes</h2>
        {loading ? (
          <LoadingSlot variant="card">
            <LoadingPanel bare compact title="Cargando historial…" />
          </LoadingSlot>
        ) : runs.length === 0 ? (
          <LoadingSlot variant="card">
            <DataTableEmpty>
            Aún no hay ejecuciones. Ve al{' '}
            <Link to="/">análisis exploratorio</Link> y pulsa Ejecutar pipeline.
            </DataTableEmpty>
          </LoadingSlot>
        ) : (
          <DataTableRoot variant="embedded">
            <DataTableScroll>
              <DataTableTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Escenario</th>
                    <th>Fuente</th>
                    <th>Reducción</th>
                    <th>Puntos</th>
                    <th>Clusters</th>
                    <th>Silhouette</th>
                    <th>Outliers</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td>{formatDate(run.created_at)}</td>
                      <td>{runLabel(run)}</td>
                      <td>
                        {run.source_name ||
                          (run.source_type ? sourceTypeLabel(run.source_type) : '—')}
                      </td>
                      <td>{run.reduction_method}</td>
                      <td>{run.n_samples}</td>
                      <td>{run.metrics?.n_clusters ?? '—'}</td>
                      <td>
                        {run.metrics?.silhouette != null
                          ? Number(run.metrics.silhouette).toFixed(2)
                          : '—'}
                      </td>
                      <td>{run.outliers_count}</td>
                      <td>
                        <div className="history-row-actions">
                          <Tooltip title="Ver resultados">
                            <IconButton
                              type="button"
                              size="small"
                              className="history-row-action-btn"
                              onClick={() => openRun(run.id)}
                              aria-label="Ver resultados"
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <span>
                              <IconButton
                                type="button"
                                size="small"
                                className="history-row-action-btn history-row-action-btn--danger"
                                onClick={() => requestDeleteRun(run)}
                                disabled={deletingRunId === run.id || clearing}
                                aria-label="Eliminar ejecución"
                              >
                                {deletingRunId === run.id ? (
                                  <CircularProgress size={18} color="inherit" />
                                ) : (
                                  <DeleteOutlineIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTableTable>
            </DataTableScroll>
          </DataTableRoot>
        )}
      </Card>

      <ConfirmDialog
        open={confirmState?.type === 'single'}
        onClose={closeConfirm}
        title="Eliminar ejecución"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        danger
        busy={confirmBusy}
        onConfirm={confirmDeleteRun}
      >
        {pendingRun ? (
          <>
            <p>¿Seguro que quieres eliminar esta ejecución del historial?</p>
            <p className="note">
              Se borrarán resultados, evidencias, agentes e insights asociados.
            </p>
          </>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmState?.type === 'all'}
        onClose={closeConfirm}
        title="Vaciar historial"
        description="Se eliminarán todas las ejecuciones guardadas."
        confirmLabel="Vaciar historial"
        cancelLabel="Cancelar"
        danger
        busy={confirmBusy}
        onConfirm={confirmClearHistory}
      >
        <p>¿Borrar todas las ejecuciones del historial?</p>
        <p className="note">
          Se eliminarán runs, evidencias, insights, agentes y dashboard conversacional. El usuario
          de login no se borra.
        </p>
      </ConfirmDialog>

      <Feedback
        open={Boolean(error)}
        variant="danger"
        message={error ?? ''}
        onClose={() => setError(null)}
        position="top-center"
      />
      <Feedback
        open={Boolean(message)}
        variant="success"
        message={message ?? ''}
        onClose={() => setMessage(null)}
        position="top-center"
      />
    </div>
  )
}
