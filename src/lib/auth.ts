import { supabase, isSupabaseConfigured } from './supabase'
import type { UserRole, UserProfile } from '@/types/database'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  editor: 3,
  reviewer: 2,
  viewer: 1,
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['create', 'read', 'update', 'delete', 'manage_users', 'publish', 'approve'],
  editor: ['create', 'read', 'update', 'delete', 'publish'],
  reviewer: ['read', 'update', 'approve'],
  viewer: ['read'],
}

export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, fullName: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  if (!isSupabaseConfigured) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUserProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  return data
}

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function isRoleAtLeast(role: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole]
}

// 15-minute idle timeout for clinical systems
let idleTimer: ReturnType<typeof setTimeout> | null = null
const IDLE_TIMEOUT = 15 * 60 * 1000

export function startIdleTimer(onTimeout: () => void) {
  const resetTimer = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(onTimeout, IDLE_TIMEOUT)
  }
  if (typeof window !== 'undefined') {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      if (idleTimer) clearTimeout(idleTimer)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }
  return () => {}
}
