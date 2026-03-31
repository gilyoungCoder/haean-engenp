// lib/types/index.ts — All TypeScript interfaces for the Haean web app

// ============================================================
// File / Upload
// ============================================================

export interface UploadedFile {
  fileName: string
  fileUrl: string
  fileKey: string
  mediaType: string
  size: number
  base64: string  // base64-encoded file content for VLM
  passageId: string  // MongoDB passage._id
}

// ============================================================
// Passage (VLM Structurization output)
// ============================================================

export interface Sentence {
  index: number
  text: string
  marker?: string
}

export interface Paragraph {
  index: number
  sentences: Sentence[]
  rawText: string
}

export interface GrammarPoint {
  sentenceIndex: number
  category: string
  detail: string
}

export interface KeyVocab {
  word: string
  pos: string
  definition: string
  definitionKo?: string
  synonyms?: string[]
  antonyms?: string[]
  sentenceIndex: number
}

export interface StructuredPassage {
  id: string
  title?: string
  source?: string
  paragraphs: Paragraph[]
  keyVocab: KeyVocab[]
  grammarPoints?: GrammarPoint[]
  fullText: string
  wordCount: number
  estimatedDifficulty: number
  topics: string[]
  structurizedAt: string
  sourceFile?: UploadedFile
}

// ============================================================
// Question Generation
// ============================================================

export type GenerationMode = 'variation' | 'workbook' | 'mock_exam'

export interface GenerationOptions {
  types: string[]
  difficulty: number
  count: number
  explanationLanguage?: string
  topicHints?: string[]
  generationMode?: GenerationMode
}

export interface GeneratedQuestion {
  question_number: number
  type_id: string
  difficulty: number
  instruction: string
  passage_with_markers: string
  choices: string[] | null
  answer: string
  explanation: string
  test_point: string
  rawPassage?: string
  // Sentence ordering specific fields
  intro_passage?: string
  blocks?: Record<string, string>
  // Content match TF specific
  statements?: Array<{ number: number; text: string; answer: string }>
  // Subjective/writing specific
  conditions?: string[]
}

// ============================================================
// Validation
// ============================================================

export type CheckVerdict = 'PASS' | 'WARN' | 'FAIL' | 'SKIP'

export interface ValidationCheck {
  verdict: CheckVerdict
  details: string
}

export interface PatchSuggestion {
  field: string
  issue: string
  suggested_fix: string
}

export interface DetailedValidationResult {
  validation_id: string
  passage_id: string
  question_number: number
  question_type: string
  overall_verdict: 'PASS' | 'WARN' | 'FAIL'
  corrective_action: 'REGENERATE' | 'PATCH' | 'ESCALATE' | null
  checks: Record<string, ValidationCheck>
  patch_suggestions: PatchSuggestion[]
  quality_score: number
  validator_notes: string
}

// ============================================================
// DNA Profile (School Exam Analysis)
// ============================================================

export interface GrammarFocusItem {
  grammar_point: string
  frequency: number
}

export interface TypeDistribution {
  total_count: number
  presence_rate: number
}

export interface SchoolDnaProfile {
  profile_id: string
  school_name: string
  grade: number
  exam_count: number
  question_type_distribution: Record<string, TypeDistribution>
  grammar_focus: {
    top_grammar_points: GrammarFocusItem[]
  }
  vocabulary_style: {
    antonym_swap_rate: number
    semantic_field_swap_rate: number
    preferred_difficulty: number
  }
  distractor_patterns: {
    passage_word_recycling_rate: number
    similar_form_rate: number
  }
  difficulty_trend: {
    average: number
    range: [number, number]
  }
  generation_guidelines: {
    recommended_type_mix: string[]
    grammar_priority_list: string[]
    vocabulary_guidelines: string[]
    formatting_notes: string[]
  }
}

// ============================================================
// RAG — Question Type Template Context
// ============================================================

export interface TypeContext {
  typeId: string
  typeNameKo: string
  typeNameEn: string
  description: string
  difficultyRange: [number, number]
  category: string
  instructionTemplate: string
  outputSchema: Record<string, unknown>
  generationRules: string[]
  examples: QuestionExample[]
}

export interface QuestionExample {
  instruction: string
  passage_with_markers?: string
  choices: string[] | null
  answer: string
  explanation: string
  test_point?: string
}

// ============================================================
// Export
// ============================================================

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'json'
  includeAnswers: boolean
  includeExplanations: boolean
  schoolName?: string
  examTitle?: string
  examDate?: string
}

// ============================================================
// Processing Pipeline
// ============================================================

export type ProcessingStep =
  | 'idle'
  | 'structurizing'
  | 'generating'
  | 'exporting'
  | 'done'

// ============================================================
// Mobile Layout
// ============================================================

export type MobileTab = 'upload' | 'result' | 'chat' | 'history' | 'settings'

// ============================================================
// Subscription / Plan
// ============================================================

export type PlanType = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'

export interface PlanLimits {
  generate: number
  export: number
  types: number
  dna: boolean
}

export interface UserPlanInfo {
  plan: PlanType
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  limits: PlanLimits
}

export interface UsageLimitResult {
  allowed: boolean
  remaining: number
  plan: PlanType
}

// ============================================================
// Usage Tracking
// ============================================================

export type UsageAction = 'structurize' | 'generate' | 'validate' | 'export' | 'chat'

export interface MonthlyUsage {
  generate: number
  export: number
  chat: number
  structurize: number
}

// ============================================================
// Claude API
// ============================================================

export type ClaudeTask = 'structurize' | 'generate' | 'validate' | 'chat' | 'dna'

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface ClaudeResponse {
  raw: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

// ============================================================
// DNA Analyzer input
// ============================================================

export interface DnaExamImage {
  base64: string
  mediaType: ImageMediaType
}

export interface DnaExamMetadata {
  school_name: string
  grade: number
  exam_papers: Array<{
    semester: number
    exam_type: string
    year: number
    image_index: number
  }>
}

// ============================================================
// Chat
// ============================================================

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
