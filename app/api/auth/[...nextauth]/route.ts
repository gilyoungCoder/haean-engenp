// app/api/auth/[...nextauth]/route.ts — NextAuth.js v5 handler
// Exports GET and POST from the NextAuth handlers configured in lib/auth.

import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
