import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import MicOutlinedIcon from '@mui/icons-material/MicOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'

const TABULAR_FORMATS = new Set(['csv', 'tsv', 'xlsx', 'xlsm', 'json', 'parquet'])
const DOCUMENT_FORMATS = new Set(['docx', 'doc', 'txt', 'md'])
const AUDIO_FORMATS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac', 'mpeg', 'mp4', 'mpga'])

export const SOURCE_FILE_KIND = {
  tabular: 'tabular',
  document: 'document',
  pdf: 'pdf',
  audio: 'audio',
  generic: 'generic',
}

const KIND_STYLES = {
  tabular: {
    bg: '#dcfce7',
    color: '#15803d',
    Icon: TableChartOutlinedIcon,
  },
  document: {
    bg: '#dbeafe',
    color: '#1d4ed8',
    Icon: DescriptionOutlinedIcon,
  },
  pdf: {
    bg: '#fee2e2',
    color: '#b91c1c',
    Icon: PictureAsPdfOutlinedIcon,
  },
  audio: {
    bg: '#f3e8ff',
    color: '#7c3aed',
    Icon: MicOutlinedIcon,
  },
  generic: {
    bg: '#f1f5f9',
    color: '#475569',
    Icon: InsertDriveFileOutlinedIcon,
  },
}

const CHIP_TONES = {
  'format-tabular': { border: '#86efac', color: '#15803d', bg: '#f0fdf4' },
  'format-document': { border: '#93c5fd', color: '#1d4ed8', bg: '#eff6ff' },
  'format-pdf': { border: '#fca5a5', color: '#b91c1c', bg: '#fef2f2' },
  neutral: { border: '#e2e8f0', color: '#64748b', bg: '#f8fafc' },
  category: { border: '#c4b5fd', color: '#6d28d9', bg: '#f5f3ff' },
}

export function detectSourceFileKind({ normalizedKind, originalFormat, filename } = {}) {
  const format = String(originalFormat || extractFormat(filename) || '').toLowerCase()
  if (normalizedKind === 'tabular' || TABULAR_FORMATS.has(format)) {
    return SOURCE_FILE_KIND.tabular
  }
  if (format === 'pdf') return SOURCE_FILE_KIND.pdf
  if (AUDIO_FORMATS.has(format)) return SOURCE_FILE_KIND.audio
  if (normalizedKind === 'text' || DOCUMENT_FORMATS.has(format)) {
    return SOURCE_FILE_KIND.document
  }
  return SOURCE_FILE_KIND.generic
}

export function getSourceFileKindStyle(fileKind) {
  return KIND_STYLES[fileKind] ?? KIND_STYLES.generic
}

export function getSourceChipTone(tone) {
  return CHIP_TONES[tone] ?? CHIP_TONES.neutral
}

function extractFormat(filename) {
  if (!filename || !String(filename).includes('.')) return ''
  const name = String(filename)
  return name.slice(name.lastIndexOf('.') + 1)
}

export function formatLabelForKind(fileKind, originalFormat, filename) {
  const ext = String(originalFormat || extractFormat(filename) || '').toUpperCase()
  if (ext) return ext
  if (fileKind === SOURCE_FILE_KIND.tabular) return 'TABULAR'
  if (fileKind === SOURCE_FILE_KIND.document) return 'DOC'
  if (fileKind === SOURCE_FILE_KIND.audio) return 'AUDIO'
  return 'ARCHIVO'
}

export function formatToneForKind(fileKind) {
  if (fileKind === SOURCE_FILE_KIND.tabular) return 'format-tabular'
  if (fileKind === SOURCE_FILE_KIND.document) return 'format-document'
  if (fileKind === SOURCE_FILE_KIND.pdf) return 'format-pdf'
  return 'neutral'
}
