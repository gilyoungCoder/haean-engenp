// middleware.ts — Intentionally empty
// Auth protection is handled:
//   - Dashboard: client-side useSession() redirect in app/dashboard/page.tsx
//   - API routes: server-side requireAuth() in each route handler
// Keeping middleware empty avoids Edge Runtime cookie parsing issues
// ("Invalid character in header content") that occur with NextAuth.js middleware.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // Match nothing — middleware is effectively disabled
  matcher: [],
}
