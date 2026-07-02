import { useQuery } from '@tanstack/react-query'
import { fetchAgentResults } from '@/api/agents'

export function agentResultsQueryKey(runId) {
  return ['agentResults', runId]
}

export function useAgentResults(runId, options = {}) {
  const { enabled = true, ...queryOptions } = options
  return useQuery({
    queryKey: agentResultsQueryKey(runId),
    queryFn: () => fetchAgentResults(runId),
    enabled: Boolean(runId) && enabled,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  })
}
