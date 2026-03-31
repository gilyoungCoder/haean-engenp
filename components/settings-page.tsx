"use client"

import { ArrowLeft, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { UsageIndicator } from "@/components/usage-indicator"
import { UpgradePrompt } from "@/components/upgrade-prompt"
import type { PlanType, MonthlyUsage } from "@/lib/types"

interface SettingsPageProps {
  onBack: () => void
  onLogout: () => void
  onUpgrade?: () => void
  userEmail: string
  userName: string
  userImage?: string
  plan: PlanType
  usage: MonthlyUsage
  subscriptionEndDate?: string | null
}

const PLAN_LIMITS = {
  free: { generate: 10, export: 5 },
  pro: { generate: Infinity, export: Infinity },
}

export function SettingsPage({
  onBack,
  onLogout,
  onUpgrade,
  userEmail,
  userName,
  plan,
  usage,
  subscriptionEndDate,
}: SettingsPageProps) {
  const limits = PLAN_LIMITS[plan]

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold">설정</h2>
      </div>

      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-2xl mx-auto w-full">
        {/* Account info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">계정 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">이름</span>
              <span className="text-sm font-medium">{userName || "미설정"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">이메일</span>
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              구독 / 결제
              <Badge variant={plan === "pro" ? "default" : "secondary"} className="text-xs">
                {plan === "pro" ? "Pro" : "Free"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan === "pro" ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">다음 결제일</span>
                  <span className="text-sm font-medium">
                    {subscriptionEndDate
                      ? new Date(subscriptionEndDate).toLocaleDateString("ko-KR")
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">요금</span>
                  <span className="text-sm font-medium">&#8361;29,900/월</span>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  무료 플랜을 사용 중입니다. Pro로 업그레이드하면 무제한으로 이용할 수 있습니다.
                </p>
                <Button size="sm" onClick={onUpgrade}>
                  Pro 업그레이드
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">사용량 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageIndicator
              plan={plan}
              used={usage.generate}
              limit={limits.generate}
              label="문제 생성"
            />
            <UsageIndicator
              plan={plan}
              used={usage.export}
              limit={limits.export}
              label="DOCX 내보내기"
            />
            <UsageIndicator
              plan={plan}
              used={usage.chat}
              limit={plan === "pro" ? Infinity : 50}
              label="AI 채팅"
            />
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">화면 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">테마</span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Upgrade prompt for free users */}
        {plan === "free" && <UpgradePrompt onUpgrade={onUpgrade} />}

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}
