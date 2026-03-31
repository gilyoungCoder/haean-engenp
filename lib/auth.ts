// lib/auth.ts — NextAuth.js v5 full configuration
// Includes Credentials provider (bcrypt + mongoose).

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import bcrypt from 'bcryptjs'
import clientPromise from './mongodb-client'
import User from './models/User'
import Subscription from './models/Subscription'
import { connectDB } from './mongodb'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    // Inherit Google (and future Kakao) from authConfig
    ...authConfig.providers,
    // Add Credentials (requires mongoose + bcrypt, not Edge-safe)
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        await connectDB()
        const user = await User.findOne({ email: credentials.email })
        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isValid) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      await connectDB()
      await Subscription.create({
        userId: user.id,
        plan: 'free',
        status: 'active',
      })
    },
  },
})
