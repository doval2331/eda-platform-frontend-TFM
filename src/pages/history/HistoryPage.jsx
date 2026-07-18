import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Checkbox, CircularProgress, IconButton, LinearProgress, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import '@/styles/history.css'
import '@/styles/app.css'
import { clearAllRuns, deleteRun } from '@/api/pipeline'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { runsListQueryKey, useRunsList } from '@/hooks/queries'
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
  const queryClient = useQueryClient()
  const {
    data: runs = [],
    isLoading: loading,
    isError: runsLoadFailed,
    error: runsLoadError,
    refetch,
  } = useRunsList(50)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [slowLoading, setSlowLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deletingRunId, setDeletingRunId] = useState(null)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchDeleteProgress, setBatchDeleteProgress] = useState(null)
  const [selectedRunIds, setSelectedRunIds] = useState(() => new Set())
  const [confirmState, setConfirmState] = useState(null)

  useEffect(() => {
    const deletedMessage = location.state?.deletedMessage
    if (!deletedMessage) return
    const timer = window.setTimeout(() => {
      setMessage(deletedMessage)
      navigate(location.pathname, { replace: true, state: null })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!loading) return undefined
    const resetTimer = window.setTimeout(() => setSlowLoading(false), 0)
    const timer = window.setTimeout(() => setSlowLoading(true), 7000)
    return () => {
      window.clearTimeout(resetTimer)
      window.clearTimeout(timer)
    }
  }, [loading])

  const selectedRuns = runs.filter((run) => selectedRunIds.has(run.id))
  const selectedCount = selectedRuns.length
  const allVisibleSelected = runs.length > 0 && selectedCount === runs.length
  const someVisibleSelected = selectedCount > 0 && selectedCount < runs.length
  const confirmBusy = Boolean(clearing || deletingRunId || batchDeleting)
  const pendingRun = confirmState?.type === 'single' ? confirmState.run : null
  const pendingSelectedCount = confirmState?.type === 'selected' ? confirmState.runIds.length : 0
  const batchDeletePercent =
    batchDeleteProgress?.total > 0
      ? Math.round((batchDeleteProgress.completed / batchDeleteProgress.total) * 100)
      : 0
  const batchDeleteLabel =
    batchDeleting && batchDeleteProgress
      ? `Eliminando ${batchDeleteProgress.completed}/${batchDeleteProgress.total}...`
      : `Eliminar seleccionadas (${selectedCount})`

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

  function requestDeleteSelectedRuns() {
    if (!selectedCount) return
    setConfirmState({ type: 'selected', runIds: selectedRuns.map((run) => run.id) })
  }

  function requestClearHistory() {
    setConfirmState({ type: 'all' })
  }

  function toggleRunSelection(runId) {
    setSelectedRunIds((current) => {
      const next = new Set(current)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  function toggleAllVisible() {
    setSelectedRunIds((current) => {
      if (runs.length === 0) return new Set()
      const allSelected = runs.every((run) => current.has(run.id))
      return allSelected ? new Set() : new Set(runs.map((run) => run.id))
    })
  }

  async function confirmDeleteRun() {
    const run = confirmState?.run
    if (!run) return

    setDeletingRunId(run.id)
    setError(null)
    setMessage(null)
    try {
      const result = await deleteRun(run.id)
      queryClient.setQueryData(runsListQueryKey(50), (current) =>
        (current ?? []).filter((item) => item.id !== run.id),
      )
      setSelectedRunIds((current) => {
        const next = new Set(current)
        next.delete(run.id)
        return next
      })
      setMessage(result.message ?? 'Ejecución eliminada.')
      setConfirmState(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la ejecución')
    } finally {
      setDeletingRunId(null)
    }
  }

  async function confirmDeleteSelectedRuns() {
    const runIds = confirmState?.type === 'selected' ? confirmState.runIds : []
    if (!runIds.length) return

    setBatchDeleting(true)
    setBatchDeleteProgress({ completed: 0, total: runIds.length, current: 1 })
    setError(null)
    setMessage(null)
    const deletedIds = new Set()
    let deletedCount = 0
    try {
      for (const [index, runId] of runIds.entries()) {
        setBatchDeleteProgress({
          completed: deletedCount,
          total: runIds.length,
          current: index + 1,
        })
        await deleteRun(runId)
        deletedCount += 1
        deletedIds.add(runId)
        queryClient.setQueryData(runsListQueryKey(50), (current) =>
          (current ?? []).filter((item) => item.id !== runId),
        )
        setSelectedRunIds((current) => {
          const next = new Set(current)
          next.delete(runId)
          return next
        })
        setBatchDeleteProgress({
          completed: deletedCount,
          total: runIds.length,
          current: Math.min(index + 2, runIds.length),
        })
      }
      setSelectedRunIds(new Set())
      setMessage(`Se eliminaron ${deletedCount} ejecuciones del historial.`)
      setConfirmState(null)
    } catch (err) {
      if (deletedCount > 0) {
        setConfirmState((current) =>
          current?.type === 'selected'
            ? { ...current, runIds: current.runIds.filter((runId) => !deletedIds.has(runId)) }
            : current,
        )
      }
      const fallbackMessage =
        deletedCount > 0
          ? `Se eliminaron ${deletedCount} de ${runIds.length} ejecuciones, pero hubo un error en el resto.`
          : 'No se pudieron eliminar las ejecuciones'
      setError(err instanceof Error ? `${fallbackMessage} ${err.message}` : fallbackMessage)
    } finally {
      setBatchDeleting(false)
      setBatchDeleteProgress(null)
    }
  }

  async function confirmClearHistory() {
    setClearing(true)
    setError(null)
    setMessage(null)
    try {
      const result = await clearAllRuns()
      queryClient.setQueryData(runsListQueryKey(50), [])
      setSelectedRunIds(new Set())
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
              className="btn-danger"
              onClick={requestDeleteSelectedRuns}
              disabled={loading || confirmBusy || selectedCount === 0}
            >
              {batchDeleteLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={requestClearHistory}
              disabled={loading || clearing || runs.length === 0}
            >
              {clearing ? 'Borrando…' : 'Vaciar historial'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void refetch()} disabled={loading}>
              Actualizar
            </Button>
          </div>
        }
      />

      <Card className="history-table-card">
        <h2 className="history-section-title">Ejecuciones recientes</h2>
        {loading ? (
          <LoadingSlot variant="card">
            <LoadingPanel
              bare
              compact
              title={slowLoading ? 'El historial sigue cargando...' : 'Cargando historial...'}
              description={
                slowLoading
                  ? 'El backend puede estar finalizando un analisis o guardando evidencias. Si tarda demasiado, pulsa Actualizar.'
                  : 'Consultando solo el resumen de ejecuciones recientes.'
              }
            />
          </LoadingSlot>
        ) : runsLoadFailed ? (
          <LoadingSlot variant="card">
            <DataTableEmpty>
              No se pudo cargar el historial:{' '}
              {runsLoadError instanceof Error ? runsLoadError.message : 'error desconocido.'}
              <br />
              <Button
                type="button"
                variant="secondary"
                className="history-retry-button"
                onClick={() => void refetch()}
              >
                Reintentar
              </Button>
            </DataTableEmpty>
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
                    <th className="history-select-cell">
                      <Checkbox
                        size="small"
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected}
                        onChange={toggleAllVisible}
                        inputProps={{ 'aria-label': 'Seleccionar todas las ejecuciones visibles' }}
                        disabled={confirmBusy}
                      />
                    </th>
                    <th>Fecha</th>
                    <th>Escenario</th>
                    <th>Fuente</th>
                    <th>Reducción</th>
                    <th>Puntos</th>
                    <th>Clusters</th>
                    <th>Silhouette</th>
                    <th>Outliers</th>
                    <th className="history-actions-head" aria-label="Acciones">
                      <Tooltip title="Eliminar seleccionadas">
                        <span>
                          <IconButton
                            type="button"
                            size="small"
                            className="history-row-action-btn history-row-action-btn--danger"
                            onClick={requestDeleteSelectedRuns}
                            disabled={confirmBusy || selectedCount === 0}
                            aria-label="Eliminar ejecuciones seleccionadas"
                          >
                            {batchDeleting ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <DeleteOutlineIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className={selectedRunIds.has(run.id) ? 'history-row--selected' : ''}
                    >
                      <td className="history-select-cell">
                        <Checkbox
                          size="small"
                          checked={selectedRunIds.has(run.id)}
                          onChange={() => toggleRunSelection(run.id)}
                          inputProps={{ 'aria-label': `Seleccionar ejecucion ${run.id}` }}
                          disabled={confirmBusy}
                        />
                      </td>
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
        open={confirmState?.type === 'selected'}
        onClose={closeConfirm}
        title="Eliminar ejecuciones seleccionadas"
        description="Esta accion no se puede deshacer."
        confirmLabel="Eliminar seleccionadas"
        cancelLabel="Cancelar"
        danger
        busy={confirmBusy}
        onConfirm={confirmDeleteSelectedRuns}
      >
        <p>{`Seguro que quieres eliminar ${pendingSelectedCount} ejecuciones del historial?`}</p>
        <p className="note">
          Se borraran resultados, evidencias, agentes e insights asociados a cada ejecucion.
        </p>
        {batchDeleting && batchDeleteProgress ? (
          <div className="history-delete-progress" role="status" aria-live="polite">
            <div className="history-delete-progress__header">
              <span>Eliminando ejecuciones...</span>
              <strong>{`${batchDeleteProgress.completed} de ${batchDeleteProgress.total}`}</strong>
            </div>
            <LinearProgress
              variant="determinate"
              value={batchDeletePercent}
              className="history-delete-progress__bar"
            />
            <p className="note">
              {batchDeleteProgress.completed === batchDeleteProgress.total
                ? 'Finalizando borrado y actualizando el historial.'
                : `Procesando ejecucion ${batchDeleteProgress.current} de ${batchDeleteProgress.total}.`}
            </p>
          </div>
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
