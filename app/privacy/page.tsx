import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </Link>

        <h1 className="text-2xl font-bold mb-8">개인정보처리방침</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. 개인정보의 수집 및 이용 목적</h2>
            <p>
              Haean(이하 &quot;서비스&quot;)은 다음 목적으로 개인정보를 수집합니다:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>회원 가입 및 관리: 이메일, 이름, 프로필 이미지</li>
              <li>서비스 제공: 파일 업로드, 문제 생성, AI 채팅</li>
              <li>결제 처리: Toss Payments를 통한 구독 결제</li>
              <li>서비스 개선: 사용량 통계 (익명화 처리)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>필수: 이메일 주소, 비밀번호(해시 처리)</li>
              <li>선택: 이름, 프로필 이미지 (소셜 로그인 시)</li>
              <li>자동 수집: 서비스 이용 기록, 접속 IP, 브라우저 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. 개인정보의 보유 및 이용 기간</h2>
            <p>
              회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 즉시 파기합니다.
              단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. 개인정보의 제3자 제공</h2>
            <p>
              서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만 결제 처리를 위해 Toss Payments에 필요 최소 정보를 전달합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. 파일 데이터 처리</h2>
            <p>
              업로드된 파일(PDF, 이미지)은 Cloudflare R2에 암호화 저장되며,
              사용자 본인만 접근할 수 있습니다. 사용자가 프로젝트를 삭제하면
              해당 파일도 즉시 영구 삭제됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. 문의</h2>
            <p>
              개인정보 관련 문의는 아래로 연락해 주세요.
            </p>
            <p>이메일: support@haean.app</p>
          </section>

          <p className="text-xs text-muted-foreground pt-4">
            최종 업데이트: 2026년 3월 30일
          </p>
        </div>
      </div>
    </div>
  )
}
