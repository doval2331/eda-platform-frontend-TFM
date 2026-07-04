import { useCallback, useEffect, useState } from 'react'

/**
 * Lazy mount + keep-alive for tab panels.
 * Marks the active tab as visited on change; visited panels stay mounted.
 */
export function useLazyTabs(activeTab, initialVisited = []) {
  const [visited, setVisited] = useState(() => {
    const initial = new Set(initialVisited)
    if (activeTab) initial.add(activeTab)
    return initial
  })

  useEffect(() => {
    if (!activeTab) return
    setVisited((prev) => {
      if (prev.has(activeTab)) return prev
      const next = new Set(prev)
      next.add(activeTab)
      return next
    })
  }, [activeTab])

  const isVisited = useCallback((tab) => visited.has(tab), [visited])

  const markVisited = useCallback((tab) => {
    setVisited((prev) => {
      if (prev.has(tab)) return prev
      const next = new Set(prev)
      next.add(tab)
      return next
    })
  }, [])

  return { isVisited, markVisited, visited }
}
