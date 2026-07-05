import PropTypes from 'prop-types'
import { Typography } from '@mui/material'
import { ModalityCards } from '@/ui'
import { MODALITY_CARD_OPTIONS } from './constants'

export function PrepareOriginTab({ modalidad, onModalidadChange }) {
  return (
    <div className="prepare-data-panel">
      <Typography className="prepare-data-panel__title" component="h3">
        Origen de los datos
      </Typography>
      <ModalityCards
        options={MODALITY_CARD_OPTIONS}
        value={modalidad}
        onChange={onModalidadChange}
      />
    </div>
  )
}

PrepareOriginTab.propTypes = {
  modalidad: PropTypes.string.isRequired,
  onModalidadChange: PropTypes.func.isRequired,
}
