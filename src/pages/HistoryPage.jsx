import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/history.css'
import '../styles/app.css'
import { fetchRun, listRuns } from '../api/pipeline'
import { RunKpis } from '../components/RunKpis'
import { Scatter2D } from '../Scatter2D'
import {
  Button,
  Card,
  Feedback,
  SectionHeader,
  DataTableEmpty,
  DataTableRoot,
  DataTableScroll,
  DataTableTable,
} from '../ui'
import { formatModality } from '../utils/runMetrics'

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

export function HistoryPage() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

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

  async function openRun(runId) {
    setDetailLoading(true)
    setError(null)
    try {
      const detail = await fetchRun(runId)
      setSelected(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la ejecución')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="history-page">
      <Card as="header" className="shell-header">
        <SectionHeader
          titleAs="h1"
          eyebrow="Persistencia"
          title="Historial de ejecuciones"
          description="Consultas guardadas en PostgreSQL. Abre una fila para ver el gráfico sin volver a ejecutar el pipeline."
          rightSlot={
            <Button type="button" variant="secondary" onClick={loadList} disabled={loading}>
              Actualizar
            </Button>
          }
        />
      </Card>

      {error ? <Feedback variant="danger" message={error} /> : null}

      <Card className="history-table-card">
        <h2 className="history-section-title">Ejecuciones recientes</h2>
        {loading ? (
          <p className="muted">Cargando historial…</p>
        ) : runs.length === 0 ? (
          <DataTableEmpty>
            Aún no hay ejecuciones. Ve al{' '}
            <Link to="/">análisis exploratorio</Link> y pulsa Ejecutar pipeline.
          </DataTableEmpty>
        ) : (
          <DataTableRoot variant="embedded">
            <DataTableScroll>
              <DataTableTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Modalidad</th>
                    <th>Reducción</th>
                    <th>Puntos</th>
                    <th>Clusters</th>
                    <th>Silhouette</th>
                    <th>Outliers</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className={
                        selected?.id === run.id ? 'history-row--active' : undefined
                      }
                    >
                      <td>{formatDate(run.created_at)}</td>
                      <td>{formatModality(run.modality)}</td>
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
                        <Button
                          type="button"
                          variant="secondary"
                          className="btn-sm"
                          disabled={detailLoading}
                          onClick={() => openRun(run.id)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTableTable>
            </DataTableScroll>
          </DataTableRoot>
        )}
      </Card>

      {selected ? (
        <Card className="panel-results history-detail-card">
          <div className="panel-header panel-header--stacked">
            <div>
              <h2>Detalle — {formatDate(selected.created_at)}</h2>
              <p className="muted history-detail-meta">
                {formatModality(selected.modality)} · {selected.reduction_method} · seed{' '}
                {selected.seed} · id{' '}
                <code className="history-run-id">{selected.id.slice(0, 8)}…</code>
              </p>
            </div>
          </div>
          <RunKpis result={selected.result} runMeta={selected} />

          <Scatter2D
            X_2d={selected.result?.X_2d}
            clusterLabels={selected.result?.cluster_labels}
            metadata={selected.result?.metadata}
          />

          <p className="legend-note note">
            Color = cluster HDBSCAN; gris = outlier (-1). Datos recuperados del historial.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
