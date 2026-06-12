import PropTypes from 'prop-types'
import { FormSelect } from '../../ui'
import { sourceTypeLabel } from '../../utils/projectLabels'

export function PrepareProjectRunsPicker({ projectRuns, selectedRunIndex, onSelectProjectRun }) {
  if (projectRuns.length <= 1) return null

  return (
    <FormSelect
      label="Última ejecución — fuente analizada"
      id="project-run-select-dialog"
      value={selectedRunIndex}
      onChange={(e) => onSelectProjectRun?.(Number(e.target.value))}
      options={projectRuns.map((run, index) => ({
        value: index,
        label: `${run.source_name || sourceTypeLabel(run.source_type)} — ${run.n_samples} incidencias`,
      }))}
    />
  )
}

PrepareProjectRunsPicker.propTypes = {
  projectRuns: PropTypes.array.isRequired,
  selectedRunIndex: PropTypes.number.isRequired,
  onSelectProjectRun: PropTypes.func,
}
