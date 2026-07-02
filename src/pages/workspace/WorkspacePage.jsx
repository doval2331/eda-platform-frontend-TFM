import { useCallback, useState } from 'react'
import '@/styles/workspace.css'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ConversationDashboardPage } from '@/pages/conversation/ConversationDashboardPage'
import { MetabasePage } from '@/pages/metabase/MetabasePage'
import { WorkspaceFlowTabs } from './WorkspaceFlowTabs'
import { useWorkspaceTabs } from './useWorkspaceTabs'

const FLOW_NAVBAR = {
  analyze: {
    breadcrumbCurrent: 'Incidencias IT',
    title: 'Análisis de incidencias IT',
  },
  explore: {
    breadcrumbCurrent: 'Explorar resultados',
    title: 'Explorar resultados',
  },
  consolidate: {
    breadcrumbCurrent: 'Dashboard conversacional',
    title: 'Tus hallazgos guardados',
  },
  report: {
    breadcrumbCurrent: 'Informes',
    title: 'Informes de incidencias',
  },
}

export function WorkspacePage() {
  const { activeFlowTab, setActiveFlowTab, visitedFlowTabs, isDashboardTab } =
    useWorkspaceTabs()
  const [hasRunResults, setHasRunResults] = useState(false)

  const handleRunStateChange = useCallback(({ hasResults, isNewRun }) => {
    setHasRunResults(Boolean(hasResults))
    if (isNewRun && hasResults) {
      setActiveFlowTab('explore')
    }
  }, [setActiveFlowTab])

  const navbar = FLOW_NAVBAR[activeFlowTab] ?? FLOW_NAVBAR.analyze
  const dashboardFlowStep =
    activeFlowTab === 'explore' || (hasRunResults && activeFlowTab === 'analyze')
      ? 'explore'
      : 'analyze'

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div className="workspace-header__breadcrumb">
          <span className="workspace-header__parent">Plataforma</span>
          <span className="workspace-header__sep" aria-hidden>
            /
          </span>
          <span className="workspace-header__current">{navbar.breadcrumbCurrent}</span>
        </div>
        <h1 className="workspace-header__title">{navbar.title}</h1>
      </header>

      <WorkspaceFlowTabs
        activeTab={activeFlowTab}
        onChange={setActiveFlowTab}
        hasRunResults={hasRunResults}
      />

      <div className="workspace-panels">
        {(visitedFlowTabs.has('analyze') || visitedFlowTabs.has('explore')) && (
          <div
            className="workspace-panel"
            hidden={!isDashboardTab}
            aria-hidden={!isDashboardTab}
          >
            <DashboardPage
              embedded
              flowStepId={dashboardFlowStep}
              onRunStateChange={handleRunStateChange}
            />
          </div>
        )}

        {visitedFlowTabs.has('consolidate') && (
          <div
            className="workspace-panel"
            hidden={activeFlowTab !== 'consolidate'}
            aria-hidden={activeFlowTab !== 'consolidate'}
          >
            <ConversationDashboardPage embedded />
          </div>
        )}

        {visitedFlowTabs.has('report') && (
          <div
            className="workspace-panel"
            hidden={activeFlowTab !== 'report'}
            aria-hidden={activeFlowTab !== 'report'}
          >
            <MetabasePage embedded />
          </div>
        )}
      </div>
    </div>
  )
}
