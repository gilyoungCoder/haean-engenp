"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get("code")
  const errorMessage = searchParams.get("message")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">결제 실패</h1>
        <p className="text-sm text-muted-foreground">
          {errorMessage ?? "결제 처리 중 문제가 발생했습니다."}
        </p>
        {errorCode && (
          <p className="text-xs text-muted-foreground">
            오류 코드: {errorCode}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              대시보드로 돌아가기
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button>
              <RotateCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <PaymentFailContent />
    </Suspense>
  )
}
