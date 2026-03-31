import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </Link>

        <h1 className="text-2xl font-bold mb-8">이용약관</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">제1조 (목적)</h2>
            <p>
              이 약관은 Haean(이하 &quot;서비스&quot;)의 이용 조건 및 절차,
              이용자와 서비스 제공자의 권리, 의무 및 책임사항을 규정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제2조 (서비스의 내용)</h2>
            <p>서비스는 다음을 제공합니다:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>영어 시험 지문 분석 및 구조화</li>
              <li>AI 기반 변형문제, 워크북, 동형 모의고사 자동 생성</li>
              <li>AI 채팅을 통한 문제 수정</li>
              <li>DOCX 파일 내보내기</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제3조 (이용 요금)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Free 플랜: 무료 (월 10회 생성, 5개 유형)</li>
              <li>Pro 플랜: 월 29,900원 (무제한 생성, 전체 유형, DNA 분석)</li>
            </ul>
            <p>
              Pro 구독은 월 단위 자동 갱신되며, 갱신일 전 언제든 취소할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제4조 (이용자의 의무)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>타인의 저작물을 무단으로 업로드하지 않을 것</li>
              <li>서비스를 부정한 목적으로 이용하지 않을 것</li>
              <li>계정 정보를 안전하게 관리할 것</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제5조 (면책조항)</h2>
            <p>
              AI가 생성한 문제의 정확성은 높지만 100% 보장하지 않습니다.
              생성된 문제를 실제 시험에 사용하기 전에 검토하시기를 권장합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제6조 (저작권)</h2>
            <p>
              사용자가 업로드한 원본 파일의 저작권은 원저작자에게 있습니다.
              AI가 생성한 변형 문제의 저작권은 서비스 이용자에게 귀속됩니다.
            </p>
          </section>

          <p className="text-xs text-muted-foreground pt-4">
            최종 업데이트: 2026년 3월 30일
          </p>
        </div>
      </div>
    </div>
  )
}
