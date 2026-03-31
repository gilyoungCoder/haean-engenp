// lib/toss.ts — Toss Payments API client
// Stub implementation. Keys are not yet issued; functions are ready for activation.

const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY || ''
const TOSS_API_BASE = 'https://api.tosspayments.com/v1'

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`
}

interface TossPaymentConfirmation {
  paymentKey: string
  orderId: string
  totalAmount: number
  status: string
  method: string
  approvedAt: string
}

interface TossCancelResult {
  paymentKey: string
  status: string
  cancels: {
    cancelAmount: number
    cancelReason: string
    canceledAt: string
  }[]
}

interface TossBillingKeyResult {
  billingKey: string
  customerKey: string
  cardCompany: string
  cardNumber: string
}

/**
 * Confirm a payment after the user completes the Toss Payments checkout.
 */
export async function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<TossPaymentConfirmation> {
  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Toss confirm failed: ${error.message || res.statusText}`)
  }

  return res.json()
}

/**
 * Cancel a subscription payment.
 */
export async function cancelSubscription(
  paymentKey: string,
  reason: string
): Promise<TossCancelResult> {
  const res = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason: reason }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Toss cancel failed: ${error.message || res.statusText}`)
  }

  return res.json()
}

/**
 * Issue a billing key for recurring subscription payments.
 */
export async function getBillingKey(
  authKey: string,
  customerKey: string
): Promise<TossBillingKeyResult> {
  const res = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authKey, customerKey }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Toss billing key failed: ${error.message || res.statusText}`)
  }

  return res.json()
}
