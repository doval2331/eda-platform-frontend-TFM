import PropTypes from 'prop-types'
import { useState } from 'react'
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  detectSourceFileKind,
  formatLabelForKind,
  formatToneForKind,
  getSourceChipTone,
  getSourceFileKindStyle,
} from '@/utils/sourceFileVisual'
import { Button } from './Button'

function SourceChip({ label, tone = 'neutral' }) {
  const style = getSourceChipTone(tone)
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      sx={{
        height: 22,
        fontSize: '0.7rem',
        fontWeight: 600,
        borderColor: style.border,
        color: style.color,
        bgcolor: style.bg,
      }}
    />
  )
}

SourceChip.propTypes = {
  label: PropTypes.string.isRequired,
  tone: PropTypes.string,
}

export function SourceFileCard({
  title,
  subtitle,
  chips = [],
  statusLabel,
  statusTone = 'success',
  detail,
  onRemove,
  removing = false,
  className = '',
  fileKind,
  originalFormat,
  filename,
  normalizedKind,
}) {
  const [expanded, setExpanded] = useState(false)
  const resolvedKind =
    fileKind ||
    detectSourceFileKind({ normalizedKind, originalFormat, filename: filename || subtitle || title })
  const kindStyle = getSourceFileKindStyle(resolvedKind)
  const KindIcon = kindStyle.Icon

  const displayChips =
    chips.length > 0
      ? chips
      : [
          {
            label: formatLabelForKind(resolvedKind, originalFormat, filename || subtitle),
            tone: formatToneForKind(resolvedKind),
          },
        ]

  const statusStyles = {
    success: { border: '#86efac', color: '#15803d', bg: '#f0fdf4', icon: '#16a34a' },
    danger: { border: '#fecaca', color: '#b91c1c', bg: '#fef2f2', icon: '#dc2626' },
    warning: { border: '#fde68a', color: '#b45309', bg: '#fffbeb', icon: '#d97706' },
    neutral: { border: '#cbd5e1', color: '#475569', bg: '#f8fafc', icon: '#64748b' },
  }
  const statusStyle = statusStyles[statusTone] ?? statusStyles.success

  return (
    <Box className={`source-file-card ${className}`.trim()}>
      <Box
        className="source-file-card__icon"
        sx={{ bgcolor: kindStyle.bg, color: kindStyle.color }}
        aria-hidden
      >
        <KindIcon sx={{ fontSize: 28 }} />
      </Box>

      <Box className="source-file-card__body">
        <Typography variant="subtitle2" fontWeight={700} className="source-file-card__title" title={title}>
          {title}
        </Typography>
        {subtitle && subtitle !== title ? (
          <Typography variant="caption" color="text.secondary" display="block" noWrap className="source-file-card__subtitle">
            {subtitle}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap className="source-file-card__chips">
          {displayChips.map((chip) => {
            const label = typeof chip === 'string' ? chip : chip.label
            const tone = typeof chip === 'string' ? 'neutral' : chip.tone || 'neutral'
            return <SourceChip key={label} label={label} tone={tone} />
          })}
        </Stack>
        {detail ? (
          <>
            <Button
              variant="text"
              size="small"
              onClick={() => setExpanded((value) => !value)}
              sx={{ mt: 0.5, px: 0, minHeight: 28 }}
            >
              {expanded ? 'Ocultar detalle' : 'Ver detalle'}
            </Button>
            <Collapse in={expanded}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {detail}
              </Typography>
            </Collapse>
          </>
        ) : null}
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" className="source-file-card__actions">
        {statusLabel ? (
          <Chip
            icon={<CheckCircleOutlineIcon sx={{ fontSize: '16px !important' }} />}
            label={statusLabel}
            size="small"
            variant="outlined"
            sx={{
              height: 28,
              fontWeight: 600,
              borderColor: statusStyle.border,
              color: statusStyle.color,
              bgcolor: statusStyle.bg,
              '& .MuiChip-icon': { color: statusStyle.icon },
            }}
          />
        ) : null}
        {onRemove ? (
          <IconButton
            aria-label="Quitar fuente"
            size="small"
            disabled={removing}
            onClick={onRemove}
            className="source-file-card__remove"
            sx={{
              border: '1px solid #e2e8f0',
              borderRadius: 1.5,
              color: '#64748b',
              '&:hover': { bgcolor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' },
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
    </Box>
  )
}

SourceFileCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  chips: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        tone: PropTypes.string,
      }),
    ]),
  ),
  statusLabel: PropTypes.string,
  statusTone: PropTypes.oneOf(['success', 'danger', 'warning', 'neutral']),
  detail: PropTypes.string,
  onRemove: PropTypes.func,
  removing: PropTypes.bool,
  className: PropTypes.string,
  fileKind: PropTypes.string,
  originalFormat: PropTypes.string,
  filename: PropTypes.string,
  normalizedKind: PropTypes.string,
}
