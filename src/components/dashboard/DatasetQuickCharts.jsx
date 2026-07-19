import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { Card, Feedback, FormSelect, LoadingSlot } from '@/ui'
import { useDatasetExploreProfile } from '@/hooks/queries'

const plotlyFactory =
  typeof createPlotlyComponent === 'function'
    ? createPlotlyComponent
    : createPlotlyComponent?.default

const plotlyCore = Plotly?.default ?? Plotly
const Plot = plotlyFactory(plotlyCore)

function buildHistogramTrace(column) {
  const bins = column.histogram ?? []
  return {
    x: bins.map((item) => (item.bin_start + item.bin_end) / 2),
    y: bins.map((item) => item.count),
    type: 'bar',
    name: column.name,
    marker: { color: '#2563eb' },
    hovertemplate: '%{x:.2f}<br>%{y} registros<extra></extra>',
  }
}

function buildCategoricalTrace(column) {
  const values = column.top_values ?? []
  return {
    x: values.map((item) => item.label),
    y: values.map((item) => item.count),
    type: 'bar',
    name: column.name,
    marker: { color: '#0d9488' },
    hovertemplate: '%{x}<br>%{y} registros<extra></extra>',
  }
}

export function DatasetQuickCharts({ datasetId, showNullsOverview = false, className = '' }) {
  const { data, isLoading, error } = useDatasetExploreProfile(datasetId, {
    enabled: Boolean(datasetId),
  })
  const columns = useMemo(() => data?.columns ?? [], [data?.columns])
  const [selectedColumn, setSelectedColumn] = useState('')

  const columnOptions = useMemo(
    () =>
      columns.map((column) => ({
        value: column.name,
        label: `${column.name} (${column.kind === 'numeric' ? 'numérica' : 'categórica'} · ${column.null_pct?.toFixed?.(1) ?? '—'}% nulos)`,
      })),
    [columns],
  )

  const nullOverview = useMemo(() => {
    const sorted = [...columns].sort((a, b) => (b.null_pct ?? 0) - (a.null_pct ?? 0))
    return sorted.slice(0, 10)
  }, [columns])

  const activeColumn = useMemo(() => {
    const target = selectedColumn || columnOptions[0]?.value
    return columns.find((column) => column.name === target) ?? columns[0] ?? null
  }, [columns, columnOptions, selectedColumn])

  if (!datasetId) return null

  if (isLoading) {
    return (
      <Card className={`dataset-quick-charts ${className}`.trim()}>
        <LoadingSlot variant="chart">
          <Typography variant="body2" color="text.secondary">
            Calculando perfil exploratorio…
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
            : 'No se pudo cargar el perfil exploratorio del dataset.'
        }
      />
    )
  }

  if (!columns.length) {
    return (
      <Feedback
        variant="info"
        message="No hay columnas disponibles para mostrar gráficos exploratorios."
      />
    )
  }

  const plotData =
    activeColumn?.kind === 'numeric'
      ? [buildHistogramTrace(activeColumn)]
      : [buildCategoricalTrace(activeColumn)]

  return (
    <Card className={`dataset-quick-charts ${className}`.trim()}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Perfil del dataset
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Muestra de {data?.n_rows_sampled?.toLocaleString('es-ES') ?? '—'} filas de{' '}
            {data?.n_rows_total?.toLocaleString('es-ES') ?? '—'} totales · {data?.n_cols ?? '—'}{' '}
            columnas
          </Typography>
        </Box>

        <FormSelect
          label="Columna a visualizar"
          id="dataset-quick-chart-column"
          value={activeColumn?.name ?? ''}
          onChange={(event) => setSelectedColumn(event.target.value)}
          options={columnOptions}
        />

        {showNullsOverview && nullOverview.length ? (
          <Plot
            data={[
              {
                x: [...nullOverview].reverse().map((column) => column.null_pct ?? 0),
                y: [...nullOverview].reverse().map((column) => column.name),
                type: 'bar',
                orientation: 'h',
                marker: {
                  color: [...nullOverview]
                    .reverse()
                    .map((column) => column.null_pct ?? 0)
                    .map((value) => (value >= 20 ? '#dc2626' : value >= 5 ? '#d97706' : '#2563eb')),
                },
                hovertemplate: '%{y}<br>%{x:.1f}% nulos<extra></extra>',
              },
            ]}
            layout={{
              autosize: true,
              height: Math.max(200, nullOverview.length * 28),
              margin: { l: 120, r: 16, t: 8, b: 32 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              title: { text: 'Nulos por columna (top 10)', font: { size: 13 } },
              xaxis: { title: '% nulos', range: [0, 100], gridcolor: '#e2e8f0' },
              yaxis: { automargin: true },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        ) : null}

        {activeColumn ? (
          <Typography variant="caption" color="text.secondary">
            Nulos: {activeColumn.null_pct?.toFixed?.(1) ?? '—'}%
            {activeColumn.kind === 'numeric' && activeColumn.mean != null
              ? ` · Media: ${activeColumn.mean.toFixed(2)}`
              : ''}
          </Typography>
        ) : null}

        <Plot
          data={plotData}
          layout={{
            autosize: true,
            height: 320,
            margin: { l: 48, r: 16, t: 12, b: 80 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: '#ffffff',
            xaxis: {
              title: activeColumn?.kind === 'numeric' ? 'Valor' : 'Categoría',
              tickangle: activeColumn?.kind === 'categorical' ? -35 : 0,
            },
            yaxis: { title: 'Frecuencia', gridcolor: '#e2e8f0' },
            showlegend: false,
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
          useResizeHandler
        />
      </Stack>
    </Card>
  )
}

DatasetQuickCharts.propTypes = {
  datasetId: PropTypes.string,
  showNullsOverview: PropTypes.bool,
  className: PropTypes.string,
}
