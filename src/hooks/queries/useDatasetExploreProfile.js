import { useQuery } from '@tanstack/react-query'
import { fetchDatasetExploreProfile } from '@/api/datasets'

export function useDatasetExploreProfile(datasetId, options = {}) {
  const enabled = Boolean(datasetId) && (options.enabled ?? true)
  return useQuery({
    queryKey: ['datasetExploreProfile', datasetId],
    queryFn: () => fetchDatasetExploreProfile(datasetId),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
