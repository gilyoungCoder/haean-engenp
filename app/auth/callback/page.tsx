"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Check } from "lucide-react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSignup = searchParams.get("from") === "signup"
  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/dashboard")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          {countdown > 0 ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Check className="h-8 w-8 text-primary" />
          )}
        </div>
        <h1 className="text-xl font-semibold">
          {isSignup ? "가입 완료!" : "로그인 완료!"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {countdown > 0
            ? `${countdown}초 후 대시보드로 이동합니다...`
            : "이동 중..."}
        </p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AuthCallbackContent />
    </Suspense>
  )
}
