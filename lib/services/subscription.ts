// lib/services/subscription.ts — Subscription Management
// Manages plan limits, usage checks, and available features per plan.

import { connectDB } from '@/lib/mongodb'
import type {
  PlanType,
  PlanLimits,
  UserPlanInfo,
  UsageLimitResult,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    generate: 10,
    export: 5,
    types: 5,
    dna: false,
  },
  pro: {
    generate: Infinity,
    export: Infinity,
    types: 10,
    dna: true,
  },
}

/** Free plan users can only access these 5 question types */
const FREE_TYPES = [
  'vocabulary_choice',
  'grammar_choice',
  'blank_inference',
  'sentence_ordering',
  'content_match',
]

// ---------------------------------------------------------------------------
// Internal: Get user subscription from DB
// ---------------------------------------------------------------------------

interface SubscriptionDoc {
  userId: string
  plan: PlanType
  status: string
  currentPeriodEnd?: Date
}

async function getUserSubscription(userId: string): Promise<SubscriptionDoc> {
  await connectDB()

  // Dynamic import to avoid circular dependency with models
  const { default: SubscriptionModel } = await import('@/lib/models/Subscription')

  const sub = await SubscriptionModel.findOne({ userId }).lean()

  if (!sub) {
    // Default to free plan if no subscription found
    return {
      userId,
      plan: 'free',
      status: 'active',
    }
  }

  return {
    userId: sub.userId?.toString() ?? userId,
    plan: (sub.plan as PlanType) ?? 'free',
    status: (sub.status as string) ?? 'active',
    currentPeriodEnd: sub.currentPeriodEnd as Date | undefined,
  }
}

// ---------------------------------------------------------------------------
// Internal: Count monthly usage
// ---------------------------------------------------------------------------

async function countMonthlyUsage(userId: string, action: string): Promise<number> {
  await connectDB()

  const { default: UsageLogModel } = await import('@/lib/models/UsageLog')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const count = await UsageLogModel.countDocuments({
    userId,
    action,
    createdAt: { $gte: startOfMonth },
  })

  return count
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks if the user can generate more questions this month.
 */
export async function checkGenerateLimit(userId: string): Promise<UsageLimitResult> {
  const sub = await getUserSubscription(userId)
  const limits = PLAN_LIMITS[sub.plan]
  const used = await countMonthlyUsage(userId, 'generate')

  const remaining = limits.generate === Infinity
    ? Infinity
    : Math.max(0, limits.generate - used)

  return {
    allowed: remaining > 0,
    remaining,
    plan: sub.plan,
  }
}

/**
 * Checks if the user can export more documents this month.
 */
export async function checkExportLimit(userId: string): Promise<UsageLimitResult> {
  const sub = await getUserSubscription(userId)
  const limits = PLAN_LIMITS[sub.plan]
  const used = await countMonthlyUsage(userId, 'export')

  const remaining = limits.export === Infinity
    ? Infinity
    : Math.max(0, limits.export - used)

  return {
    allowed: remaining > 0,
    remaining,
    plan: sub.plan,
  }
}

/**
 * Checks if the user can use DNA analysis (Pro only).
 */
export async function canUseDna(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId)
  return PLAN_LIMITS[sub.plan].dna
}

/**
 * Returns the question types available for the user based on their plan.
 * Free: first 5 types only. Pro: all types.
 */
export async function getAvailableTypes(userId: string): Promise<string[]> {
  const sub = await getUserSubscription(userId)

  if (sub.plan === 'pro') {
    // Pro users get all available types — dynamic import from rag
    const { loadAllAvailableTypeIds } = await import('@/lib/services/rag')
    return loadAllAvailableTypeIds()
  }

  return FREE_TYPES
}

/**
 * Returns full plan info for the user.
 */
export async function getUserPlanInfo(userId: string): Promise<UserPlanInfo> {
  const sub = await getUserSubscription(userId)
  const limits = PLAN_LIMITS[sub.plan]

  return {
    plan: sub.plan,
    status: sub.status as UserPlanInfo['status'],
    currentPeriodEnd: sub.currentPeriodEnd ?? null,
    limits,
  }
}
