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
      {modalidad === 'it_ops' ? (
        <Typography variant="body2" color="text.secondary">
          Usarás el dataset de demostración IT Ops. No necesitas subir archivos; continúa a
          Parámetros.
        </Typography>
      ) : null}
    </div>
  )
}

PrepareOriginTab.propTypes = {
  modalidad: PropTypes.string.isRequired,
  onModalidadChange: PropTypes.func.isRequired,
}
