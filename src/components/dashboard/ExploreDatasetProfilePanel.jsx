import PropTypes from 'prop-types'
import { Stack } from '@mui/material'
import { ConversationDataQualityPanel } from '@/components/conversation/dashboard/ConversationDataQualityPanel'
import { useDatasetExploreProfile, useDatasetFullProfile } from '@/hooks/queries'
import { LoadingPanel, LoadingSlot } from '@/ui'
import { DatasetBusinessBreakdown } from './DatasetBusinessBreakdown'
import { DatasetHistogramGrid } from './DatasetHistogramGrid'
import { DatasetQualitySummary } from './DatasetQualitySummary'
import { DatasetQuickCharts } from './DatasetQuickCharts'

export function ExploreDatasetProfilePanel({ datasetId, isExpert = false, className = '' }) {
  const exploreProfile = useDatasetExploreProfile(datasetId, { enabled: Boolean(datasetId) })
  const fullProfile = useDatasetFullProfile(datasetId, { enabled: Boolean(datasetId) })

  if (!datasetId) return null

  if (exploreProfile.isLoading || fullProfile.isLoading) {
    return (
      <LoadingSlot variant="chart">
        <LoadingPanel bare compact title="Cargando perfil…" />
      </LoadingSlot>
    )
  }

  return (
    <Stack spacing={2} className={`explore-dataset-profile ${className}`.trim()}>
      {!isExpert ? <DatasetQualitySummary datasetId={datasetId} /> : null}
      <DatasetHistogramGrid datasetId={datasetId} />
      <DatasetBusinessBreakdown datasetId={datasetId} />
      <DatasetQuickCharts datasetId={datasetId} showNullsOverview />
      {isExpert ? <ConversationDataQualityPanel datasetId={datasetId} /> : null}
    </Stack>
  )
}

ExploreDatasetProfilePanel.propTypes = {
  datasetId: PropTypes.string,
  isExpert: PropTypes.bool,
  className: PropTypes.string,
}
