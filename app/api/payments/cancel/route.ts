// app/api/payments/cancel/route.ts — Cancel Subscription
// Cancels the user's Pro subscription and downgrades to free.

import { NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Subscription from '@/lib/models/Subscription'

export async function POST(): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    await connectDB()

    const subscription = await Subscription.findOne({ userId })

    if (!subscription) {
      return NextResponse.json(
        { error: '구독 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (subscription.plan === 'free') {
      return NextResponse.json(
        { error: '이미 무료 플랜을 사용 중입니다.' },
        { status: 400 }
      )
    }

    // If Toss billing key exists, cancel the recurring payment
    if (subscription.tossBillingKey) {
      const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY
      if (secretKey) {
        try {
          const authHeader = Buffer.from(`${secretKey}:`).toString('base64')
          await fetch(
            `https://api.tosspayments.com/v1/billing/${subscription.tossBillingKey}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/json',
              },
            }
          )
        } catch (tossErr) {
          console.warn('[payments/cancel] Toss billing cancel failed:', tossErr)
          // Continue with local cancellation even if Toss call fails
        }
      }
    }

    // Update subscription to canceled/free
    // The subscription remains active until the current period ends
    subscription.status = 'canceled'
    // Set plan to free immediately (or keep pro until period end, depending on policy)
    // For now: immediate downgrade
    subscription.plan = 'free'
    subscription.tossBillingKey = undefined
    await subscription.save()

    return NextResponse.json({
      success: true,
      plan: 'free',
      message: '구독이 취소되었습니다.',
    })
  } catch (err: unknown) {
    console.error('[payments/cancel] Error:', err)
    const message = err instanceof Error ? err.message : '구독 취소 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
