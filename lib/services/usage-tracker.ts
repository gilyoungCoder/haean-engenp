// lib/services/usage-tracker.ts — Usage Tracking
// Records API usage and retrieves monthly usage statistics.

import { connectDB } from '@/lib/mongodb'
import type { MonthlyUsage, UsageAction } from '@/lib/types'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Records a usage event for the given user.
 * Fire-and-forget — does not block the calling operation.
 */
export async function trackUsage(
  userId: string,
  action: UsageAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await connectDB()

    const { default: UsageLogModel } = await import('@/lib/models/UsageLog')

    await UsageLogModel.create({
      userId,
      action,
      metadata: metadata ?? {},
    })
  } catch (err) {
    // Usage tracking should never block or crash the main operation
    console.error(
      '[usage-tracker] Failed to track usage:',
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Returns the monthly usage counts for the given user.
 * Counts from the 1st of the current month.
 */
export async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  try {
    await connectDB()

    const { default: UsageLogModel } = await import('@/lib/models/UsageLog')

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const pipeline = [
      {
        $match: {
          userId,
          createdAt: { $gte: startOfMonth },
          action: { $in: ['generate', 'export', 'chat', 'structurize'] },
        },
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]

    const results = await UsageLogModel.aggregate(pipeline)

    const usage: MonthlyUsage = {
      generate: 0,
      export: 0,
      chat: 0,
      structurize: 0,
    }

    for (const item of results) {
      const action = item._id as keyof MonthlyUsage
      if (action in usage) {
        usage[action] = item.count as number
      }
    }

    return usage
  } catch (err) {
    console.error(
      '[usage-tracker] Failed to get monthly usage:',
      err instanceof Error ? err.message : err
    )

    return {
      generate: 0,
      export: 0,
      chat: 0,
      structurize: 0,
    }
  }
}
