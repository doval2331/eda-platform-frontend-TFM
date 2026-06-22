import { SOURCE_TYPE_OPTIONS } from '@/utils/projectLabels'

export const PREPARE_TAB = {
  origin: 'origin',
  data: 'data',
  params: 'params',
}

export const MODALITY_CARD_OPTIONS = [
  {
    value: 'tabular',
    label: 'Una fuente tabular',
    description: 'CSV, Excel o Parquet con tus incidencias.',
  },
  {
    value: 'project',
    label: 'Escenario multifuente',
    description: 'Varias fuentes en un mismo escenario.',
  },
  {
    value: 'it_ops',
    label: 'Demo IT',
    description: 'Dataset de ejemplo sin subir archivos.',
  },
]

export const AUTO_SOURCE_TYPE = 'auto'

export const SOURCE_TYPE_SELECTION_OPTIONS = [
  { value: AUTO_SOURCE_TYPE, label: 'Automático según archivo' },
  ...SOURCE_TYPE_OPTIONS,
]
