"use client"

import { Progress } from "@/components/ui/progress"
import type { PlanType } from "@/lib/types"

interface UsageIndicatorProps {
  plan: PlanType
  used: number
  limit: number
  label: string
}

export function UsageIndicator({ plan, used, limit, label }: UsageIndicatorProps) {
  const isUnlimited = plan === "pro"
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = percentage >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={isNearLimit ? "text-destructive font-medium" : "text-muted-foreground"}>
          {isUnlimited ? "무제한" : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={isNearLimit ? "[&>div]:bg-destructive" : ""}
        />
      )}
    </div>
  )
}
