import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { buildInsightRowModel } from '@/utils/insightPresentation'
import { InsightDetailDialog } from './InsightDetailDialog'
import { InsightListPagination, INSIGHT_PAGE_SIZE } from '../shared/InsightListPagination'
import { InsightsPhaseFooter } from './InsightsPhaseFooter'
import { InsightStepRow } from './InsightStepRow'

export function InsightStepList({
  runId,
  items = [],
  totalCount = 0,
  page = 0,
  pageSize = INSIGHT_PAGE_SIZE,
  onPageChange,
  selectedInsightIds = new Set(),
  addedIds = new Set(),
  onToggleSelect,
  onAskChat,
  onAdd,
  onAddSelected,
  onSummarizeInChat,
  addDisabled = false,
  addLoading = false,
  chatDisabled = false,
  className = '',
}) {
  const models = useMemo(
    () => (items ?? []).map((item) => buildInsightRowModel(runId, item)),
    [items, runId],
  )

  const [activeStep, setActiveStep] = useState(null)
  const selectedCount = selectedInsightIds.size
  const listTotal = totalCount || items.length

  if (!listTotal && !models.length) return null

  return (
    <>
      <div className={`insight-step-list-wrap ${className}`.trim()}>
        <InsightListPagination
          page={page}
          pageSize={pageSize}
          totalCount={listTotal}
          onPageChange={onPageChange}
        />

        {models.length ? (
          <div
            className="insight-step-list agent-panel-section__scroll"
            role="list"
            aria-label="Hallazgos por grupo"
          >
            {models.map((step) => (
              <InsightStepRow
                key={step.id}
                step={step}
                selected={selectedInsightIds.has(step.id)}
                onOpen={setActiveStep}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        ) : (
          <p className="insight-step-list__empty-page">No hay grupos en esta pagina.</p>
        )}

        <InsightListPagination
          page={page}
          pageSize={pageSize}
          totalCount={listTotal}
          onPageChange={onPageChange}
        />

        <InsightsPhaseFooter
          selectedCount={selectedCount}
          onAddSelected={onAddSelected}
          onSummarizeInChat={onSummarizeInChat}
          addDisabled={addDisabled}
          addLoading={addLoading}
          chatDisabled={chatDisabled}
        />
      </div>

      <InsightDetailDialog
        open={Boolean(activeStep)}
        step={activeStep}
        selected={activeStep ? selectedInsightIds.has(activeStep.id) : false}
        added={activeStep ? addedIds.has(activeStep.id) : false}
        onClose={() => setActiveStep(null)}
        onToggleSelect={onToggleSelect}
        onAskChat={onAskChat}
        onAdd={onAdd}
      />
    </>
  )
}

InsightStepList.propTypes = {
  runId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  items: PropTypes.arrayOf(PropTypes.object),
  totalCount: PropTypes.number,
  page: PropTypes.number,
  pageSize: PropTypes.number,
  onPageChange: PropTypes.func,
  selectedInsightIds: PropTypes.instanceOf(Set),
  addedIds: PropTypes.instanceOf(Set),
  onToggleSelect: PropTypes.func,
  onAskChat: PropTypes.func,
  onAdd: PropTypes.func,
  onAddSelected: PropTypes.func,
  onSummarizeInChat: PropTypes.func,
  addDisabled: PropTypes.bool,
  addLoading: PropTypes.bool,
  chatDisabled: PropTypes.bool,
  className: PropTypes.string,
}
