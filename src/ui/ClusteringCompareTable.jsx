import PropTypes from 'prop-types'
import { Box, Paper, Tooltip, Typography } from '@mui/material'
import './results.css'

function formatMetric(value, digits = 2, suffix = '') {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(digits)}${suffix}`
}

function isBetter(primary, baseline, better) {
  if (primary == null || baseline == null || better === 'neutral') return null
  if (Number(primary) === Number(baseline)) return null
  if (better === 'higher') return Number(primary) > Number(baseline) ? 'primary' : 'baseline'
  if (better === 'lower') return Number(primary) < Number(baseline) ? 'primary' : 'baseline'
  return null
}

export function ClusteringCompareTable({
  title = 'Comparativa con DBSCAN (baseline)',
  description = 'DBSCAN se calcula sobre la misma proyección 2D solo para comparar métricas. El scatter, chat e insights usan HDBSCAN.',
  primaryLabel = 'HDBSCAN (principal)',
  baselineLabel = 'DBSCAN (baseline)',
  rows = [],
  className = '',
  highlightBetter = true,
}) {
  const visibleRows = rows.filter((row) => row.primary != null || row.baseline != null)
  if (!visibleRows.length) return null

  return (
    <Paper
      variant="outlined"
      className={`clustering-compare-table ${className}`.trim()}
      sx={{ p: 2, mt: 2, borderColor: '#e2e8f0' }}
    >
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {description ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          {description}
        </Typography>
      ) : null}

      <Box className="clustering-compare-table__scroll">
        <table className="clustering-compare-table__table">
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              <th scope="col">{primaryLabel}</th>
              <th scope="col">{baselineLabel}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const winner = highlightBetter
                ? isBetter(row.primary, row.baseline, row.better ?? 'neutral')
                : null
              const labelCell = row.hint ? (
                <Tooltip title={row.hint} arrow placement="top">
                  <span className="clustering-compare-table__label">{row.label}</span>
                </Tooltip>
              ) : (
                row.label
              )

              return (
                <tr key={row.id}>
                  <th scope="row">{labelCell}</th>
                  <td
                    className={
                      winner === 'primary' ? 'clustering-compare-table__cell--better' : undefined
                    }
                  >
                    {formatMetric(row.primary, row.digits ?? 2, row.suffix ?? '')}
                  </td>
                  <td
                    className={
                      winner === 'baseline' ? 'clustering-compare-table__cell--better' : undefined
                    }
                  >
                    {formatMetric(row.baseline, row.digits ?? 2, row.suffix ?? '')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Box>
    </Paper>
  )
}

ClusteringCompareTable.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  primaryLabel: PropTypes.string,
  baselineLabel: PropTypes.string,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      hint: PropTypes.string,
      primary: PropTypes.number,
      baseline: PropTypes.number,
      digits: PropTypes.number,
      suffix: PropTypes.string,
      better: PropTypes.oneOf(['higher', 'lower', 'neutral']),
    }),
  ),
  className: PropTypes.string,
  highlightBetter: PropTypes.bool,
}
