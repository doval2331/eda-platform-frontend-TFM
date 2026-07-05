import { useQuery } from '@tanstack/react-query'
import { fetchClusterProfiles } from '@/api/runs'

export function useClusterProfiles(runId, options = {}) {
  const enabled = Boolean(runId) && (options.enabled ?? true)
  return useQuery({
    queryKey: ['clusterProfiles', runId],
    queryFn: () => fetchClusterProfiles(runId),
    enabled,
    staleTime: 10 * 60 * 1000,
  })
}
