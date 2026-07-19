/** Utilidades para el mapa visual adaptativo (muchos clusters / muchos puntos). */

export const VIZ_MODE = {
  DETAILED: 'detallado',
  MAP_TABLE: 'mapa_tabla',
  MAP_PAGINATED: 'mapa_paginado',
}

export const SHOW_MODES = {
  ALL: 'all',
  TOP10: 'top10',
  OUTLIERS: 'outliers',
}

export const SIZE_PRESETS = {
  auto: { factor: null, label: 'Auto' },
  small: { factor: 0.82, label: 'Pequeño' },
  medium: { factor: 1, label: 'Medio' },
  large: { factor: 1.35, label: 'Grande' },
}

const CLUSTER_PALETTE = [
  '#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A',
  '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52',
  '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD',
  '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF',
]

const OUTLIER_COLOR = 'rgba(100, 116, 139, 0.55)'
const OUTLIER_COLOR_EMPHASIS = 'rgba(217, 119, 6, 0.75)'
const GOLDEN_RATIO_CONjugate = 137.508

export function resolveVizMode(nClusters) {
  if (nClusters <= 4) return VIZ_MODE.DETAILED
  if (nClusters <= 15) return VIZ_MODE.MAP_TABLE
  return VIZ_MODE.MAP_PAGINATED
}

function outlierRatio(stats) {
  if (!stats?.nPoints) return 0
  return (stats.outlierCount ?? 0) / stats.nPoints
}

/** Oculta atípicos en vistas de grupos cuando saturarían el mapa. */
export function shouldHideOutliersInClusterView(stats) {
  if (!stats?.outlierCount) return false
  const ratio = outlierRatio(stats)
  return (
    ratio > 0.12 ||
    (stats.outlierCount > 150 && stats.nClusters > 10) ||
    (stats.outlierCount > 400 && ratio > 0.05)
  )
}

export function defaultShowMode(statsOrClusters) {
  const stats =
    typeof statsOrClusters === 'number'
      ? { nClusters: statsOrClusters, nPoints: 0, outlierCount: 0 }
      : statsOrClusters

  const ratio = outlierRatio(stats)
  if (ratio > 0.25 || stats.nClusters > 30) return SHOW_MODES.TOP10
  if (ratio > 0.15 && stats.nClusters > 12) return SHOW_MODES.TOP10
  return SHOW_MODES.ALL
}

export function clusterColor(clusterId, { emphasizeOutlier = false } = {}) {
  if (clusterId === -1) return emphasizeOutlier ? OUTLIER_COLOR_EMPHASIS : OUTLIER_COLOR
  if (clusterId >= 0 && clusterId < CLUSTER_PALETTE.length) {
    return CLUSTER_PALETTE[clusterId]
  }
  const hue = (Math.abs(clusterId) * GOLDEN_RATIO_CONjugate) % 360
  const saturation = 68 + (clusterId % 3) * 4
  const lightness = 46 + (clusterId % 4) * 3
  return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`
}

export function computeClusterStats(clusterLabels) {
  const counts = new Map()
  for (const label of clusterLabels) {
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const nonNoise = entries.filter(([id]) => id !== -1)
  const nClusters = nonNoise.length
  const nPoints = clusterLabels.length
  const outlierCount = counts.get(-1) ?? 0

  const rankedClusters = nonNoise.map(([id, size]) => ({
    id,
    size,
    pct: nPoints > 0 ? (size / nPoints) * 100 : 0,
  }))

  const top10Ids = new Set(rankedClusters.slice(0, 10).map((item) => item.id))

  return {
    counts,
    nClusters,
    nPoints,
    outlierCount,
    rankedClusters,
    top10Ids,
    uniqueLabels: [...counts.keys()].sort((a, b) => a - b),
    vizMode: resolveVizMode(nClusters),
    showControls: nClusters > 8 || nPoints > 800,
    showDensityOption: nPoints > 800,
  }
}

function pointVisible(label, showMode, top10Ids, stats) {
  if (showMode === SHOW_MODES.OUTLIERS) return label === -1
  if (label === -1 && shouldHideOutliersInClusterView(stats)) return false
  if (showMode === SHOW_MODES.TOP10) return label !== -1 && top10Ids.has(label)
  return label !== -1 || !shouldHideOutliersInClusterView(stats)
}

function pointSymbol(label, showMode) {
  if (label === -1 && showMode === SHOW_MODES.OUTLIERS) return 'circle-open'
  return 'circle'
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function computeAutoFactor({ totalPoints, visibleCount, hasHighlight, showMode, highlightedCount }) {
  let factor

  if (totalPoints <= 400) factor = 1.45
  else if (totalPoints <= 1500) factor = 1.2
  else if (totalPoints <= 5000) factor = 1.05
  else if (totalPoints <= 12000) factor = 1.15
  else factor = 1.25

  if (showMode === SHOW_MODES.TOP10 || showMode === SHOW_MODES.OUTLIERS) factor += 0.12
  if (visibleCount <= 800) factor += 0.18
  if (hasHighlight && highlightedCount > 0 && highlightedCount <= 400) factor += 0.12

  return factor
}

function presetFactor(sizePreset, context) {
  if (sizePreset === 'auto') return computeAutoFactor(context)
  return SIZE_PRESETS[sizePreset]?.factor ?? 1
}

function baseSizeFromDensity(visibleCount) {
  if (visibleCount <= 150) return 16
  if (visibleCount <= 400) return 14
  if (visibleCount <= 900) return 12
  if (visibleCount <= 2000) return 10
  if (visibleCount <= 5000) return 8
  if (visibleCount <= 10000) return 7
  return 6
}

function highlightedPointSize(highlightedCount, visibleCount, factor) {
  let size
  if (highlightedCount <= 60) size = 22
  else if (highlightedCount <= 150) size = 19
  else if (highlightedCount <= 350) size = 17
  else if (highlightedCount <= 800) size = 15
  else if (highlightedCount <= 1500) size = 13
  else size = 11

  if (visibleCount > 10000) size += 4
  else if (visibleCount > 5000) size += 3
  else if (visibleCount > 2500) size += 2
  else if (visibleCount > 1200) size += 1

  return Math.round(clamp(size * factor, 11, 26))
}

function dimmedPointSize(visibleCount, factor, isOutlier) {
  let size = 5
  if (visibleCount > 12000) size = 3
  else if (visibleCount > 8000) size = 3.5
  else if (visibleCount > 4000) size = 4
  else if (visibleCount > 2000) size = 4.5
  else if (visibleCount > 900) size = 5

  size *= factor
  if (isOutlier) size = Math.max(4, size + 0.5)
  return Math.round(clamp(size, 3, 8))
}

export function resolveMarkerSize({
  visibleCount,
  totalPoints = visibleCount,
  highlightId,
  sizePreset = 'auto',
  isHighlightedPoint = false,
  isOutlier = false,
  highlightedCount = 0,
  showMode = SHOW_MODES.ALL,
}) {
  const hasHighlight = highlightId !== '' && highlightId != null
  const context = {
    totalPoints,
    visibleCount,
    hasHighlight,
    showMode,
    highlightedCount,
  }
  const factor = presetFactor(sizePreset, context)

  if (hasHighlight) {
    if (isHighlightedPoint) {
      return highlightedPointSize(highlightedCount, visibleCount, factor)
    }
    return dimmedPointSize(visibleCount, factor, isOutlier)
  }

  let size = baseSizeFromDensity(visibleCount) * factor
  if (showMode === SHOW_MODES.TOP10) size *= 1.1
  if (showMode === SHOW_MODES.OUTLIERS) size *= 1.08
  if (isOutlier) size = Math.max(5, size - 1)

  return Math.round(clamp(size, 4, 20))
}

export function describeMarkerSizing({ visibleCount, totalPoints, highlightId, sizePreset, showMode, stats }) {
  const highlightedCount =
    highlightId !== '' && highlightId != null
      ? stats?.counts?.get(Number(highlightId)) ?? 0
      : 0

  const sample = resolveMarkerSize({
    visibleCount,
    totalPoints,
    highlightId,
    sizePreset,
    showMode,
    highlightedCount,
    isHighlightedPoint: Boolean(highlightId),
  })

  if (highlightId) {
    return `Grupo resaltado ~${sample}px · fondo atenuado`
  }
  if (sizePreset === 'auto') {
    return `Tamaño auto ~${sample}px según ${visibleCount.toLocaleString('es-ES')} puntos visibles`
  }
  return `Tamaño ~${sample}px`
}

function pointOpacity(label, highlightId, baseOpacity, dimOpacity = 0.1) {
  if (highlightId === '' || highlightId == null) return baseOpacity
  const target = Number(highlightId)
  if (label === target) return 0.95
  if (label === -1) return 0.35
  return dimOpacity
}

function pointColor(label, showMode) {
  return clusterColor(label, { emphasizeOutlier: showMode === SHOW_MODES.OUTLIERS })
}

export function isPointVisible(label, showMode, stats) {
  return pointVisible(label, showMode, stats.top10Ids, stats)
}

export function buildPointStyles({
  clusterLabels,
  showMode,
  highlightId,
  stats,
  sizePreset = 'auto',
}) {
  const hasHighlight = highlightId !== '' && highlightId != null
  const highlightedCount =
    hasHighlight ? stats.counts.get(Number(highlightId)) ?? 0 : 0
  const baseOpacity = stats.nPoints > 5000 ? 0.65 : 0.82

  const colors = []
  const opacities = []
  const sizes = []
  const symbols = []
  const indices = []

  for (let i = 0; i < clusterLabels.length; i++) {
    const label = clusterLabels[i]
    if (!pointVisible(label, showMode, stats.top10Ids, stats)) continue

    indices.push(i)
    colors.push(pointColor(label, showMode))
    opacities.push(pointOpacity(label, highlightId, baseOpacity))
    symbols.push(pointSymbol(label, showMode))
  }

  // Recalculate sizes with final visible count for consistency
  const visibleCount = indices.length
  for (let j = 0; j < indices.length; j++) {
    const label = clusterLabels[indices[j]]
    const isHighlighted = hasHighlight && Number(highlightId) === label
    sizes[j] = resolveMarkerSize({
      visibleCount,
      totalPoints: stats.nPoints,
      highlightId,
      sizePreset,
      showMode,
      highlightedCount,
      isHighlightedPoint: isHighlighted,
      isOutlier: label === -1,
    })
  }

  const lineColors = indices.map((i) =>
    hasHighlight && Number(highlightId) === clusterLabels[i] ? '#ffffff' : 'rgba(0,0,0,0)',
  )
  const lineWidths = indices.map((i) =>
    hasHighlight && Number(highlightId) === clusterLabels[i] ? 1.5 : 0,
  )

  return { indices, colors, opacities, sizes, symbols, visibleCount, lineColors, lineWidths }
}

export function buildDetailedTraces({
  X_2d,
  clusterLabels,
  metadata,
  buildHoverCustom,
  clusterLegendName,
  hovertemplate,
  showMode,
  highlightId,
  stats,
  sizePreset,
}) {
  const visibleLabels = stats.uniqueLabels.filter((label) =>
    pointVisible(label, showMode, stats.top10Ids, stats),
  )

  const visibleCount = clusterLabels.filter((label) =>
    pointVisible(label, showMode, stats.top10Ids, stats),
  ).length

  const hasHighlight = highlightId !== '' && highlightId != null
  const highlightedCount =
    hasHighlight ? stats.counts.get(Number(highlightId)) ?? 0 : 0

  return visibleLabels.map((clusterId) => {
    const isOutlier = clusterId === -1
    const xs = []
    const ys = []
    const customdata = []

    for (let i = 0; i < clusterLabels.length; i++) {
      if (clusterLabels[i] !== clusterId) continue
      xs.push(X_2d[i][0])
      ys.push(X_2d[i][1])
      customdata.push(buildHoverCustom(metadata?.[i], clusterId))
    }

    const isHighlighted = hasHighlight && Number(highlightId) === clusterId
    const opacity = pointOpacity(
      clusterId,
      highlightId,
      stats.nPoints > 5000 ? 0.65 : 0.85,
    )

    return {
      x: xs,
      y: ys,
      type: 'scattergl',
      mode: 'markers',
      name: clusterLegendName(clusterId),
      marker: isOutlier
        ? {
            color: pointColor(clusterId, showMode),
            size: resolveMarkerSize({
              visibleCount,
              totalPoints: stats.nPoints,
              highlightId,
              sizePreset,
              showMode,
              highlightedCount,
              isOutlier: true,
            }),
            symbol: pointSymbol(clusterId, showMode),
            opacity,
          }
        : {
            color: pointColor(clusterId, showMode),
            size: resolveMarkerSize({
              visibleCount,
              totalPoints: stats.nPoints,
              highlightId,
              sizePreset,
              showMode,
              highlightedCount,
              isHighlightedPoint: isHighlighted,
            }),
            opacity,
            line: isHighlighted ? { color: '#fff', width: 1.5 } : undefined,
          },
      customdata,
      hovertemplate,
    }
  })
}

export function buildUnifiedTrace({
  X_2d,
  clusterLabels,
  metadata,
  buildHoverCustom,
  hovertemplate,
  showMode,
  highlightId,
  stats,
  sizePreset,
}) {
  const { indices, colors, opacities, sizes, symbols, lineColors, lineWidths } = buildPointStyles({
    clusterLabels,
    showMode,
    highlightId,
    stats,
    sizePreset,
  })

  const xs = indices.map((i) => X_2d[i][0])
  const ys = indices.map((i) => X_2d[i][1])
  const customdata = indices.map((i) => buildHoverCustom(metadata?.[i], clusterLabels[i]))

  return {
    x: xs,
    y: ys,
    type: 'scattergl',
    mode: 'markers',
    marker: {
      color: colors,
      opacity: opacities,
      size: sizes,
      symbol: symbols,
      line: {
        color: lineColors,
        width: lineWidths,
      },
    },
    customdata,
    hovertemplate,
    showlegend: false,
  }
}

export function buildDensityTrace({ X_2d, indices }) {
  const xs = indices.map((i) => X_2d[i][0])
  const ys = indices.map((i) => X_2d[i][1])

  return {
    x: xs,
    y: ys,
    type: 'histogram2d',
    colorscale: [
      [0, 'rgba(117, 81, 255, 0.05)'],
      [0.25, 'rgba(117, 81, 255, 0.25)'],
      [0.5, 'rgba(117, 81, 255, 0.45)'],
      [0.75, 'rgba(117, 81, 255, 0.65)'],
      [1, 'rgba(117, 81, 255, 0.9)'],
    ],
    showscale: true,
    colorbar: {
      title: 'Densidad',
      thickness: 12,
      len: 0.7,
    },
  }
}
