'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { signOut as authSignOut } from '@/lib/auth'
import type { UserProfile } from '@/types/database'

interface AuthContextType {
  user: any | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock admin profile for demo mode
const MOCK_DEMO_PROFILE: UserProfile = {
  id: 'demo-user-id',
  email: 'demo@ksumc.med.sa',
  full_name: 'Demo Administrator',
  role: 'admin',
  institution: 'KSUMC',
  specialty: 'Clinical Research',
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If Supabase is not configured, use demo mode
    if (!isSupabaseConfigured) {
      setUser({ id: 'demo-user-id', email: 'demo@ksumc.med.sa' })
      setProfile(MOCK_DEMO_PROFILE)
      setLoading(false)
      return
    }

    // Check initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)

        if (session?.user) {
          // Fetch user profile
          const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setProfile(data)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('Error loading session:', error)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    initSession()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          try {
            const { data } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            setProfile(data)
          } catch (error) {
            console.error('Error loading user profile:', error)
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) {
      // In demo mode, just clear the state
      setUser(null)
      setProfile(null)
      return
    }

    try {
      await authSignOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
