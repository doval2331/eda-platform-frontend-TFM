import PropTypes from 'prop-types'
import { FormControlLabel, Switch, Tooltip } from '@mui/material'

export function AnalysisUserProfileToggle({ isExpert, onChange, className = '' }) {
  return (
    <Tooltip
      title={
        isExpert
          ? 'Hiperparámetros, KPIs técnicos y perfil de calidad del dataset visibles.'
          : 'Análisis guiado con valores recomendados. Activa el perfil experto para ajustar el modelo.'
      }
      placement="bottom"
      arrow
    >
      <FormControlLabel
        className={`analysis-profile-toggle ${className}`.trim()}
        control={
          <Switch
            checked={isExpert}
            onChange={(event) => onChange(event.target.checked)}
            inputProps={{ 'aria-label': 'Perfil de análisis experto' }}
            size="small"
          />
        }
        label={isExpert ? 'Perfil experto' : 'Perfil guiado'}
      />
    </Tooltip>
  )
}

AnalysisUserProfileToggle.propTypes = {
  isExpert: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
}
