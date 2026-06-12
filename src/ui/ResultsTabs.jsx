import PropTypes from 'prop-types'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import ScatterPlotOutlinedIcon from '@mui/icons-material/ScatterPlotOutlined'
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined'
import { AppTabs } from './AppTabs'

export function ResultsTabs({
  value,
  onChange,
  showAgentsTab = true,
  className = '',
}) {
  const tabs = [
    {
      value: 'interpretation',
      label: 'Resumen por grupos',
      icon: <SummarizeOutlinedIcon fontSize="small" />,
    },
    {
      value: 'visualization',
      label: 'Mapa visual',
      icon: <ScatterPlotOutlinedIcon fontSize="small" />,
    },
    ...(showAgentsTab
      ? [
          {
            value: 'agents',
            label: 'Análisis asistido',
            icon: <AutoAwesomeOutlinedIcon fontSize="small" />,
          },
        ]
      : []),
  ]

  return (
    <AppTabs
      value={value}
      onChange={onChange}
      tabs={tabs}
      ariaLabel="Vista de resultados"
      className={className}
    />
  )
}

ResultsTabs.propTypes = {
  value: PropTypes.oneOf(['interpretation', 'visualization', 'agents']).isRequired,
  onChange: PropTypes.func.isRequired,
  showAgentsTab: PropTypes.bool,
  className: PropTypes.string,
}
