const AUTH_STORAGE_KEY = 'eda_auth'

export class ApiHttpError extends Error {
  constructor(status, message, payload) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.payload = payload
  }
}

export function getStoredToken() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return parsed?.token || ''
  } catch {
    return ''
  }
}

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '')
export const AUTH_EXPIRED_EVENT = 'eda-auth-expired'

function notifyAuthExpired(status, message) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { status, message },
    }),
  )
}


export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, token, auth = false, headers = {}, timeoutMs = 0, signal } = options
  const finalHeaders = { ...headers }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (!isFormData && body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  const bearer = token || (auth ? getStoredToken() : '')
  if (bearer) {
    finalHeaders.Authorization = `Bearer ${bearer}`
  }

  let timeoutId
  let requestSignal = signal
  if (timeoutMs > 0 && typeof AbortController !== 'undefined') {
    const controller = new AbortController()
    requestSignal = controller.signal
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      signal: requestSignal,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiHttpError(
        408,
        'La solicitud tardó demasiado. Revisa si el backend sigue ocupado y vuelve a intentarlo.',
        null,
      )
    }
    throw err
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId)
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }

  if (!response.ok) {
    const detail = data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e) => e.msg ?? JSON.stringify(e)).join('; ')
          : `Error del servidor (${response.status})`
    if (response.status === 401 && (auth || token || bearer)) {
      notifyAuthExpired(response.status, message)
    }
    throw new ApiHttpError(response.status, message, data)
  }

  return data
}
