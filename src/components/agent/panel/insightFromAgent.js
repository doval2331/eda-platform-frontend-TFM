import {
  businessInsightAction,
  businessInsightLead,
  businessInsightTitle,
  insightIdentity,
} from '@/utils/insightPresentation'

export function insightFromAgent(runId, item) {
  const riskMap = { high: 85, medium: 55, low: 25 }
  const riskKey = String(item.risk_level ?? '').toLowerCase()
  return {
    id: insightIdentity(runId, item),
    title: businessInsightTitle(item),
    description: [businessInsightLead(item), businessInsightAction(item)].filter(Boolean).join(' '),
    metric_label: 'cluster_agent_risk',
    metric_value: riskMap[riskKey] ?? item.sample_size ?? 0,
    dimension: 'cluster_label',
    filter_kind: 'cluster_label',
    filter_value: String(item.cluster_label),
  }
}
