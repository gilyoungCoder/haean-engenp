// app/api/payments/webhook/route.ts — Toss Webhook (public, no auth)
// Verifies webhook signature and updates subscription status.

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Subscription from '@/lib/models/Subscription'

interface TossWebhookPayload {
  eventType: string
  data: {
    paymentKey: string
    orderId: string
    status: string
    cancels?: Array<{
      cancelReason: string
      canceledAt: string
    }>
  }
}

/**
 * Verify Toss webhook signature using HMAC-SHA256.
 * Returns true if valid, false otherwise.
 */
async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY
  if (!secretKey || !signature) return false

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    )
    const computedSignature = Buffer.from(signatureBuffer).toString('base64')
    return computedSignature === signature
  } catch {
    return false
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-tosspayments-signature')

    // Verify signature (skip if secret key not configured yet)
    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY
    if (secretKey) {
      const isValid = await verifyWebhookSignature(rawBody, signature)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    }

    const payload = JSON.parse(rawBody) as TossWebhookPayload

    await connectDB()

    const { eventType, data } = payload

    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED': {
        const subscription = await Subscription.findOne({
          tossPaymentKey: data.paymentKey,
        })

        if (!subscription) {
          console.warn(
            '[webhook] No subscription found for paymentKey:',
            data.paymentKey
          )
          return NextResponse.json({ received: true })
        }

        switch (data.status) {
          case 'DONE':
            subscription.plan = 'pro'
            subscription.status = 'active'
            break

          case 'CANCELED':
          case 'PARTIAL_CANCELED':
            subscription.plan = 'free'
            subscription.status = 'canceled'
            subscription.currentPeriodEnd = new Date()
            break

          case 'EXPIRED':
            subscription.plan = 'free'
            subscription.status = 'canceled'
            break

          case 'WAITING_FOR_DEPOSIT':
            // Payment pending, no action needed
            break

          default:
            console.warn('[webhook] Unhandled payment status:', data.status)
        }

        await subscription.save()
        break
      }

      default:
        console.warn('[webhook] Unhandled event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    console.error('[webhook] Error:', err)
    // Always return 200 to prevent Toss from retrying indefinitely
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}
