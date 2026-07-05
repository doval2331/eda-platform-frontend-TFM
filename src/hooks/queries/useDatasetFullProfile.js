import { useQuery } from '@tanstack/react-query'
import { fetchDatasetFullProfile } from '@/api/datasets'

export function datasetFullProfileQueryKey(datasetId) {
  return ['datasetFullProfile', datasetId]
}

export function useDatasetFullProfile(datasetId, options = {}) {
  const { enabled = true, ...queryOptions } = options
  return useQuery({
    queryKey: datasetFullProfileQueryKey(datasetId),
    queryFn: () => fetchDatasetFullProfile(datasetId),
    enabled: Boolean(datasetId) && enabled,
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
  })
}
