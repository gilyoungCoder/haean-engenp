"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Upload,
  FileText,
  MessageSquare,
  FolderOpen,
  Settings,
  MessageCircle,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "@/hooks/use-toast"
import { LeftSidebar } from "@/components/left-sidebar"
import { MainContent } from "@/components/main-content"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { ProjectHistory } from "@/components/project-history"
import { SettingsPage } from "@/components/settings-page"
import type {
  UploadedFile,
  StructuredPassage,
  GeneratedQuestion,
  SchoolDnaProfile,
  PlanType,
  MonthlyUsage,
} from "@/lib/types"

type ProcessingStep = "idle" | "structurizing" | "generating" | "exporting" | "done"
type MobileTab = "upload" | "result" | "chat" | "history" | "settings"

const MOBILE_TAB_ITEMS: Array<{ id: MobileTab; label: string; icon: React.ReactNode }> = [
  { id: "upload", label: "업로드", icon: <Upload className="h-5 w-5" /> },
  { id: "result", label: "결과", icon: <FileText className="h-5 w-5" /> },
  { id: "chat", label: "채팅", icon: <MessageSquare className="h-5 w-5" /> },
  { id: "history", label: "이력", icon: <FolderOpen className="h-5 w-5" /> },
  { id: "settings", label: "설정", icon: <Settings className="h-5 w-5" /> },
]

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  // Auth redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      const timer = setTimeout(() => router.push("/login"), 2000)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  // Handle ?upgraded=true
  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      toast("Pro 플랜으로 업그레이드되었습니다!")
      setUserPlan("pro")
    }
  }, [searchParams])

  // Load monthly usage on mount
  useEffect(() => {
    if (status !== "authenticated") return
    async function fetchUsage() {
      try {
        const res = await fetch("/api/projects")
        if (!res.ok) return
        const data = await res.json()
        if (data.monthlyUsage) {
          setUsage(data.monthlyUsage)
        }
      } catch {
        // Non-critical
      }
    }
    fetchUsage()
  }, [status])

  // ============================
  // State management (section 5.4.3)
  // ============================

  // File management
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)

  // Generation pipeline
  const [structuredPassage, setStructuredPassage] = useState<StructuredPassage | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle")
  const [pipelineError, setPipelineError] = useState<string | null>(null)

  // DNA profile
  const [dnaProfile, setDnaProfile] = useState<SchoolDnaProfile | null>(null)

  // Project
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [currentPassageId, setCurrentPassageId] = useState<string | null>(null)

  // Subscription
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [usage, setUsage] = useState<MonthlyUsage>({
    generate: 0,
    export: 0,
    chat: 0,
    structurize: 0,
  })

  // UI
  const [chatOpen, setChatOpen] = useState(true)
  const [historyCollapsed, setHistoryCollapsed] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>("upload")

  // ============================
  // Callbacks
  // ============================

  const handleProjectSelect = useCallback(async (projectId: string) => {
    setSelectedProjectId(projectId)
    setCurrentPassageId(projectId)

    // Clear previous state before loading new project
    setStructuredPassage(null)
    setGeneratedQuestions([])
    setUploadedFiles([])
    setSelectedFile(null)
    setPipelineError(null)
    setProcessingStep("idle")

    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('프로젝트 로드 실패')

      const data = await res.json() as {
        passage: {
          _id: string
          structuredData: StructuredPassage | null
          originalFileUrl: string
          originalFileName: string
          originalFileKey: string
        }
        questions: GeneratedQuestion[]
        chatMessages: Array<{ role: string; content: string }>
        fileBase64: string
        fileContentType: string
      }

      // Restore structured passage
      if (data.passage.structuredData) {
        setStructuredPassage(data.passage.structuredData)
      }

      // Restore file info with base64 from R2
      if (data.passage.originalFileName) {
        const fileInfo: UploadedFile = {
          fileName: data.passage.originalFileName,
          fileUrl: data.passage.originalFileUrl ?? '',
          fileKey: data.passage.originalFileKey ?? '',
          mediaType: data.fileContentType || (
            data.passage.originalFileName?.endsWith('.pdf')
              ? 'application/pdf'
              : 'image/png'
          ),
          size: 0,
          base64: data.fileBase64 ?? '',
          passageId: data.passage._id,
        }
        setUploadedFiles([fileInfo])
        setSelectedFile(fileInfo)
      }

      // Restore questions
      if (data.questions && data.questions.length > 0) {
        setGeneratedQuestions(data.questions)
      }

      // If structured data or questions exist, mark as done so tabs show content
      if (data.passage.structuredData || (data.questions && data.questions.length > 0)) {
        setProcessingStep('done')
      }

      setCurrentPassageId(data.passage._id)

      // Switch to result tab on mobile
      if (isMobile) setMobileTab('result')
    } catch (err) {
      toast(err instanceof Error ? err.message : '프로젝트 로드 실패')
    }
  }, [isMobile])

  const handleNewProject = useCallback(() => {
    setSelectedProjectId(null)
    setCurrentPassageId(null)
    setStructuredPassage(null)
    setGeneratedQuestions([])
    setUploadedFiles([])
    setSelectedFile(null)
    setPipelineError(null)
    setProcessingStep("idle")
    setDnaProfile(null)
    // Keep sidebar OPEN so user can see project list
    if (isMobile) setMobileTab("upload")
  }, [isMobile])

  const handleDeleteQuestion = useCallback(
    (questionNumber: number) => {
      setGeneratedQuestions((prev) =>
        prev.filter((q) => q.question_number !== questionNumber)
      )
    },
    []
  )

  const handleQuestionsUpdate = useCallback((newQuestions: GeneratedQuestion[]) => {
    setGeneratedQuestions((prev) => {
      // Only update EXISTING questions — never add new ones from chat
      // Deep merge: keep existing fields (instruction, passage, choices),
      // overlay only the fields Claude actually changed (difficulty, answer, explanation)
      const existingMap = new Map(prev.map((q) => [q.question_number, q]))
      for (const q of newQuestions) {
        const num = q.question_number
        if (num != null && existingMap.has(num)) {
          const existing = existingMap.get(num)!
          existingMap.set(num, { ...existing, ...q, question_number: num })
        }
      }
      return Array.from(existingMap.values()).sort((a, b) => a.question_number - b.question_number)
    })
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: "/login" })
  }, [])

  const handleUpgrade = useCallback(() => {
    // Toss Payments integration placeholder
    toast("결제 기능은 준비 중입니다.")
  }, [])

  // ============================
  // Loading / Auth guard
  // ============================

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin-slow h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-sm text-muted-foreground">로그인 페이지로 이동 중...</p>
      </div>
    )
  }

  // ============================
  // Settings fullpage
  // ============================

  if (settingsOpen) {
    return (
      <SettingsPage
        onBack={() => setSettingsOpen(false)}
        onLogout={handleLogout}
        onUpgrade={handleUpgrade}
        userEmail={session?.user?.email ?? ""}
        userName={session?.user?.name ?? ""}
        userImage={session?.user?.image ?? undefined}
        plan={userPlan}
        usage={usage}
      />
    )
  }

  // ============================
  // Shared props
  // ============================

  const chatContext = {
    passage: structuredPassage,
    questions: generatedQuestions.length > 0 ? generatedQuestions : null,
  }

  // ============================
  // Mobile layout
  // ============================

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        {/* Tab content */}
        <div className="flex-1 overflow-hidden" style={{ overscrollBehavior: "contain" }}>
          {mobileTab === "upload" && (
            <div className="h-full overflow-y-auto animate-tab-fade-in">
              <LeftSidebar
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                isProcessing={isProcessing}
                processingStep={processingStep}
                pipelineError={pipelineError}
                onStructuredPassage={setStructuredPassage}
                onGeneratedQuestions={setGeneratedQuestions}
                onIsProcessing={setIsProcessing}
                onProcessingStep={setProcessingStep}
                onPipelineError={setPipelineError}
                userId={session?.user?.id}
                currentProjectId={selectedProjectId}
                dnaProfile={dnaProfile}
                onDnaProfile={setDnaProfile}
                userEmail={session?.user?.email ?? undefined}
                userImage={session?.user?.image ?? undefined}
                onSettingsOpen={() => setSettingsOpen(true)}
              />
            </div>
          )}
          {mobileTab === "result" && (
            <div className="h-full animate-tab-fade-in">
              <MainContent
                selectedFile={selectedFile}
                uploadedFiles={uploadedFiles}
                structuredPassage={structuredPassage}
                generatedQuestions={generatedQuestions}
                isProcessing={isProcessing}
                processingStep={processingStep}
                onDeleteQuestion={handleDeleteQuestion}
              />
            </div>
          )}
          {mobileTab === "chat" && (
            <div className="h-full animate-tab-fade-in">
              <AIChatSidebar
                context={chatContext}
                onQuestionsUpdate={handleQuestionsUpdate}
                passageId={currentPassageId ?? undefined}
              />
            </div>
          )}
          {mobileTab === "history" && (
            <div className="h-full overflow-y-auto animate-tab-fade-in">
              <ProjectHistory
                collapsed={false}
                onToggle={() => {}}
                onProjectSelect={handleProjectSelect}
                onNewProject={handleNewProject}
                selectedProjectId={selectedProjectId}
              />
            </div>
          )}
          {mobileTab === "settings" && (
            <div className="h-full animate-tab-fade-in">
              <SettingsPage
                onBack={() => setMobileTab("upload")}
                onLogout={handleLogout}
                onUpgrade={handleUpgrade}
                userEmail={session?.user?.email ?? ""}
                userName={session?.user?.name ?? ""}
                userImage={session?.user?.image ?? undefined}
                plan={userPlan}
                usage={usage}
              />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div
          className="shrink-0 grid grid-cols-5 border-t border-border bg-background/80 backdrop-blur-lg"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {MOBILE_TAB_ITEMS.map((tab) => {
            const isActive = mobileTab === tab.id
            return (
              <button
                key={tab.id}
                className={`relative flex flex-col items-center justify-center py-2 min-h-[56px] active:scale-[0.98] transition-all ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => {
                  if (tab.id === "settings") {
                    setSettingsOpen(true)
                  } else {
                    setMobileTab(tab.id)
                  }
                }}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary to-primary/60 rounded-full" />
                )}
                {tab.icon}
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================
  // Desktop layout
  // ============================

  return (
    <div className="flex h-screen bg-background">
      {/* Project History Panel */}
      <ProjectHistory
        collapsed={historyCollapsed}
        onToggle={() => setHistoryCollapsed(!historyCollapsed)}
        onProjectSelect={handleProjectSelect}
        onNewProject={handleNewProject}
        selectedProjectId={selectedProjectId}
      />

      {/* Left Sidebar */}
      <div className="transition-all duration-300 ease-in-out">
      <LeftSidebar
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        isProcessing={isProcessing}
        processingStep={processingStep}
        pipelineError={pipelineError}
        onStructuredPassage={setStructuredPassage}
        onGeneratedQuestions={setGeneratedQuestions}
        onIsProcessing={setIsProcessing}
        onProcessingStep={setProcessingStep}
        onPipelineError={setPipelineError}
        userId={session?.user?.id}
        currentProjectId={selectedProjectId}
        dnaProfile={dnaProfile}
        onDnaProfile={setDnaProfile}
        userEmail={session?.user?.email ?? undefined}
        userImage={session?.user?.image ?? undefined}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
      <MainContent
        selectedFile={selectedFile}
        uploadedFiles={uploadedFiles}
        structuredPassage={structuredPassage}
        generatedQuestions={generatedQuestions}
        isProcessing={isProcessing}
        processingStep={processingStep}
        onDeleteQuestion={handleDeleteQuestion}
      />
      </div>

      {/* Chat toggle + sidebar */}
      {chatOpen ? (
        <div className="relative">
          <button
            className="absolute -left-8 top-3 z-10 p-1.5 rounded-md bg-background border border-border hover:bg-muted transition-colors"
            onClick={() => setChatOpen(false)}
            aria-label="채팅 패널 닫기"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </button>
          <AIChatSidebar
            context={chatContext}
            onQuestionsUpdate={handleQuestionsUpdate}
            passageId={currentPassageId ?? undefined}
          />
        </div>
      ) : (
        <div className="shrink-0 border-l border-border flex flex-col items-center py-3">
          <button
            className="p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setChatOpen(true)}
            aria-label="채팅 패널 열기"
          >
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin-slow h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
