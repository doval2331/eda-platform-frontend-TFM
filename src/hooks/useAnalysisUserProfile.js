import { useCallback, useState } from 'react'

export const ANALYSIS_USER_PROFILE_KEY = 'eda-analysis-user-profile'

export const ANALYSIS_PROFILES = {
  NOVICE: 'novice',
  EXPERT: 'expert',
}

function readStoredProfile() {
  try {
    return localStorage.getItem(ANALYSIS_USER_PROFILE_KEY) === ANALYSIS_PROFILES.EXPERT
      ? ANALYSIS_PROFILES.EXPERT
      : ANALYSIS_PROFILES.NOVICE
  } catch {
    return ANALYSIS_PROFILES.NOVICE
  }
}

export function useAnalysisUserProfile() {
  const [profile, setProfile] = useState(readStoredProfile)

  const isExpert = profile === ANALYSIS_PROFILES.EXPERT

  const setExpertProfile = useCallback((expert) => {
    const next = expert ? ANALYSIS_PROFILES.EXPERT : ANALYSIS_PROFILES.NOVICE
    setProfile(next)
    try {
      localStorage.setItem(ANALYSIS_USER_PROFILE_KEY, next)
    } catch {
      // El perfil sigue disponible en memoria cuando el almacenamiento está bloqueado.
    }
  }, [])

  return { profile, isExpert, setExpertProfile }
}
