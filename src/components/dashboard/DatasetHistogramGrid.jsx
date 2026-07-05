import PropTypes from 'prop-types'
import { useMemo } from 'react'
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

function pickMosaicColumns(columns, max = 6) {
  const numeric = columns.filter((column) => column.kind === 'numeric' && column.histogram?.length)
  const categorical = columns.filter(
    (column) => column.kind === 'categorical' && column.top_values?.length,
  )
  const picked = []
  let numericIndex = 0
  let categoricalIndex = 0

  while (picked.length < max && (numericIndex < numeric.length || categoricalIndex < categorical.length)) {
    if (numericIndex < numeric.length) picked.push(numeric[numericIndex++])
    if (picked.length < max && categoricalIndex < categorical.length) {
      picked.push(categorical[categoricalIndex++])
    }
  }

  return picked.slice(0, max)
}

function buildMiniTrace(column) {
  if (column.kind === 'numeric') {
    const bins = column.histogram ?? []
    return {
      data: [
        {
          x: bins.map((item) => (item.bin_start + item.bin_end) / 2),
          y: bins.map((item) => item.count),
          type: 'bar',
          marker: { color: '#2563eb' },
          hovertemplate: '%{x:.2f}<br>%{y} registros<extra></extra>',
        },
      ],
      xTitle: 'Valor',
    }
  }

  const values = column.top_values ?? []
  return {
    data: [
      {
        x: values.map((item) => item.label),
        y: values.map((item) => item.count),
        type: 'bar',
        marker: { color: '#0d9488' },
        hovertemplate: '%{x}<br>%{y} registros<extra></extra>',
      },
    ],
    xTitle: 'Categoría',
  }
}

function MiniHistogramCard({ column }) {
  const { data, xTitle } = buildMiniTrace(column)

  return (
    <Box className="dataset-histogram-grid__cell">
      <Typography variant="caption" fontWeight={700} color="text.primary" display="block" mb={0.5}>
        {column.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        {column.kind === 'numeric' ? 'Numérica' : 'Categórica'} ·{' '}
        {column.null_pct?.toFixed?.(1) ?? '—'}% nulos
      </Typography>
      <Plot
        data={data}
        layout={{
          autosize: true,
          height: 180,
          margin: { l: 36, r: 8, t: 4, b: 56 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: '#ffffff',
          xaxis: {
            title: { text: xTitle, font: { size: 10 } },
            tickangle: column.kind === 'categorical' ? -35 : 0,
            tickfont: { size: 9 },
          },
          yaxis: {
            title: { text: 'Freq.', font: { size: 10 } },
            gridcolor: '#e2e8f0',
            tickfont: { size: 9 },
          },
          showlegend: false,
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
        useResizeHandler
      />
    </Box>
  )
}

MiniHistogramCard.propTypes = {
  column: PropTypes.object.isRequired,
}

export function DatasetHistogramGrid({ datasetId, className = '' }) {
  const { data, isLoading, error } = useDatasetExploreProfile(datasetId, {
    enabled: Boolean(datasetId),
  })

  const mosaicColumns = useMemo(
    () => pickMosaicColumns(data?.columns ?? []),
    [data?.columns],
  )

  if (!datasetId) return null

  if (isLoading) {
    return (
      <Card className={`dataset-histogram-grid ${className}`.trim()}>
        <LoadingSlot variant="chart">
          <Typography variant="body2" color="text.secondary">
            Preparando mosaico de distribuciones…
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
            : 'No se pudo cargar el mosaico de distribuciones.'
        }
      />
    )
  }

  if (!mosaicColumns.length) return null

  return (
    <Card className={`dataset-histogram-grid ${className}`.trim()}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Distribuciones rápidas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vista en mosaico de las columnas más representativas del dataset.
          </Typography>
        </Box>

        <div className="dataset-histogram-grid__mosaic">
          {mosaicColumns.map((column) => (
            <MiniHistogramCard key={column.name} column={column} />
          ))}
        </div>
      </Stack>
    </Card>
  )
}

DatasetHistogramGrid.propTypes = {
  datasetId: PropTypes.string,
  className: PropTypes.string,
}
