import PropTypes from 'prop-types'
import { Box, Stack, Typography } from '@mui/material'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card, Feedback, LoadingSlot } from '@/ui'
import { useDatasetExploreProfile } from '@/hooks/queries'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

export function DatasetBusinessBreakdown({ datasetId, className = '' }) {
  const { data, isLoading, error } = useDatasetExploreProfile(datasetId, {
    enabled: Boolean(datasetId),
  })

  const categorySla = data?.breakdowns?.category_sla ?? []
  const priorityVolume = data?.breakdowns?.priority_volume ?? []

  if (!datasetId) return null

  if (isLoading) {
    return (
      <Card className={`dataset-business-breakdown ${className}`.trim()}>
        <LoadingSlot variant="chart">
          <Typography variant="body2" color="text.secondary">
            Calculando métricas de negocio…
          </Typography>
        </LoadingSlot>
      </Card>
    )
  }

  if (error) {
    return (
      <Feedback
        variant="warning"
        message={
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las métricas de negocio del dataset.'
        }
      />
    )
  }

  if (!categorySla.length && !priorityVolume.length) return null

  return (
    <Card className={`dataset-business-breakdown ${className}`.trim()}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Contexto de negocio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SLA y volumen por categoría o prioridad cuando el dataset incluye esas columnas.
          </Typography>
        </Box>

        {categorySla.length ? (
          <Plot
            data={[
              {
                x: categorySla.map((item) => item.category),
                y: categorySla.map((item) => item.sla_breach_pct),
                type: 'bar',
                name: 'SLA incumplido',
                marker: {
                  color: categorySla.map((item) =>
                    item.sla_breach_pct >= 40
                      ? '#dc2626'
                      : item.sla_breach_pct >= 20
                        ? '#d97706'
                        : '#0f766e',
                  ),
                },
                customdata: categorySla.map((item) => item.count),
                hovertemplate:
                  '<b>%{x}</b><br>SLA: %{y:.1f}%<br>%{customdata} registros<extra></extra>',
              },
            ]}
            layout={{
              autosize: true,
              height: 300,
              margin: { l: 48, r: 16, t: 12, b: 80 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              title: { text: 'SLA incumplido por categoría', font: { size: 13 } },
              xaxis: { title: 'Categoría', tickangle: -30 },
              yaxis: { title: '% SLA incumplido', gridcolor: '#e2e8f0' },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        ) : null}

        {priorityVolume.length ? (
          <Plot
            data={[
              {
                x: priorityVolume.map((item) => item.label),
                y: priorityVolume.map((item) => item.count),
                type: 'bar',
                marker: { color: '#2563eb' },
                hovertemplate: '%{x}<br>%{y} registros<extra></extra>',
              },
            ]}
            layout={{
              autosize: true,
              height: 260,
              margin: { l: 48, r: 16, t: 12, b: 72 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              title: { text: 'Volumen por prioridad', font: { size: 13 } },
              xaxis: { title: 'Prioridad', tickangle: -20 },
              yaxis: { title: 'Registros', gridcolor: '#e2e8f0' },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        ) : null}
      </Stack>
    </Card>
  )
}

DatasetBusinessBreakdown.propTypes = {
  datasetId: PropTypes.string,
  className: PropTypes.string,
}
