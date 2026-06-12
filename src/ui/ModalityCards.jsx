import PropTypes from 'prop-types'
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material'
import DatasetOutlinedIcon from '@mui/icons-material/DatasetOutlined'
import FolderCopyOutlinedIcon from '@mui/icons-material/FolderCopyOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'

const ICONS = {
  tabular: <DatasetOutlinedIcon />,
  project: <FolderCopyOutlinedIcon />,
  it_ops: <ScienceOutlinedIcon />,
}

export function ModalityCards({ options = [], value, onChange, className = '' }) {
  return (
    <Box
      className={`modality-cards ${className}`.trim()}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 1.5,
      }}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <Card
            key={option.value}
            variant="outlined"
            sx={{
              borderColor: selected ? 'primary.main' : '#e2e8f0',
              bgcolor: selected ? '#eff6ff' : '#fff',
              boxShadow: selected ? '0 0 0 1px #2563eb' : 'none',
            }}
          >
            <CardActionArea onClick={() => onChange?.(option.value)}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', mb: 1 }}>
                  {ICONS[option.value] ?? ICONS.tabular}
                </Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  {option.label}
                </Typography>
                {option.description ? (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {option.description}
                  </Typography>
                ) : null}
              </CardContent>
            </CardActionArea>
          </Card>
        )
      })}
    </Box>
  )
}

ModalityCards.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
    }),
  ),
  value: PropTypes.string,
  onChange: PropTypes.func,
  className: PropTypes.string,
}
