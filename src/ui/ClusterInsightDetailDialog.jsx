import PropTypes from 'prop-types'
import { Box, Chip, Divider, Grid, LinearProgress, Stack, Typography } from '@mui/material'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { PriorityChip } from './PriorityChip'

export function ClusterInsightDetailDialog({
  open,
  onClose,
  clusterLabel,
  title,
  fullTitle,
  priority,
  score = 0,
  criterionLabel,
  summary = '',
  recommendation = '',
  metrics = [],
  onAddToDashboard,
  addDisabled = false,
  addLabel = 'Agregar al dashboard',
}) {
  const groupLabel =
    clusterLabel === -1 ? 'Casos atípicos' : `Grupo ${clusterLabel}`

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={groupLabel}
      size="wide"
      panelClassName="cluster-detail-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {onAddToDashboard ? (
            <Button variant="primary" disabled={addDisabled} onClick={onAddToDashboard}>
              {addLabel}
            </Button>
          ) : null}
        </>
      }
    >
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {fullTitle && fullTitle !== title ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {fullTitle}
              </Typography>
            ) : null}
            {criterionLabel ? (
              <Chip
                label={`Criterio activo: ${criterionLabel}`}
                size="small"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ) : null}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Intensidad del criterio
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, score))}
              sx={{
                height: 8,
                borderRadius: 999,
                bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': { borderRadius: 999 },
              }}
            />
          </Box>
          <PriorityChip label={priority} />
        </Stack>

        {summary ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
              Resumen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {summary}
            </Typography>
          </Box>
        ) : null}

        {metrics.length ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Métricas del grupo
            </Typography>
            <Grid container spacing={1.5}>
              {metrics.map((metric) => (
                <Grid item xs={6} sm={4} key={metric.label}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">
                      {metric.label}
                    </Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {metric.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : null}

        {recommendation ? (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                Acción recomendada
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {recommendation}
              </Typography>
            </Box>
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}

ClusterInsightDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  clusterLabel: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  title: PropTypes.string.isRequired,
  fullTitle: PropTypes.string,
  priority: PropTypes.oneOf(['Alta', 'Media', 'Baja']).isRequired,
  score: PropTypes.number,
  criterionLabel: PropTypes.string,
  summary: PropTypes.string,
  recommendation: PropTypes.string,
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }),
  ),
  onAddToDashboard: PropTypes.func,
  addDisabled: PropTypes.bool,
  addLabel: PropTypes.string,
}
