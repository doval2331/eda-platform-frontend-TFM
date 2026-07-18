import PropTypes from 'prop-types'
import { Stack, Typography } from '@mui/material'
import { useClusterProfiles } from '@/hooks/queries'
import { Card, LoadingSlot } from '@/ui'

function insightClusterId(insight) {
  if (!insight) return null
  const kind = insight.filter_kind || insight.dimension
  if (kind !== 'cluster_label') return null
  const parsed = Number.parseInt(String(insight.filter_value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCatEntry([name, stats]) {
  const mode = stats?.mode ?? '—'
  const pct = stats?.pct_mode
  return pct != null ? `${name}: ${mode} (${pct}%)` : `${name}: ${mode}`
}

export function ConversationInsightClusterCard({ insight, runId, className = '' }) {
  const clusterId = insightClusterId(insight)
  const { data, isLoading } = useClusterProfiles(runId, {
    enabled: Boolean(runId && clusterId != null),
  })

  if (clusterId == null || !runId) return null

  const profile = (data?.perfiles ?? []).find(
    (item) => Number(item.cluster_id) === clusterId,
  )

  if (isLoading) {
    return (
      <Card className={`conv-insight-cluster-card ${className}`.trim()}>
        <LoadingSlot variant="card">
          <Typography variant="body2" color="text.secondary">
            Cargando contexto del grupo…
          </Typography>
        </LoadingSlot>
      </Card>
    )
  }

  if (!profile) return null

  const catHighlights = Object.entries(profile.categorical_stats ?? {})
    .slice(0, 3)
    .map(formatCatEntry)

  return (
    <Card className={`conv-insight-cluster-card ${className}`.trim()}>
      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={700}>
          Contexto del grupo {clusterId}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {profile.size ?? profile.tamano ?? '—'} incidencias
          {profile.pct_total != null ? ` · ${profile.pct_total}% del total` : ''}
        </Typography>
        {profile.interpretation ? (
          <Typography variant="body2">{profile.interpretation}</Typography>
        ) : null}
        {catHighlights.length ? (
          <Typography variant="caption" color="text.secondary" component="p">
            Variables dominantes: {catHighlights.join(' · ')}
          </Typography>
        ) : null}
      </Stack>
    </Card>
  )
}

ConversationInsightClusterCard.propTypes = {
  insight: PropTypes.object,
  runId: PropTypes.string,
  className: PropTypes.string,
}
