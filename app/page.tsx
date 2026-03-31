"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Sparkles,
  Eye,
  Dna,
  ShieldCheck,
  Check,
  ChevronDown,
  Menu,
  X,
  Upload,
  Settings2,
  Download,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AmbientBackground } from "@/components/ambient-background"

// Animated counter hook
function useAnimatedCounter(target: number, duration = 2000): number {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = Date.now()
          const animate = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            setCount(Math.floor(progress * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          animate()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return count
}

// Fade-in on scroll
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

function FadeInSection({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  const { ref, visible } = useFadeIn()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="landing-page-root min-h-screen relative">
      <AmbientBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gradient">
            Haean
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors">
              기능
            </a>
            <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">
              사용 방법
            </a>
            <a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors">
              요금
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <span className="text-sm text-white/60">{session.user?.email}</span>
                <Link href="/dashboard">
                  <Button size="sm">대시보드</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                    로그인
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="sm">시작하기</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-white/80"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 px-4 py-4 space-y-3 bg-black/40 glass">
            <a href="#features" className="block text-sm text-white/70" onClick={() => setMobileMenuOpen(false)}>
              기능
            </a>
            <a href="#how-it-works" className="block text-sm text-white/70" onClick={() => setMobileMenuOpen(false)}>
              사용 방법
            </a>
            <a href="#pricing" className="block text-sm text-white/70" onClick={() => setMobileMenuOpen(false)}>
              요금
            </a>
            <div className="pt-2 flex gap-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                  로그인
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button size="sm" className="w-full">시작하기</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-6 border-white/20 text-white/70">
              AI 기반 영어 변형문제 생성기
            </Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              시험 지문을 넣으면,{" "}
              <span className="text-gradient">변형 문제</span>가 나온다
            </h1>
            <p className="text-base md:text-lg text-white/60 mb-8 max-w-2xl mx-auto">
              AI가 고등학교 영어 시험지를 분석하여 고품질 변형 문제, 워크북,
              동형 모의고사를 자동 생성합니다
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg" className="min-w-[180px] relative shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-shadow">
                  무료로 시작하기
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Social proof */}
      <FadeInSection>
        <div className="relative z-10 py-8 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-8 md:gap-16 text-center">
            <div>
              <p className="text-2xl font-bold text-white">100+</p>
              <p className="text-xs text-white/50">학원에서 신뢰</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">4.9/5</p>
              <p className="text-xs text-white/50">평균 만족도</p>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">핵심 기능</h2>
            <p className="text-white/50">AI 기술로 영어 시험 준비의 혁신을 경험하세요</p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: <Eye className="h-6 w-6" />,
                title: "VLM 기반 지문 분석",
                desc: "시험지 이미지를 업로드하면 Vision AI가 정확하게 분석합니다",
              },
              {
                icon: <Dna className="h-6 w-6" />,
                title: "학교별 기출 DNA 분석",
                desc: "학교의 출제 패턴을 분석하여 맞춤형 문제를 생성합니다",
              },
              {
                icon: <Sparkles className="h-6 w-6" />,
                title: "10가지 표준 문제 유형",
                desc: "어법, 어휘, 빈칸추론, 순서배열 등 실전 유형을 지원합니다",
              },
              {
                icon: <ShieldCheck className="h-6 w-6" />,
                title: "자동 검증 & 자기교정",
                desc: "7단계 검증으로 정확한 정답과 해설을 보장합니다",
              },
            ].map((feature) => (
              <FadeInSection key={feature.title}>
                <div className="landing-card rounded-xl p-6 hover-lift h-full hover:scale-[1.02] transition-transform">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/50">{feature.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <FadeInSection>
        <section className="relative z-10 py-16 px-4 md:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: 10, suffix: "+", label: "문제 유형" },
              { value: 5, suffix: "단계", label: "난이도" },
              { value: 30, suffix: "초", label: "생성 시간" },
              { value: 99, suffix: "%", label: "정확도" },
            ].map((stat) => (
              <StatCounter key={stat.label} target={stat.value} suffix={stat.suffix} label={stat.label} />
            ))}
          </div>
        </section>
      </FadeInSection>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">사용 방법</h2>
            <p className="text-white/50">3단계로 간단하게</p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                icon: <Upload className="h-6 w-6" />,
                title: "시험 지문 업로드",
                desc: "PDF 또는 이미지 파일을 드래그 앤 드롭",
              },
              {
                step: 2,
                icon: <Settings2 className="h-6 w-6" />,
                title: "유형 & 난이도 선택",
                desc: "원하는 문제 유형과 난이도를 설정",
              },
              {
                step: 3,
                icon: <Download className="h-6 w-6" />,
                title: "AI 문제 생성",
                desc: "버튼 하나로 문제 생성 후 다운로드",
              },
            ].map((step) => (
              <FadeInSection key={step.step}>
                <div className="landing-card rounded-xl p-6 text-center hover-lift">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    {step.icon}
                  </div>
                  <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50">{step.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <FadeInSection className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">요금제</h2>
            <p className="text-white/50">필요에 맞는 플랜을 선택하세요</p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <FadeInSection>
              <div className="landing-card rounded-xl p-6 h-full">
                <h3 className="text-lg font-bold mb-1">Free</h3>
                <p className="text-3xl font-bold mb-4">
                  무료
                  <span className="text-sm font-normal text-white/50 ml-1">
                    영구
                  </span>
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    "월 10회 문제 생성",
                    "5가지 기본 유형",
                    "월 5회 DOCX 내보내기",
                    "기본 AI 채팅",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0">
                    무료로 시작
                  </Button>
                </Link>
              </div>
            </FadeInSection>

            {/* Pro */}
            <FadeInSection>
              <div className="landing-card rounded-xl p-6 h-full border-primary/30 relative overflow-hidden ring-1 ring-primary/20 shadow-[0_0_24px_rgba(139,92,246,0.15)] scale-[1.02]">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                  추천
                </div>
                <h3 className="text-lg font-bold mb-1">Pro</h3>
                <p className="text-3xl font-bold mb-4">
                  &#8361;29,900
                  <span className="text-sm font-normal text-white/50 ml-1">
                    /월
                  </span>
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    "무제한 문제 생성",
                    "10가지 전체 유형",
                    "무제한 DOCX 내보내기",
                    "학교별 DNA 분석",
                    "동형 모의고사",
                    "우선 지원",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button className="w-full">Pro 시작하기</Button>
                </Link>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 py-20 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeInSection className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">자주 묻는 질문</h2>
          </FadeInSection>

          <div className="space-y-2">
            {[
              {
                q: "어떤 파일 형식을 지원하나요?",
                a: "PDF, JPG, PNG 파일을 지원합니다. 최대 10MB까지 업로드 가능합니다.",
              },
              {
                q: "문제 생성에 얼마나 걸리나요?",
                a: "지문 분석부터 문제 생성까지 보통 30초~1분 내에 완료됩니다.",
              },
              {
                q: "생성된 문제의 정확도는 어떤가요?",
                a: "7단계 자동 검증과 자기교정 시스템으로 99% 이상의 정확도를 보장합니다.",
              },
              {
                q: "동형 모의고사는 어떻게 만드나요?",
                a: "학교 기출 시험지를 업로드하면 DNA 분석 후 동일한 출제 패턴의 모의고사를 생성합니다. Pro 플랜에서 이용 가능합니다.",
              },
              {
                q: "무료 플랜으로도 충분한가요?",
                a: "월 10회 생성과 5가지 기본 유형으로 체험할 수 있습니다. 본격적으로 사용하려면 Pro 플랜을 추천합니다.",
              },
            ].map((faq, i) => (
              <FadeInSection key={i}>
                <div className="landing-card rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-sm font-medium pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 animate-tab-fade-in">
                      <p className="text-sm text-white/60">{faq.a}</p>
                    </div>
                  )}
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>&copy; 2026 Haean. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white/60 transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatCounter({
  target,
  suffix,
  label,
}: {
  target: number
  suffix: string
  label: string
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = Date.now()
          const animate = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / 2000, 1)
            setCount(Math.floor(progress * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          animate()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref}>
      <p className="text-3xl md:text-4xl font-bold text-gradient">
        {count}
        {suffix}
      </p>
      <p className="text-sm text-white/50 mt-1">{label}</p>
    </div>
  )
}
