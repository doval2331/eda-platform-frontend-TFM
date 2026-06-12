import PropTypes from 'prop-types'
import { Box, Tab, Tabs } from '@mui/material'

const tabSx = {
  borderBottom: '1px solid #e2e8f0',
  mb: 2,
  '& .MuiTab-root': {
    textTransform: 'none',
    minHeight: 44,
    fontWeight: 600,
  },
}

export function AppTabs({
  value,
  onChange,
  tabs = [],
  ariaLabel = 'Pestañas',
  className = '',
  variant = 'standard',
  centered = false,
  scrollable = false,
}) {
  return (
    <Tabs
      value={value}
      onChange={(_, next) => {
        if (next != null) onChange?.(next)
      }}
      className={className}
      aria-label={ariaLabel}
      variant={scrollable ? 'scrollable' : variant}
      scrollButtons={scrollable ? 'auto' : false}
      centered={centered}
      sx={tabSx}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={tab.label}
          icon={tab.icon}
          iconPosition={tab.icon ? tab.iconPosition ?? 'start' : undefined}
          disabled={tab.disabled}
        />
      ))}
    </Tabs>
  )
}

AppTabs.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node.isRequired,
      icon: PropTypes.node,
      iconPosition: PropTypes.oneOf(['start', 'end', 'top', 'bottom']),
      disabled: PropTypes.bool,
    }),
  ).isRequired,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['standard', 'fullWidth']),
  centered: PropTypes.bool,
  scrollable: PropTypes.bool,
}

export function TabPanel({
  value,
  panelValue,
  children,
  className = '',
  keepMounted = false,
}) {
  const isActive = value === panelValue

  if (!isActive && !keepMounted) return null

  return (
    <Box
      role="tabpanel"
      hidden={!isActive}
      className={`tab-panel ${className}`.trim()}
      sx={{ display: isActive ? 'block' : 'none' }}
    >
      {children}
    </Box>
  )
}

TabPanel.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  panelValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  keepMounted: PropTypes.bool,
}
