// lib/auth.config.ts — NextAuth.js v5 configuration (Edge-compatible)
// No mongoose, no bcrypt. Safe for Edge Runtime.

import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

// Build providers list — only include providers with valid config
const providers: NextAuthConfig['providers'] = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

// Kakao: disabled until business registration is complete
// if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
//   const Kakao = (await import('next-auth/providers/kakao')).default
//   providers.push(Kakao({ clientId: ..., clientSecret: ... }))
// }

export const authConfig: NextAuthConfig = {
  providers,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
