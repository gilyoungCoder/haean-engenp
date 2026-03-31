"use client"

import { useState, useRef, useCallback, type Dispatch, type SetStateAction } from "react"
import {
  Upload,
  FileText,
  Trash2,
  Dna,
  ChevronDown,
  ChevronUp,
  Settings,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import type {
  UploadedFile,
  StructuredPassage,
  GeneratedQuestion,
  SchoolDnaProfile,
  GenerationMode,
} from "@/lib/types"

type ProcessingStep = "idle" | "structurizing" | "generating" | "exporting" | "done"

interface LeftSidebarProps {
  uploadedFiles: UploadedFile[]
  setUploadedFiles: Dispatch<SetStateAction<UploadedFile[]>>
  selectedFile: UploadedFile | null
  onFileSelect: (file: UploadedFile | null) => void
  isProcessing: boolean
  processingStep: ProcessingStep
  pipelineError: string | null
  onStructuredPassage: (passage: StructuredPassage) => void
  onGeneratedQuestions: (questions: GeneratedQuestion[]) => void
  onIsProcessing: (v: boolean) => void
  onProcessingStep: (step: ProcessingStep) => void
  onPipelineError: (err: string | null) => void
  userId: string | undefined
  currentProjectId: string | null | undefined
  dnaProfile: SchoolDnaProfile | null
  onDnaProfile: (profile: SchoolDnaProfile | null) => void
  userEmail?: string
  userImage?: string
  onSettingsOpen?: () => void
}

const VARIATION_TYPES = [
  { id: "grammar_choice", label: "어법 선택" },
  { id: "vocabulary_choice", label: "어휘 선택" },
  { id: "blank_inference", label: "빈칸 추론" },
  { id: "sentence_ordering", label: "순서 배열" },
  { id: "sentence_insertion", label: "문장 삽입" },
  { id: "topic_summary", label: "주제/요약" },
  { id: "content_match", label: "내용 일치" },
  { id: "eng_to_eng", label: "영영풀이" },
  { id: "sentence_transform", label: "문장 변환" },
  { id: "verb_transform", label: "동사 변환" },
]

const WORKBOOK_TYPES = [
  { id: "vocabulary_choice", label: "어휘 선택" },
  { id: "grammar_choice", label: "어법 선택" },
  { id: "verb_transform", label: "동사 변형" },
  { id: "grammar_error_correction", label: "어법 오류 수정" },
  { id: "content_match_tf", label: "내용일치 TF" },
  { id: "sentence_ordering_full", label: "순서배열" },
  { id: "sentence_insertion", label: "문장삽입" },
  { id: "word_order", label: "단어배열" },
  { id: "translation_writing", label: "해석 쓰기" },
  { id: "korean_to_english", label: "영작" },
]

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function LeftSidebar({
  uploadedFiles,
  setUploadedFiles,
  selectedFile,
  onFileSelect,
  isProcessing,
  processingStep,
  pipelineError,
  onStructuredPassage,
  onGeneratedQuestions,
  onIsProcessing,
  onProcessingStep,
  onPipelineError,
  userId,
  currentProjectId,
  dnaProfile,
  onDnaProfile,
  userEmail,
  userImage,
  onSettingsOpen,
}: LeftSidebarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [generationMode, setGenerationMode] = useState<GenerationMode>("variation")
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["grammar_choice", "vocabulary_choice"])
  const [difficulty, setDifficulty] = useState(3)
  const [count, setCount] = useState(5)
  const [dnaExpanded, setDnaExpanded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDnaUploading, setIsDnaUploading] = useState(false)
  const [dnaFiles, setDnaFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dnaFileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast("지원하지 않는 파일 형식입니다. PDF, JPG, PNG만 가능합니다.")
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          toast("파일 크기가 10MB를 초과합니다.")
          continue
        }
        if (uploadedFiles.some((f) => f.fileName === file.name)) {
          toast("동일한 이름의 파일이 이미 업로드되어 있습니다.")
          continue
        }

        setIsUploading(true)
        try {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "업로드 실패" }))
            throw new Error(err.error ?? "업로드 실패")
          }

          const data = await response.json() as {
            passage: {
              _id: string
              originalFileName: string
              originalFileUrl: string
              originalFileKey: string
            }
          }

          // Convert file to base64 for VLM structurization
          const arrayBuffer = await file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((d, byte) => d + String.fromCharCode(byte), '')
          )

          const uploaded: UploadedFile = {
            fileName: data.passage.originalFileName,
            fileUrl: data.passage.originalFileUrl,
            fileKey: data.passage.originalFileKey ?? '',
            mediaType: file.type,
            size: file.size,
            base64,
            passageId: data.passage._id,
          }

          setUploadedFiles((prev) => [...prev, uploaded])
          onFileSelect(uploaded)
          toast("파일이 업로드되었습니다.")
        } catch (err) {
          const message = err instanceof Error ? err.message : "업로드 실패"
          toast(message)
        } finally {
          setIsUploading(false)
        }
      }
    },
    [uploadedFiles, setUploadedFiles, onFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files)
      }
    },
    [handleFileUpload]
  )

  const handleRemoveFile = useCallback(
    (fileName: string) => {
      setUploadedFiles((prev) => prev.filter((f) => f.fileName !== fileName))
      if (selectedFile?.fileName === fileName) {
        onFileSelect(null)
      }
    },
    [selectedFile, setUploadedFiles, onFileSelect]
  )

  // DNA file handling
  const handleDnaFileAdd = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast("PDF, JPG, PNG 파일만 업로드할 수 있습니다.")
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast("파일 크기가 10MB를 초과합니다.")
        continue
      }
      setDnaFiles((prev) => {
        if (prev.some((f) => f.name === file.name)) return prev
        return [...prev, file]
      })
    }
  }, [])

  const handleDnaAnalysis = useCallback(async () => {
    if (dnaFiles.length === 0) {
      toast("기출 시험지를 먼저 업로드해주세요.")
      return
    }
    setIsDnaUploading(true)
    try {
      // Convert files to base64
      const images: Array<{ base64: string; mediaType: string }> = []
      for (const file of dnaFiles) {
        const buffer = await file.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        )
        images.push({ base64, mediaType: file.type })
      }

      const response = await fetch("/api/analyze-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "DNA 분석 실패" }))
        throw new Error(err.error ?? "DNA 분석 실패")
      }

      const data = await response.json() as { profile: SchoolDnaProfile }
      onDnaProfile(data.profile)
      toast("DNA 분석이 완료되었습니다.")
      setDnaFiles([])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DNA 분석 중 오류"
      toast(msg)
    } finally {
      setIsDnaUploading(false)
    }
  }, [dnaFiles, onDnaProfile])

  const handleTypeToggle = useCallback(
    (typeId: string) => {
      setSelectedTypes((prev) =>
        prev.includes(typeId)
          ? prev.filter((t) => t !== typeId)
          : [...prev, typeId]
      )
    },
    []
  )

  const handleGenerate = useCallback(async () => {
    if (!selectedFile) {
      toast("먼저 파일을 업로드해주세요.")
      return
    }
    if (selectedTypes.length === 0) {
      toast("문제 유형을 하나 이상 선택해주세요.")
      return
    }
    if (generationMode === "mock_exam" && !dnaProfile) {
      toast("동형 모의고사에는 DNA 프로필이 필요합니다.")
      return
    }

    onPipelineError(null)
    onIsProcessing(true)

    if (!selectedFile.base64) {
      toast("파일을 다시 업로드해주세요. (새로고침 후에는 파일 재업로드가 필요합니다)")
      onIsProcessing(false)
      return
    }

    onProcessingStep("structurizing")

    try {
      // Step 1: Structurize (separate API call — up to 60s)
      const structRes = await fetch("/api/structurize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: selectedFile.base64,
          mediaType: selectedFile.mediaType,
          passageId: selectedFile.passageId,
        }),
      })

      if (!structRes.ok) {
        const err = await structRes.json().catch(() => ({ error: "지문 분석 실패" }))
        throw new Error(err.error ?? `지문 분석 실패 (${structRes.status})`)
      }

      const structData = await structRes.json() as { passage: StructuredPassage }
      const passage = structData.passage
      onStructuredPassage(passage)
      onProcessingStep("generating")

      // Step 2: Generate questions (separate API call — up to 60s)
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage,
          options: {
            types: selectedTypes,
            difficulty,
            count: generationMode === "mock_exam" ? 30 : count,
            generationMode,
          },
          dnaProfile: dnaProfile ?? null,
          passageId: selectedFile.passageId,
        }),
      })

      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({ error: "문제 생성 실패" }))
        throw new Error(err.error ?? `문제 생성 실패 (${genRes.status})`)
      }

      const genData = await genRes.json() as { questions: GeneratedQuestion[] }
      onGeneratedQuestions(genData.questions)
      onProcessingStep("done")
      toast("문제 생성이 완료되었습니다!")
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      onPipelineError(message)
      onProcessingStep("idle")
      toast(message)
    } finally {
      onIsProcessing(false)
    }
  }, [
    selectedFile,
    selectedTypes,
    generationMode,
    difficulty,
    count,
    dnaProfile,
    onPipelineError,
    onIsProcessing,
    onProcessingStep,
    onStructuredPassage,
    onGeneratedQuestions,
  ])

  const currentTypes =
    generationMode === "workbook" ? WORKBOOK_TYPES : VARIATION_TYPES

  const emailInitial = userEmail?.charAt(0).toUpperCase() ?? "U"

  return (
    <div className="flex flex-col h-full w-full md:w-[280px] md:shrink-0 border-r border-border bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Section 1: File Upload */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">파일 업로드</h3>

          <div
            className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="mt-2 text-xs text-muted-foreground text-center">
              PDF, JPG, PNG (최대 10MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={(e) => {
                if (e.target.files) handleFileUpload(e.target.files)
                e.target.value = ""
              }}
            />
          </div>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-1">
              {uploadedFiles.map((file) => (
                <div
                  key={file.fileName}
                  className={`flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer transition-colors ${
                    selectedFile?.fileName === file.fileName
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => onFileSelect(file)}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{file.fileName}</span>
                  <button
                    className="p-0.5 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile(file.fileName)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Section 2: DNA Analysis (optional, collapsible) */}
        <div className="space-y-2">
          <button
            className="flex items-center justify-between w-full text-sm font-semibold text-foreground"
            onClick={() => setDnaExpanded(!dnaExpanded)}
          >
            <span className="flex items-center gap-1.5">
              <Dna className="h-4 w-4" />
              학교 DNA 분석
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                선택
              </Badge>
            </span>
            {dnaExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {dnaExpanded && (
            <div className="space-y-2 animate-tab-fade-in">
              {dnaProfile ? (
                <Card className="p-3 space-y-1">
                  <p className="text-xs font-medium">{dnaProfile.school_name}</p>
                  <p className="text-xs text-muted-foreground">
                    분석 완료
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => onDnaProfile(null)}
                  >
                    초기화
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    학교 기출 시험지(PDF/이미지)를 업로드하면 출제 패턴을 분석합니다.
                  </p>

                  {/* DNA file drop zone */}
                  <div
                    className="border border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    onClick={() => dnaFileInputRef.current?.click()}
                  >
                    <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      기출 시험지 업로드
                    </p>
                    <input
                      ref={dnaFileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) handleDnaFileAdd(e.target.files)
                        e.target.value = ""
                      }}
                    />
                  </div>

                  {/* DNA file list */}
                  {dnaFiles.length > 0 && (
                    <div className="space-y-1">
                      {dnaFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                        >
                          <span className="truncate flex-1 mr-2">{file.name}</span>
                          <button
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() =>
                              setDnaFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* DNA analysis button */}
                  <Button
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={handleDnaAnalysis}
                    disabled={dnaFiles.length === 0 || isDnaUploading}
                  >
                    {isDnaUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <Dna className="h-3.5 w-3.5 mr-1" />
                        DNA 분석 시작 ({dnaFiles.length}개 파일)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Section 3: Generation Options - 3-Tab Mode */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">생성 옵션</h3>

          <Tabs
            value={generationMode}
            onValueChange={(v) => {
              setGenerationMode(v as GenerationMode)
              setSelectedTypes([])
            }}
          >
            <TabsList className="w-full grid grid-cols-3 text-xs">
              <TabsTrigger value="variation" className="text-xs px-1">
                변형문제
              </TabsTrigger>
              <TabsTrigger value="workbook" className="text-xs px-1">
                워크북
              </TabsTrigger>
              <TabsTrigger value="mock_exam" className="text-xs px-1">
                동형모의
              </TabsTrigger>
            </TabsList>

            <TabsContent value="variation" className="space-y-3">
              <TypeCheckboxes
                types={VARIATION_TYPES}
                selected={selectedTypes}
                onToggle={handleTypeToggle}
              />
            </TabsContent>

            <TabsContent value="workbook" className="space-y-3">
              <TypeCheckboxes
                types={WORKBOOK_TYPES}
                selected={selectedTypes}
                onToggle={handleTypeToggle}
              />
            </TabsContent>

            <TabsContent value="mock_exam" className="space-y-3">
              {!dnaProfile ? (
                <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
                  동형 모의고사를 생성하려면 먼저 학교 DNA 분석을 진행해주세요.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  DNA 프로필 기반 30문항이 자동 구성됩니다.
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Difficulty slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">난이도</span>
              <Badge variant="outline" className="text-xs">
                Lv.{difficulty}
              </Badge>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[difficulty]}
              onValueChange={([v]) => setDifficulty(v)}
            />
          </div>

          {/* Count slider (not for mock_exam) */}
          {generationMode !== "mock_exam" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">문제 수</span>
                <Badge variant="outline" className="text-xs">
                  {count}문항
                </Badge>
              </div>
              <Slider
                min={1}
                max={20}
                step={1}
                value={[count]}
                onValueChange={([v]) => setCount(v)}
              />
            </div>
          )}

          {/* Generate button */}
          <Button
            className="w-full"
            disabled={isProcessing || !selectedFile}
            onClick={handleGenerate}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {processingStep === "structurizing"
                  ? "지문 분석 중..."
                  : processingStep === "generating"
                    ? "문제 생성 중..."
                    : "처리 중..."}
              </>
            ) : (
              "문제 생성하기"
            )}
          </Button>

          {pipelineError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
              {pipelineError}
            </p>
          )}
        </div>
      </div>

      {/* Bottom: User profile bar (desktop only - hidden on mobile via parent) */}
      <div className="mt-auto shrink-0 border-t border-border p-3 hidden md:flex items-center gap-2">
        <Avatar className="h-7 w-7">
          {userImage && <AvatarImage src={userImage} alt="프로필" />}
          <AvatarFallback className="text-xs">{emailInitial}</AvatarFallback>
        </Avatar>
        <span className="flex-1 text-xs truncate text-muted-foreground">
          {userEmail ?? "사용자"}
        </span>
        <button
          className="p-1 rounded-md hover:bg-muted transition-colors"
          onClick={onSettingsOpen}
          aria-label="설정"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

/* Type checkbox sub-component */
function TypeCheckboxes({
  types,
  selected,
  onToggle,
}: {
  types: Array<{ id: string; label: string }>
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {types.map((t) => (
        <label
          key={t.id}
          className="flex items-center gap-1.5 text-xs cursor-pointer p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <Checkbox
            checked={selected.includes(t.id)}
            onCheckedChange={() => onToggle(t.id)}
            className="h-3.5 w-3.5"
          />
          {t.label}
        </label>
      ))}
    </div>
  )
}
