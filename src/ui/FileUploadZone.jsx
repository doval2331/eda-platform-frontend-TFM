import PropTypes from 'prop-types'
import { useRef } from 'react'
import { Box, Typography } from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'

export function FileUploadZone({
  accept,
  multiple = false,
  disabled = false,
  onFilesSelected,
  helperText,
  inputKey,
  className = '',
}) {
  const inputRef = useRef(null)

  function handleChange(event) {
    const files = event.target.files
    if (files?.length) onFilesSelected?.(files)
    event.target.value = ''
  }

  return (
    <Box className={`file-upload-zone ${className}`.trim()}>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        className="file-upload-zone__trigger"
        onClick={() => inputRef.current?.click()}
        sx={{
          width: '100%',
          p: 2.5,
          border: '2px dashed #cbd5e1',
          borderRadius: 2,
          bgcolor: '#f8fafc',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          textAlign: 'center',
          '&:hover': disabled
            ? undefined
            : {
                borderColor: 'primary.main',
                bgcolor: '#eff6ff',
              },
        }}
      >
        <CloudUploadOutlinedIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="body2" fontWeight={600}>
          Arrastra archivos o haz clic para seleccionar
        </Typography>
        {helperText ? (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        ) : null}
      </Box>
      <input
        key={inputKey}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        hidden
        onChange={handleChange}
      />
    </Box>
  )
}

FileUploadZone.propTypes = {
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  disabled: PropTypes.bool,
  onFilesSelected: PropTypes.func,
  helperText: PropTypes.string,
  inputKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
}
