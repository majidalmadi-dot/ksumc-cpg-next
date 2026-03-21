import { NextResponse } from 'next/server'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export async function GET() {
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    supabase: 'not_configured',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('projects').select('id').limit(1)
      checks.supabase = error ? `error: ${error.message}` : 'connected'
    } catch {
      checks.supabase = 'error: connection_failed'
    }
  }

  const allHealthy = checks.supabase !== 'error' && checks.status === 'ok'

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

// Allow HEAD requests for uptime monitors
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
