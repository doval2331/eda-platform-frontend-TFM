import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ANALYSIS_FLOW_STEPS } from '@/utils/biFlow'

export const FLOW_TAB_IDS = ANALYSIS_FLOW_STEPS.map((step) => step.id)

function normalizeFlowTab(step) {
  return FLOW_TAB_IDS.includes(step) ? step : 'analyze'
}

export function useWorkspaceTabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFlowTab = normalizeFlowTab(searchParams.get('step') ?? 'analyze')
  const [visitedFlowTabs, setVisitedFlowTabs] = useState(() => new Set([activeFlowTab]))

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisitedFlowTabs((prev) => {
        if (prev.has(activeFlowTab)) return prev
        return new Set([...prev, activeFlowTab])
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeFlowTab])

  const setActiveFlowTab = useCallback(
    (tab) => {
      const normalized = normalizeFlowTab(tab)
      setVisitedFlowTabs((prev) => {
        const updated = new Set(prev)
        updated.add(normalized)
        return updated
      })
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (normalized === 'analyze') next.delete('step')
          else next.set('step', normalized)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const isDashboardTab = activeFlowTab === 'analyze' || activeFlowTab === 'explore'

  return {
    activeFlowTab,
    setActiveFlowTab,
    visitedFlowTabs,
    isDashboardTab,
  }
}
