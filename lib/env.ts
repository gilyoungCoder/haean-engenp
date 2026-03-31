// lib/env.ts — Environment variable validation
// Validates all required environment variables at startup and exports a typed object.

function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${key}. ` +
      `Please add it to your .env.local file.`
    )
  }
  return value
}

function getOptionalEnv(key: string): string | undefined {
  return process.env[key] || undefined
}

export interface Env {
  // MongoDB Atlas
  MONGODB_URI: string

  // NextAuth.js
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string

  // Google OAuth
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string

  // Kakao OAuth
  KAKAO_CLIENT_ID: string
  KAKAO_CLIENT_SECRET: string

  // Anthropic Claude API
  ANTHROPIC_API_KEY: string

  // Cloudflare R2
  R2_ACCOUNT_ID: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_BUCKET_NAME: string
  R2_PUBLIC_URL: string

  // Toss Payments (optional — keys not yet issued)
  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: string | undefined
  TOSS_PAYMENTS_SECRET_KEY: string | undefined
}

export const env: Env = {
  MONGODB_URI: getRequiredEnv('MONGODB_URI'),
  NEXTAUTH_URL: getRequiredEnv('NEXTAUTH_URL'),
  NEXTAUTH_SECRET: getRequiredEnv('NEXTAUTH_SECRET'),
  GOOGLE_CLIENT_ID: getRequiredEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
  KAKAO_CLIENT_ID: getRequiredEnv('KAKAO_CLIENT_ID'),
  KAKAO_CLIENT_SECRET: getRequiredEnv('KAKAO_CLIENT_SECRET'),
  ANTHROPIC_API_KEY: getRequiredEnv('ANTHROPIC_API_KEY'),
  R2_ACCOUNT_ID: getRequiredEnv('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: getRequiredEnv('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: getRequiredEnv('R2_BUCKET_NAME'),
  R2_PUBLIC_URL: getRequiredEnv('R2_PUBLIC_URL'),
  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: getOptionalEnv('NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY'),
  TOSS_PAYMENTS_SECRET_KEY: getOptionalEnv('TOSS_PAYMENTS_SECRET_KEY'),
}
