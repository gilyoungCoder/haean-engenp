"use client"

import { useEffect } from "react"
import { AlertCircle, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">오류가 발생했습니다</h1>
        <p className="text-sm text-muted-foreground">
          예상치 못한 문제가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            오류 ID: {error.digest}
          </p>
        )}
        <Button onClick={reset}>
          <RotateCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </div>
    </div>
  )
}
