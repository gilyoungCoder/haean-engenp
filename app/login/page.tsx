"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Mail, Lock, Eye, EyeOff, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"

interface PasswordRule {
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "8자 이상", test: (pw) => pw.length >= 8 },
  { label: "영문 포함", test: (pw) => /[a-zA-Z]/.test(pw) },
  { label: "숫자 포함", test: (pw) => /\d/.test(pw) },
  { label: "특수문자 포함", test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
]

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length
  const passwordsMatch = password === passwordConfirm && passwordConfirm.length > 0

  const handleCredentialAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (isLoading) return
      setIsLoading(true)

      try {
        if (mode === "register") {
          if (passwordStrength < 4) {
            toast("비밀번호가 규칙을 충족하지 않습니다.")
            return
          }
          if (!passwordsMatch) {
            toast("비밀번호가 일치하지 않습니다.")
            return
          }

          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: "회원가입 실패" }))
            throw new Error(data.error ?? "회원가입 실패")
          }

          // Auto login after register
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          })

          if (result?.error) throw new Error("자동 로그인 실패")
          router.push("/dashboard")
        } else {
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          })

          if (result?.error) {
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.")
          }

          router.push("/dashboard")
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "인증 실패"
        toast(message)
      } finally {
        setIsLoading(false)
      }
    },
    [mode, email, password, passwordConfirm, name, passwordStrength, passwordsMatch, isLoading, router]
  )

  const handleSocialLogin = useCallback(
    (provider: "google" | "kakao") => {
      signIn(provider, { callbackUrl: "/auth/callback" })
    },
    []
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-purple-950/20 to-background px-4 py-8">
      <Card className="w-full max-w-md shadow-xl shadow-purple-500/5 border-border/60">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-gradient inline-block mb-2">
            Haean
          </Link>
          <CardTitle className="text-lg">
            {mode === "login" ? "로그인" : "회원가입"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Login / Register tabs */}
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "login" | "register")}
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="register">회원가입</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleCredentialAuth} className="space-y-4">
            {/* Name (register only) */}
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Register-specific fields */}
            {mode === "register" && (
              <>
                {/* Password confirm */}
                <div className="space-y-2">
                  <Label htmlFor="password-confirm">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-confirm"
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    {passwordConfirm.length > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {passwordsMatch ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password strength bar */}
                <div className="space-y-2">
                  <Progress value={(passwordStrength / 4) * 100} className="h-1.5" />
                  <div className="grid grid-cols-2 gap-1">
                    {PASSWORD_RULES.map((rule) => (
                      <div
                        key={rule.label}
                        className={`flex items-center gap-1 text-xs ${
                          rule.test(password)
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {rule.test(password) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        {rule.label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </form>

          {/* Social login divider */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">또는</span>
            <Separator className="flex-1" />
          </div>

          {/* Social buttons */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full shadow-sm hover:shadow-md transition-shadow"
              onClick={() => handleSocialLogin("google")}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google로 계속하기
            </Button>

            {/* 카카오 로그인: 사업자 등록 완료 후 활성화 */}
            <Button
              className="w-full text-[#191919] opacity-50 cursor-not-allowed"
              style={{ backgroundColor: "#FEE500" }}
              disabled
              title="사업자 등록 완료 후 이용 가능합니다"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.58 1.72 4.84 4.3 6.13-.19.69-.69 2.5-.79 2.89-.12.49.18.48.38.35.15-.1 2.45-1.66 3.44-2.34.55.08 1.1.12 1.67.12 5.52 0 10-3.48 10-7.5S17.52 3 12 3z" />
              </svg>
              카카오 (준비 중)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
