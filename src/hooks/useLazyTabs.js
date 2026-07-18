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
    if (!activeTab) return undefined
    const timer = window.setTimeout(() => {
      setVisited((prev) => {
        if (prev.has(activeTab)) return prev
        return new Set([...prev, activeTab])
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeTab])

  const isVisited = useCallback((tab) => tab === activeTab || visited.has(tab), [activeTab, visited])

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
