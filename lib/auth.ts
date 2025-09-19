// Authentication utilities
export const ADMIN_SESSION_KEY = 'admin_session'

export interface AdminSession {
  isAuthenticated: boolean
  timestamp: number
  expiresAt: number
}

export const createAdminSession = (): AdminSession => {
  const now = Date.now()
  const expiresAt = now + (24 * 60 * 60 * 1000) // 24 hours
  
  return {
    isAuthenticated: true,
    timestamp: now,
    expiresAt
  }
}

export const isValidAdminSession = (session: AdminSession | null): boolean => {
  if (!session) return false
  if (!session.isAuthenticated) return false
  if (Date.now() > session.expiresAt) return false
  return true
}

export const getAdminSession = (): AdminSession | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const sessionData = sessionStorage.getItem(ADMIN_SESSION_KEY)
    if (!sessionData) return null
    
    const session = JSON.parse(sessionData) as AdminSession
    return isValidAdminSession(session) ? session : null
  } catch {
    return null
  }
}

export const setAdminSession = (session: AdminSession): void => {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
}

export const clearAdminSession = (): void => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
}

export const verifyAdminCode = (code: string): boolean => {
  const validCodes = [
    process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE,
    'admin123' // fallback for development
  ].filter(Boolean)
  
  return validCodes.includes(code)
}