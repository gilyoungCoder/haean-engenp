// app/api/_lib/auth.ts — API Auth Helper
// Provides requireAuth() for protected API routes.

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

export interface AuthResult {
  userId: string
  user: AuthUser
}

/**
 * Require authentication for an API route.
 * Returns the authenticated user info, or throws a NextResponse with 401.
 *
 * Usage:
 *   const authResult = await requireAuth()
 *   if (authResult instanceof NextResponse) return authResult
 *   const { userId, user } = authResult
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return {
    userId: session.user.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
  }
}
