// lib/services/prompt-builder.ts — Dynamic Prompt Assembly
// Reads prompt template files and builds system/user messages for Claude calls.

import { promises as fs } from 'fs'
import path from 'path'
import type {
  StructuredPassage,
  TypeContext,
  GenerationOptions,
  GeneratedQuestion,
  DetailedValidationResult,
  SchoolDnaProfile,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts')

// ---------------------------------------------------------------------------
// In-memory file cache for prompt text files
// ---------------------------------------------------------------------------

const promptFileCache = new Map<string, string>()

async function readPromptFile(filename: string): Promise<string> {
  const cached = promptFileCache.get(filename)
  if (cached) return cached

  const filePath = path.join(PROMPTS_DIR, filename)
  const content = await fs.readFile(filePath, 'utf-8')
  promptFileCache.set(filename, content)
  return content
}

// ---------------------------------------------------------------------------
// System prompt builders
// ---------------------------------------------------------------------------

export async function buildStructurizeSystemPrompt(): Promise<string> {
  return readPromptFile('structurize_passage.txt')
}

export async function buildGenerateSystemPrompt(): Promise<string> {
  return readPromptFile('generate_questions.txt')
}

export async function buildWorkbookSystemPrompt(): Promise<string> {
  return readPromptFile('workbook_generate.txt')
}

export async function buildValidateSystemPrompt(): Promise<string> {
  return readPromptFile('validate_question.txt')
}

export async function buildDnaAnalysisSystemPrompt(): Promise<string> {
  return readPromptFile('analyze_exam_dna.txt')
}

// ---------------------------------------------------------------------------
// User message builders
// ---------------------------------------------------------------------------

/**
 * Builds the user message for question generation (variation/mock_exam).
 * Structure follows the plan: INPUT 1 (passage), INPUT 2 (request),
 * INPUT 3 (type rules), FEW-SHOT EXAMPLES, SCHOOL DNA PROFILE (optional).
 */
export function buildGenerateUserMessage(
  passage: StructuredPassage,
  typeContexts: TypeContext[],
  fewShotExamples: string,
  options: GenerationOptions,
  dnaProfile?: SchoolDnaProfile
): string {
  const sections: string[] = []

  // === INPUT 1: STRUCTURED PASSAGE ===
  sections.push('=== INPUT 1: STRUCTURED PASSAGE ===')
  sections.push(`Title: ${passage.title ?? 'Untitled'}`)
  sections.push(`Word Count: ${passage.wordCount}`)
  sections.push(`Difficulty: ${passage.estimatedDifficulty}/5`)
  sections.push(`Topics: ${passage.topics.join(', ')}`)
  sections.push('')
  sections.push('Full Text:')
  sections.push(passage.fullText)
  sections.push('')

  // Paragraph-level detail
  sections.push('Paragraphs:')
  for (const para of passage.paragraphs) {
    sections.push(`  Paragraph ${para.index}:`)
    for (const sent of para.sentences) {
      sections.push(`    [${sent.index}] ${sent.text}`)
    }
  }
  sections.push('')

  // Key vocabulary
  if (passage.keyVocab.length > 0) {
    sections.push('Key Vocabulary:')
    for (const v of passage.keyVocab) {
      const parts = [v.word, `(${v.pos})`, v.definition]
      if (v.definitionKo) parts.push(`[${v.definitionKo}]`)
      if (v.synonyms && v.synonyms.length > 0) parts.push(`synonyms: ${v.synonyms.join(', ')}`)
      if (v.antonyms && v.antonyms.length > 0) parts.push(`antonyms: ${v.antonyms.join(', ')}`)
      sections.push(`  - ${parts.join(' ')}`)
    }
    sections.push('')
  }

  // === INPUT 2: GENERATION REQUEST ===
  sections.push('=== INPUT 2: GENERATION REQUEST ===')
  sections.push(JSON.stringify({
    question_types: options.types,
    count_per_type: options.count,
    target_difficulty: options.difficulty,
    passage_coverage: 'balanced',
    explanation_language: options.explanationLanguage ?? 'Korean',
  }, null, 2))
  sections.push('')

  // === INPUT 3: TYPE RULES & SCHEMAS ===
  sections.push('=== INPUT 3: TYPE RULES & SCHEMAS ===')
  for (const ctx of typeContexts) {
    sections.push(`\n--- ${ctx.typeNameKo} (${ctx.typeId}) ---`)
    sections.push(`Description: ${ctx.description}`)
    sections.push(`Difficulty Range: ${ctx.difficultyRange[0]}-${ctx.difficultyRange[1]}`)
    sections.push(`Instruction Template: ${ctx.instructionTemplate}`)
    sections.push(`Output Schema: ${JSON.stringify(ctx.outputSchema, null, 2)}`)
    sections.push('Generation Rules:')
    for (const rule of ctx.generationRules) {
      sections.push(`  - ${rule}`)
    }
  }
  sections.push('')

  // === FEW-SHOT EXAMPLES ===
  if (fewShotExamples.trim()) {
    sections.push('=== FEW-SHOT EXAMPLES ===')
    sections.push(fewShotExamples)
    sections.push('')
  }

  // === SCHOOL DNA PROFILE === (optional, for mock_exam)
  if (dnaProfile) {
    sections.push('=== SCHOOL DNA PROFILE ===')
    sections.push(`School: ${dnaProfile.school_name}`)
    sections.push(`Grade: ${dnaProfile.grade}`)
    sections.push(`Exam Count Analyzed: ${dnaProfile.exam_count}`)
    sections.push('')
    sections.push('Type Distribution:')
    for (const [typeId, dist] of Object.entries(dnaProfile.question_type_distribution)) {
      sections.push(`  ${typeId}: count=${dist.total_count}, rate=${(dist.presence_rate * 100).toFixed(1)}%`)
    }
    sections.push('')
    sections.push('Grammar Focus (Top Points):')
    for (const gp of dnaProfile.grammar_focus.top_grammar_points) {
      sections.push(`  - ${gp.grammar_point} (frequency: ${gp.frequency})`)
    }
    sections.push('')
    sections.push('Generation Guidelines:')
    sections.push(`  Recommended Mix: ${dnaProfile.generation_guidelines.recommended_type_mix.join(', ')}`)
    sections.push(`  Grammar Priority: ${dnaProfile.generation_guidelines.grammar_priority_list.join(', ')}`)
    if (dnaProfile.generation_guidelines.vocabulary_guidelines.length > 0) {
      sections.push(`  Vocabulary: ${dnaProfile.generation_guidelines.vocabulary_guidelines.join('; ')}`)
    }
    if (dnaProfile.generation_guidelines.formatting_notes.length > 0) {
      sections.push(`  Formatting: ${dnaProfile.generation_guidelines.formatting_notes.join('; ')}`)
    }
    sections.push('')
  }

  // Final instruction
  const totalCount = options.types.length * options.count
  sections.push(
    `Generate exactly ${totalCount} questions (${options.count} per type) as a JSON array. ` +
    `Each question must follow the output_schema for its type. Return ONLY the JSON array.`
  )

  return sections.join('\n')
}

/**
 * Builds the user message for workbook generation.
 */
export function buildWorkbookUserMessage(
  passage: StructuredPassage,
  typeContexts: TypeContext[],
  fewShotExamples: string,
  options: GenerationOptions
): string {
  // Workbook uses the same structure but without DNA profile
  return buildGenerateUserMessage(passage, typeContexts, fewShotExamples, options)
}

/**
 * Builds the user message for question validation.
 */
export function buildValidateUserMessage(
  passage: StructuredPassage,
  question: GeneratedQuestion
): string {
  const sections: string[] = []

  sections.push('=== ORIGINAL PASSAGE ===')
  sections.push(`Title: ${passage.title ?? 'Untitled'}`)
  sections.push(`Full Text: ${passage.fullText}`)
  sections.push(`Word Count: ${passage.wordCount}`)
  sections.push(`Difficulty: ${passage.estimatedDifficulty}/5`)
  sections.push('')

  sections.push('=== QUESTION TO VALIDATE ===')
  sections.push(JSON.stringify(question, null, 2))
  sections.push('')

  sections.push(
    'Validate this question against all 7 checks. ' +
    'Return a JSON object with the DetailedValidationResult schema.'
  )

  return sections.join('\n')
}

/**
 * Builds a correction message for failed questions.
 * Used in the self-correction loop (max 2 rounds).
 */
export function buildCorrectionMessage(
  failedQuestions: GeneratedQuestion[],
  validationResults: DetailedValidationResult[],
  passage: StructuredPassage,
  typeContexts: TypeContext[]
): string {
  const sections: string[] = []

  sections.push('=== CORRECTION REQUEST ===')
  sections.push(
    'The following questions failed validation. ' +
    'Please fix them according to the feedback provided.'
  )
  sections.push('')

  for (let i = 0; i < failedQuestions.length; i++) {
    const q = failedQuestions[i]
    const v = validationResults[i]

    sections.push(`--- Question ${q.question_number} (${q.type_id}) ---`)
    sections.push(`Verdict: ${v.overall_verdict}`)
    sections.push(`Corrective Action: ${v.corrective_action}`)
    sections.push(`Quality Score: ${v.quality_score}/100`)
    sections.push('')

    // Failed checks with details
    sections.push('Failed/Warning Checks:')
    for (const [checkName, check] of Object.entries(v.checks)) {
      if (check.verdict === 'FAIL' || check.verdict === 'WARN') {
        sections.push(`  [${check.verdict}] ${checkName}: ${check.details}`)
      }
    }
    sections.push('')

    // Patch suggestions
    if (v.patch_suggestions.length > 0) {
      sections.push('Patch Suggestions:')
      for (const ps of v.patch_suggestions) {
        sections.push(`  - Field: ${ps.field}`)
        sections.push(`    Issue: ${ps.issue}`)
        sections.push(`    Suggested Fix: ${ps.suggested_fix}`)
      }
      sections.push('')
    }

    // Original question for reference
    sections.push('Original Question:')
    sections.push(JSON.stringify(q, null, 2))
    sections.push('')
  }

  // Passage context
  sections.push('=== PASSAGE REFERENCE ===')
  sections.push(passage.fullText)
  sections.push('')

  // Type rules for reference
  sections.push('=== TYPE RULES REFERENCE ===')
  for (const ctx of typeContexts) {
    const relevantTypes = failedQuestions.map((q) => q.type_id)
    if (!relevantTypes.includes(ctx.typeId)) continue

    sections.push(`\n--- ${ctx.typeNameKo} (${ctx.typeId}) ---`)
    sections.push(`Output Schema: ${JSON.stringify(ctx.outputSchema, null, 2)}`)
    sections.push('Key Rules:')
    for (const rule of ctx.generationRules.slice(0, 5)) {
      sections.push(`  - ${rule}`)
    }
  }
  sections.push('')

  sections.push(
    'Return the corrected questions as a JSON array. ' +
    'Maintain the same question_number and type_id. Fix ONLY the issues identified.'
  )

  return sections.join('\n')
}

/**
 * Builds the system prompt for AI chat interactions.
 * Injects current passage and questions as context.
 */
export function buildChatSystemPrompt(
  passage?: StructuredPassage,
  questions?: GeneratedQuestion[]
): string {
  const parts: string[] = []

  parts.push(
    'You are Haean AI, an expert English exam tutor for Korean high school students. ' +
    'Always respond in Korean. When explaining grammar or vocabulary, use English terms with Korean explanations.'
  )
  parts.push('')

  // Context injection
  if (passage) {
    parts.push('=== 현재 지문 컨텍스트 ===')
    parts.push(`제목: ${passage.title ?? '제목 없음'}`)
    parts.push(`전체 텍스트: ${passage.fullText}`)
    parts.push(`단어 수: ${passage.wordCount}`)
    parts.push(`난이도: ${passage.estimatedDifficulty}/5`)
    parts.push('')
  }

  if (questions && questions.length > 0) {
    parts.push('=== 생성된 문제 컨텍스트 ===')
    for (const q of questions) {
      parts.push(`[문제 ${q.question_number}] ${q.type_id} — ${q.instruction}`)
      parts.push(`  정답: ${q.answer}`)
      parts.push(`  해설: ${q.explanation}`)
    }
    parts.push('')
  }

  // Question modification protocol
  parts.push('=== 문제 수정 프로토콜 ===')
  parts.push(
    '사용자가 문제 수정을 요청하면:\n' +
    '1. 먼저 수정 방법을 제안하고 확인을 요청합니다.\n' +
    '2. 사용자가 확인하면 ("네", "좋아요", "해줘", "ok" 등),\n' +
    '   수정된 문제를 <questions_update> JSON 블록으로 반환합니다.\n' +
    '3. <questions_update> 블록 형식:\n' +
    '   <questions_update>\n' +
    '   [{ "question_number": 1, ...수정된 문제 전체 JSON }]\n' +
    '   </questions_update>'
  )

  return parts.join('\n')
}
