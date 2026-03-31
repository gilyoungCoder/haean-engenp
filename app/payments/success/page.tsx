"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConfirming, setIsConfirming] = useState(true)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get("paymentKey")
      const orderId = searchParams.get("orderId")
      const amount = searchParams.get("amount")

      if (!paymentKey || !orderId || !amount) {
        toast("결제 정보가 올바르지 않습니다.")
        router.push("/dashboard")
        return
      }

      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "결제 확인 실패" }))
          throw new Error(data.error ?? "결제 확인 실패")
        }

        setConfirmed(true)
        toast("결제가 완료되었습니다!")

        setTimeout(() => {
          router.push("/dashboard?upgraded=true")
        }, 2000)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "결제 확인 실패"
        toast(msg)
        router.push("/dashboard")
      } finally {
        setIsConfirming(false)
      }
    }

    confirmPayment()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          {isConfirming ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Check className="h-8 w-8 text-primary" />
          )}
        </div>
        <h1 className="text-xl font-semibold">
          {confirmed ? "결제 완료!" : "결제 확인 중..."}
        </h1>
        <p className="text-sm text-muted-foreground">
          {confirmed
            ? "Pro 플랜이 활성화되었습니다. 대시보드로 이동합니다..."
            : "결제를 확인하고 있습니다. 잠시만 기다려주세요."}
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
