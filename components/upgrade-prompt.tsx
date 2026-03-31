"use client"

import { Sparkles, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PRO_FEATURES = [
  "무제한 문제 생성",
  "10가지 전체 유형",
  "학교별 DNA 분석",
  "무제한 DOCX 내보내기",
  "우선 지원",
]

interface UpgradePromptProps {
  onUpgrade?: () => void
}

export function UpgradePrompt({ onUpgrade }: UpgradePromptProps) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Pro로 업그레이드
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          무료 사용량을 모두 소진했습니다
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">&#8361;29,900</span>
          <span className="text-sm text-muted-foreground">/월</span>
        </div>
        <Button className="w-full" onClick={onUpgrade}>
          <Sparkles className="h-4 w-4 mr-2" />
          Pro 시작하기
        </Button>
      </CardContent>
    </Card>
  )
}
