"use client"

import { useState, useCallback } from "react"
import {
  FileText,
  Eye,
  ListChecks,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import type { UploadedFile, StructuredPassage, GeneratedQuestion } from "@/lib/types"

type ProcessingStep = "idle" | "structurizing" | "generating" | "exporting" | "done"

interface MainContentProps {
  selectedFile: UploadedFile | null
  uploadedFiles: UploadedFile[]
  structuredPassage: StructuredPassage | null
  generatedQuestions: GeneratedQuestion[]
  isProcessing: boolean
  processingStep: ProcessingStep
  isDemo?: boolean
  onDeleteQuestion?: (questionNumber: number) => void
  onRegenerateQuestion?: (questionNumber: number) => void
  onSetQuestions?: (questions: GeneratedQuestion[]) => void
}

const TYPE_COLORS: Record<string, string> = {
  grammar_choice: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  vocabulary_choice: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  blank_inference: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  sentence_ordering: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  sentence_ordering_full: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  sentence_insertion: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  topic_summary: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  content_match: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  content_match_tf: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  eng_to_eng: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sentence_transform: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  verb_transform: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  grammar_error_correction: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  word_order: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  translation_writing: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  korean_to_english: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
}

const TYPE_NAMES: Record<string, string> = {
  grammar_choice: "어법",
  vocabulary_choice: "어휘",
  blank_inference: "빈칸",
  sentence_ordering: "순서",
  sentence_ordering_full: "순서(전수)",
  sentence_insertion: "삽입",
  topic_summary: "주제/요약",
  content_match: "내용일치",
  content_match_tf: "내용TF",
  eng_to_eng: "영영풀이",
  sentence_transform: "문장변환",
  verb_transform: "동사변환",
  grammar_error_correction: "어법오류",
  word_order: "단어배열",
  translation_writing: "해석쓰기",
  korean_to_english: "영작",
}

const CHOICE_MARKERS = ["①", "②", "③", "④", "⑤"]

export function MainContent({
  selectedFile,
  structuredPassage,
  generatedQuestions,
  isProcessing,
  processingStep,
  isDemo = false,
  onDeleteQuestion,
  onRegenerateQuestion,
}: MainContentProps) {
  const [activeTab, setActiveTab] = useState("passage")
  const [imageZoom, setImageZoom] = useState(100)
  const [imageRotation, setImageRotation] = useState(0)
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

  const toggleExplanation = useCallback((qNum: number) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev)
      if (next.has(qNum)) next.delete(qNum)
      else next.add(qNum)
      return next
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (generatedQuestions.length === 0) return
    setIsExporting(true)
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: structuredPassage,
          questions: generatedQuestions,
          options: {
            format: "docx",
            includeAnswers: true,
            includeExplanations: true,
          },
        }),
      })

      if (!response.ok) throw new Error("내보내기 실패")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `haean_${structuredPassage?.title ?? "문제"}.docx`
      a.click()
      URL.revokeObjectURL(url)
      toast("DOCX 파일이 다운로드됩니다.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "내보내기 실패"
      toast(msg)
    } finally {
      setIsExporting(false)
    }
  }, [generatedQuestions, structuredPassage])

  const avgDifficulty =
    generatedQuestions.length > 0
      ? (
          generatedQuestions.reduce((sum, q) => sum + q.difficulty, 0) /
          generatedQuestions.length
        ).toFixed(1)
      : "0"

  // Processing states
  if (isProcessing) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium">
            {processingStep === "structurizing"
              ? "지문 분석 중... (1/2)"
              : processingStep === "generating"
                ? "문제 생성 중... (2/2)"
                : "처리 중..."}
          </p>
          <p className="text-xs text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-background">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <div className="shrink-0 px-4 pt-3">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="passage" className="text-xs gap-1">
              <FileText className="h-3.5 w-3.5" />
              지문 원문
            </TabsTrigger>
            <TabsTrigger value="file" className="text-xs gap-1">
              <Eye className="h-3.5 w-3.5" />
              타겟 지문
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-xs gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              생성된 문제
              {generatedQuestions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {generatedQuestions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Passage */}
        <TabsContent value="passage" className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 mt-0">
          <div className="animate-tab-fade-in">
            {structuredPassage ? (
              <PassageView passage={structuredPassage} />
            ) : (
              <EmptyState message="파일을 업로드하고 문제를 생성하면 분석된 지문이 여기에 표시됩니다." />
            )}
          </div>
        </TabsContent>

        {/* Tab 2: File viewer */}
        <TabsContent value="file" className="flex-1 overflow-hidden px-4 pb-4 mt-0">
          <div className="animate-tab-fade-in h-full">
            {selectedFile ? (
              <FileViewer
                file={selectedFile}
                zoom={imageZoom}
                rotation={imageRotation}
                onZoomIn={() => setImageZoom((z) => Math.min(z + 25, 200))}
                onZoomOut={() => setImageZoom((z) => Math.max(z - 25, 25))}
                onRotate={() => setImageRotation((r) => (r + 90) % 360)}
              />
            ) : (
              <EmptyState message="업로드된 파일을 선택하면 여기에 표시됩니다." />
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Questions */}
        <TabsContent value="questions" className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 mt-0">
          <div className="animate-tab-fade-in space-y-4">
            {generatedQuestions.length > 0 ? (
              generatedQuestions.map((q) => (
                <QuestionCard
                  key={q.question_number}
                  question={q}
                  isExpanded={expandedExplanations.has(q.question_number)}
                  onToggleExplanation={() => toggleExplanation(q.question_number)}
                  onDelete={
                    onDeleteQuestion
                      ? () => onDeleteQuestion(q.question_number)
                      : undefined
                  }
                  onRegenerate={
                    onRegenerateQuestion
                      ? () => onRegenerateQuestion(q.question_number)
                      : undefined
                  }
                />
              ))
            ) : (
              <EmptyState message="문제가 생성되면 여기에 표시됩니다." />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom toolbar */}
      {generatedQuestions.length > 0 && (
        <div className="shrink-0 border-t border-border px-4 py-2 flex items-center justify-between bg-background">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>총 {generatedQuestions.length}문항</span>
            <Separator orientation="vertical" className="h-4" />
            <span>평균 난이도 Lv.{avgDifficulty}</span>
          </div>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="text-xs"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1" />
            )}
            DOCX 내보내기
          </Button>
        </div>
      )}
    </div>
  )
}

/* Sub-components */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <p className="text-sm text-muted-foreground text-center px-8">{message}</p>
    </div>
  )
}

function PassageView({ passage }: { passage: StructuredPassage }) {
  return (
    <div className="space-y-4 pt-3">
      {/* Header */}
      <div className="space-y-2">
        {passage.title && (
          <h2 className="text-lg font-semibold">{passage.title}</h2>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {passage.topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="text-xs">
              {topic}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            Lv.{passage.estimatedDifficulty}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Paragraphs */}
      <TooltipProvider>
        <div className="space-y-4">
          {passage.paragraphs.map((para) => (
            <div key={para.index} className="space-y-1">
              <p className="text-xs text-muted-foreground">Paragraph {para.index + 1}</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {para.rawText}
              </p>
            </div>
          ))}
        </div>
      </TooltipProvider>

      <Separator />

      {/* Key vocabulary */}
      {passage.keyVocab.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">핵심 어휘</h4>
          <TooltipProvider>
            <div className="flex flex-wrap gap-1.5">
              {passage.keyVocab.map((v, i) => (
                <Tooltip key={`${v.word}-${i}`}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="cursor-help text-xs hover:bg-primary/5"
                    >
                      {v.word}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">
                        {v.word} ({v.pos})
                      </p>
                      <p>{v.definition}</p>
                      {v.definitionKo && (
                        <p className="text-muted-foreground">{v.definitionKo}</p>
                      )}
                      {v.synonyms && v.synonyms.length > 0 && (
                        <p>
                          <span className="text-muted-foreground">유의어:</span>{" "}
                          {v.synonyms.join(", ")}
                        </p>
                      )}
                      {v.antonyms && v.antonyms.length > 0 && (
                        <p>
                          <span className="text-muted-foreground">반의어:</span>{" "}
                          {v.antonyms.join(", ")}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>단어수: {passage.wordCount}</span>
        <span>난이도: Lv.{passage.estimatedDifficulty}</span>
        <span>단락수: {passage.paragraphs.length}</span>
      </div>
    </div>
  )
}

function FileViewer({
  file,
  zoom,
  rotation,
  onZoomIn,
  onZoomOut,
  onRotate,
}: {
  file: UploadedFile
  zoom: number
  rotation: number
  onZoomIn: () => void
  onZoomOut: () => void
  onRotate: () => void
}) {
  const isPdf = file.mediaType === "application/pdf"
  const isImage = file.mediaType.startsWith("image/")

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {isImage && (
        <div className="flex items-center gap-1 pb-2">
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {zoom}%
          </span>
          <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRotate} className="h-8 w-8">
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto rounded-lg border">
        {isPdf ? (
          file.base64 ? (
            <iframe
              src={`data:application/pdf;base64,${file.base64}`}
              className="w-full h-full min-h-[400px]"
              title="PDF 뷰어"
            />
          ) : (
            <div className="flex items-center justify-center p-8 min-h-[400px]">
              <div className="text-center space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">PDF 파일이 업로드되었습니다</p>
                {file.fileUrl && (
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    새 탭에서 열기
                  </a>
                )}
              </div>
            </div>
          )
        ) : isImage ? (
          <div className="flex items-center justify-center p-4 min-h-[400px]">
            <img
              src={file.base64 ? `data:${file.mediaType};base64,${file.base64}` : file.fileUrl}
              alt={file.fileName}
              className="max-w-full transition-transform"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            미리보기를 지원하지 않는 파일 형식입니다.
          </div>
        )}
      </div>
    </div>
  )
}

function renderPassageWithMarkers(text: string): React.ReactNode {
  // Split on circled number markers ①②③④⑤ and underline the following word
  const parts = text.split(/([①②③④⑤])/g)

  return parts.map((part, i) => {
    if (/^[①②③④⑤]$/.test(part)) {
      // This is a marker — render it with emphasis
      return <span key={i} className="font-semibold text-primary">{part}</span>
    }
    // Check if previous part was a marker — if so, underline the first word
    if (i > 0 && /^[①②③④⑤]$/.test(parts[i - 1])) {
      const match = part.match(/^(\S+)([\s\S]*)$/)
      if (match) {
        return (
          <span key={i}>
            <u className="decoration-primary decoration-2 underline-offset-2">{match[1]}</u>
            {match[2]}
          </span>
        )
      }
    }
    return <span key={i}>{part}</span>
  })
}

function QuestionCard({
  question,
  isExpanded,
  onToggleExplanation,
  onDelete,
  onRegenerate,
}: {
  question: GeneratedQuestion
  isExpanded: boolean
  onToggleExplanation: () => void
  onDelete?: () => void
  onRegenerate?: () => void
}) {
  const typeColor = TYPE_COLORS[question.type_id] ?? "bg-gray-100 text-gray-700"
  const typeName = TYPE_NAMES[question.type_id] ?? question.type_id

  // Left border accent color based on question type
  const borderAccentMap: Record<string, string> = {
    grammar_choice: "border-l-sky-500",
    vocabulary_choice: "border-l-purple-500",
    blank_inference: "border-l-teal-500",
    sentence_ordering: "border-l-orange-500",
    sentence_ordering_full: "border-l-orange-500",
    sentence_insertion: "border-l-pink-500",
    topic_summary: "border-l-indigo-500",
    content_match: "border-l-emerald-500",
    content_match_tf: "border-l-emerald-500",
    eng_to_eng: "border-l-amber-500",
    sentence_transform: "border-l-rose-500",
    verb_transform: "border-l-cyan-500",
    grammar_error_correction: "border-l-sky-500",
    word_order: "border-l-lime-500",
    translation_writing: "border-l-violet-500",
    korean_to_english: "border-l-fuchsia-500",
  }
  const borderAccent = borderAccentMap[question.type_id] ?? "border-l-gray-400"

  return (
    <Card className={`hover-lift border-l-[3px] ${borderAccent}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-bold">
            {question.question_number}
          </span>
          <Badge className={`text-[10px] ${typeColor} border-0`}>{typeName}</Badge>
          <Badge variant="outline" className="text-[10px] bg-gradient-to-r from-muted/80 to-muted font-semibold">
            Lv.{question.difficulty}
          </Badge>
          {question.test_point && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {question.test_point}
            </span>
          )}
        </div>

        {/* Instruction */}
        <p className="text-sm font-medium">{question.instruction}</p>

        {/* Passage with markers */}
        {question.passage_with_markers && (
          <div className="text-sm leading-[1.75] tracking-wide bg-muted/50 rounded-md p-4 whitespace-pre-wrap font-[415]">
            {renderPassageWithMarkers(question.passage_with_markers)}
          </div>
        )}

        {/* Choices */}
        {question.choices && question.choices.length > 0 && (
          <div className="space-y-1">
            {question.choices.map((choice, i) => {
              const marker = CHOICE_MARKERS[i] ?? `(${i + 1})`
              const isAnswer = question.answer === `${i + 1}` || question.answer === marker || question.answer === choice || question.answer === String(i + 1)
              // Don't prepend marker if choice already starts with one
              const choiceText = /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(choice) ? choice : `${marker} ${choice}`
              return (
                <div
                  key={i}
                  className={`text-sm px-3 py-1.5 rounded-md ${
                    isAnswer
                      ? "bg-primary/10 text-primary font-medium border border-primary/20"
                      : "text-foreground"
                  }`}
                >
                  {choiceText}
                </div>
              )
            })}
          </div>
        )}

        {/* Answer (for non-choice questions) */}
        {(!question.choices || question.choices.length === 0) && question.answer && (
          <div className="text-sm">
            <span className="text-muted-foreground">정답: </span>
            <span className="font-medium text-primary">{question.answer}</span>
          </div>
        )}

        {/* Explanation toggle */}
        <div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={onToggleExplanation}
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            해설 {isExpanded ? "접기" : "보기"}
          </button>
          {isExpanded && question.explanation && (
            <div className="mt-2 text-sm text-muted-foreground bg-muted/30 rounded-md p-3 whitespace-pre-wrap animate-tab-fade-in">
              {question.explanation}
            </div>
          )}
          {isExpanded && !question.explanation && (
            <div className="mt-2 text-sm text-muted-foreground bg-muted/30 rounded-md p-3 animate-tab-fade-in">
              해설이 없습니다.
            </div>
          )}
        </div>

        {/* Action buttons */}
        {(onDelete || onRegenerate) && (
          <div className="flex items-center gap-2 pt-1">
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={onRegenerate}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                재생성
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                삭제
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
