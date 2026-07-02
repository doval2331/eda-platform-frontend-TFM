import { useQuery } from '@tanstack/react-query'
import { listRuns } from '@/api/pipeline'

export function runsListQueryKey(limit = 50) {
  return ['runs', limit]
}

export function useRunsList(limit = 50, options = {}) {
  const { enabled = true, ...queryOptions } = options
  return useQuery({
    queryKey: runsListQueryKey(limit),
    queryFn: () => listRuns(limit),
    enabled,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  })
}
