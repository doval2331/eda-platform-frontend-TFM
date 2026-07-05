import PropTypes from 'prop-types'
import { Stack, Typography } from '@mui/material'
import { Card, Feedback, LoadingSlot } from '@/ui'
import { useClusterProfiles } from '@/hooks/queries'

export function ClusterProfilesSummary({ runId, nClusters = 0, className = '' }) {
  const enabled = Boolean(runId) && Number(nClusters) > 30
  const { data, isLoading, error } = useClusterProfiles(runId, { enabled })

  if (!enabled) return null

  if (isLoading) {
    return (
      <Card className={className}>
        <LoadingSlot variant="chart">
          <Typography variant="body2" color="text.secondary">
            Cargando perfiles de clusters…
          </Typography>
        </LoadingSlot>
      </Card>
    )
  }

  if (error || !data?.perfiles?.length) {
    return (
      <Feedback
        variant="warning"
        message="Hay muchos clusters; no se pudieron cargar los perfiles resumidos."
      />
    )
  }

  const topProfiles = (data.perfiles ?? [])
    .filter((profile) => !profile.es_ruido)
    .slice(0, 10)

  return (
    <Card className={`cluster-profiles-summary ${className}`.trim()}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          Top clusters ({data.n_clusters} detectados)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Modo de visualización recomendado: {data.modo_viz ?? 'resumen'}
        </Typography>
        <Stack spacing={1}>
          {topProfiles.map((profile) => (
            <div key={profile.cluster_label} className="cluster-profile-row">
              <Typography variant="body2" fontWeight={600}>
                Cluster {profile.cluster_label} · {profile.tamano ?? profile.size ?? '—'} incidencias
              </Typography>
              {profile.descripcion ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  {profile.descripcion}
                </Typography>
              ) : null}
            </div>
          ))}
        </Stack>
      </Stack>
    </Card>
  )
}

ClusterProfilesSummary.propTypes = {
  runId: PropTypes.string,
  nClusters: PropTypes.number,
  className: PropTypes.string,
}
