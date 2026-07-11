import PropTypes from 'prop-types'
import {
  Avatar,
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { Button } from './Button'
import { PriorityChip } from './PriorityChip'

export function ClusterInsightCard({
  clusterLabel,
  title,
  priority,
  score = 0,
  metricChips = [],
  selectable = false,
  selected = false,
  selectionDisabled = false,
  onSelectChange,
  onViewDetail,
  saved = false,
  actionLabel = 'Agregar al dashboard',
  actionDisabled = false,
  onAction,
  className = '',
}) {
  const avatarLabel =
    clusterLabel === -1 || clusterLabel === 'outliers' ? '!' : String(clusterLabel)

  return (
    <Card
      className={`cluster-insight-card${selected ? ' cluster-insight-card--checked' : ''}${
        saved ? ' cluster-insight-card--saved' : ''
      } ${className}`.trim()}
      sx={{ overflow: 'visible' }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {selectable ? (
            <label className="cluster-insight-card__check" onClick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected}
                disabled={selectionDisabled}
                onChange={(event) => onSelectChange?.(event.target.checked)}
                aria-label={`Seleccionar ${title}`}
              />
            </label>
          ) : null}
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'secondary.main',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            {avatarLabel}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {clusterLabel === -1 ? 'Casos atípicos' : `Grupo ${clusterLabel}`}
                </Typography>
                <Typography variant="h6" component="h4" noWrap title={title}>
                  {title}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                {saved ? (
                  <Chip
                    className="cluster-insight-card__saved-chip"
                    label="Guardado en dashboard"
                    size="small"
                  />
                ) : null}
                <PriorityChip label={priority} />
              </Stack>
            </Stack>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {metricChips.map((chip) => (
                <Chip
                  key={chip.label}
                  label={`${chip.label}: ${chip.value}`}
                  size="small"
                  variant="outlined"
                  sx={{ bgcolor: '#f8fafc' }}
                />
              ))}
            </Stack>

            <Box sx={{ mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, score))}
                sx={{
                  height: 6,
                  borderRadius: 999,
                  bgcolor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': { borderRadius: 999 },
                }}
              />
            </Box>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1.5, px: 2, gap: 1 }}>
        {onViewDetail ? (
          <Button variant="text" size="small" onClick={onViewDetail}>
            Ver detalle
          </Button>
        ) : null}
        {onAction ? (
          <Button variant="secondary" size="small" disabled={actionDisabled} onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardActions>
    </Card>
  )
}

ClusterInsightCard.propTypes = {
  clusterLabel: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  title: PropTypes.string.isRequired,
  priority: PropTypes.oneOf(['Alta', 'Media', 'Baja']).isRequired,
  score: PropTypes.number,
  metricChips: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }),
  ),
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
  selectionDisabled: PropTypes.bool,
  onSelectChange: PropTypes.func,
  onViewDetail: PropTypes.func,
  saved: PropTypes.bool,
  actionLabel: PropTypes.string,
  actionDisabled: PropTypes.bool,
  onAction: PropTypes.func,
  className: PropTypes.string,
}
