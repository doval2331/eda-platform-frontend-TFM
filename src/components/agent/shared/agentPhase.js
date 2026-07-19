export function resolveAgentPhase({ recommendations, insights, strategyConfirmed }) {
  if (insights.length > 0) return 'review'
  if (recommendations.length > 0 && strategyConfirmed) return 'interpret'
  return 'strategy'
}
