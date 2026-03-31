// app/api/payments/confirm/route.ts — Toss Payment Confirm
// Confirms payment with Toss API and upgrades subscription to Pro.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Subscription from '@/lib/models/Subscription'

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'
const PRO_AMOUNT = 29900 // KRW

interface ConfirmBody {
  paymentKey: string
  orderId: string
  amount: number
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const body = (await request.json()) as ConfirmBody

    if (!body.paymentKey || !body.orderId || !body.amount) {
      return NextResponse.json(
        { error: 'paymentKey, orderId, amount는 필수입니다.' },
        { status: 400 }
      )
    }

    // Verify amount matches expected Pro price
    if (body.amount !== PRO_AMOUNT) {
      return NextResponse.json(
        { error: '결제 금액이 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { error: '결제 시스템이 아직 준비되지 않았습니다.' },
        { status: 503 }
      )
    }

    // Call Toss Payments confirm API
    const authHeader = Buffer.from(`${secretKey}:`).toString('base64')

    const tossResponse = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: body.amount,
      }),
    })

    if (!tossResponse.ok) {
      const errorData = (await tossResponse.json()) as { message?: string; code?: string }
      console.error('[payments/confirm] Toss error:', errorData)
      return NextResponse.json(
        { error: errorData.message ?? '결제 확인에 실패했습니다.', code: errorData.code },
        { status: 400 }
      )
    }

    const paymentData = (await tossResponse.json()) as { status: string }

    await connectDB()

    // Update subscription to Pro
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await Subscription.findOneAndUpdate(
      { userId },
      {
        plan: 'pro',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        tossPaymentKey: body.paymentKey,
        tossOrderId: body.orderId,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      success: true,
      plan: 'pro',
      paymentStatus: paymentData.status,
    })
  } catch (err: unknown) {
    console.error('[payments/confirm] Error:', err)
    const message = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
