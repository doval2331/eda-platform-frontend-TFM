import PropTypes from 'prop-types'
import { useState } from 'react'
import { Scatter2D } from '@/Scatter2D'
import { ClusterProfilesSummary } from './ClusterProfilesSummary'
import { ExploreDatasetProfilePanel } from './ExploreDatasetProfilePanel'

const VIZ_TABS = [
  { id: 'clusters', label: 'Mapa de clusters' },
  { id: 'profile', label: 'Perfil de datos' },
]

export function ExploreVisualizationPanel({
  resultado,
  lastRun,
  datasetId,
  nClusters,
  isExpert = false,
}) {
  const [activeTab, setActiveTab] = useState('clusters')

  return (
    <div className="explore-visualization">
      <div className="explore-visualization__tabs" role="tablist" aria-label="Vistas de exploración">
        {VIZ_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`explore-visualization__tab${
              activeTab === tab.id ? ' explore-visualization__tab--active' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'clusters' ? (
        <div className="explore-visualization__panel" role="tabpanel">
          <Scatter2D
            X_2d={resultado?.X_2d}
            clusterLabels={resultado?.cluster_labels}
            metadata={resultado?.metadata}
          />
          <ClusterProfilesSummary runId={lastRun?.id} nClusters={nClusters} />
          <p className="legend-note note">
            Cada color representa un grupo de incidencias parecidas. Los marcados en gris son casos
            atípicos. Pasa el cursor sobre un punto para ver el detalle.
          </p>
        </div>
      ) : (
        <div className="explore-visualization__panel" role="tabpanel">
          <ExploreDatasetProfilePanel datasetId={datasetId} isExpert={isExpert} />
        </div>
      )}
    </div>
  )
}

ExploreVisualizationPanel.propTypes = {
  resultado: PropTypes.object,
  lastRun: PropTypes.object,
  datasetId: PropTypes.string,
  nClusters: PropTypes.number,
  isExpert: PropTypes.bool,
}
