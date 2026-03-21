import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/auth', '/api/health']
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/images']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next()
  }

  // In demo mode (no Supabase configured), allow all routes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return NextResponse.next()

  // Check for auth or demo mode
  const supabaseAuth = request.cookies.get('sb-ufxqmmhfskbvxitahovo-auth-token')
    || request.cookies.get('sb-access-token')
  const demoMode = request.cookies.get('cpg-demo-mode')

  if (!supabaseAuth && demoMode?.value !== 'true') {
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
