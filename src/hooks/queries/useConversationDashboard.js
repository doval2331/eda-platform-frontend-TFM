import { useQuery } from '@tanstack/react-query'
import { fetchConversationDashboard } from '@/api/conversation'

export function conversationDashboardQueryKey(runId = '') {
  return ['conversationDashboard', runId || 'all']
}

export function useConversationDashboard(runId = '', options = {}) {
  const { enabled = true, ...queryOptions } = options
  return useQuery({
    queryKey: conversationDashboardQueryKey(runId),
    queryFn: () => fetchConversationDashboard(runId || undefined),
    enabled,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  })
}
