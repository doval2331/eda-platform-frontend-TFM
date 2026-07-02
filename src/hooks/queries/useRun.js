import { useQuery } from '@tanstack/react-query'
import { fetchRun } from '@/api/pipeline'

export function runQueryKey(runId) {
  return ['run', runId]
}

export function useRun(runId, options = {}) {
  const { enabled = true, ...queryOptions } = options
  return useQuery({
    queryKey: runQueryKey(runId),
    queryFn: () => fetchRun(runId),
    enabled: Boolean(runId) && enabled,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  })
}
