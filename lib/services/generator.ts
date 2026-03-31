// lib/services/generator.ts — Question Generation Engine
// The most complex service: orchestrates RAG loading, prompt building,
// Claude API calls, validation, and self-correction loops.

import { callClaude, extractJSON } from '@/lib/services/anthropic'
import { loadQuestionTypeContext, loadFewShotExamples, getTypesForMode } from '@/lib/services/rag'
import {
  buildGenerateSystemPrompt,
  buildWorkbookSystemPrompt,
  buildGenerateUserMessage,
  buildWorkbookUserMessage,
  buildCorrectionMessage,
} from '@/lib/services/prompt-builder'
import { validateQuestions } from '@/lib/services/validator'
import type {
  StructuredPassage,
  GenerationOptions,
  GeneratedQuestion,
  DetailedValidationResult,
  SchoolDnaProfile,
  TypeContext,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CORRECTION_ROUNDS = 2

// ---------------------------------------------------------------------------
// Internal: Parse generated questions from Claude response
// ---------------------------------------------------------------------------

function parseGeneratedQuestions(raw: string): GeneratedQuestion[] {
  const jsonStr = extractJSON(raw)
  const parsed = JSON.parse(jsonStr)

  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array of questions, got: ' + typeof parsed)
  }

  return parsed.map((q: Record<string, unknown>, idx: number) => ({
    question_number: (q.question_number as number) ?? idx + 1,
    type_id: q.type_id as string ?? q.type as string ?? 'unknown',
    difficulty: (q.difficulty as number) ?? 3,
    instruction: q.instruction as string ?? '',
    passage_with_markers: q.passage_with_markers as string ?? '',
    choices: Array.isArray(q.choices) ? q.choices as string[] : null,
    answer: q.answer as string ?? '',
    explanation: q.explanation as string ?? '',
    test_point: q.test_point as string ?? '',
    rawPassage: q.rawPassage as string ?? undefined,
    intro_passage: q.intro_passage as string ?? undefined,
    blocks: q.blocks as Record<string, string> ?? undefined,
    statements: q.statements as GeneratedQuestion['statements'] ?? undefined,
    conditions: q.conditions as string[] ?? undefined,
  }))
}

// ---------------------------------------------------------------------------
// Internal: Split pass/fail based on validation results
// ---------------------------------------------------------------------------

interface SplitResult {
  passed: GeneratedQuestion[]
  failed: GeneratedQuestion[]
  failedResults: DetailedValidationResult[]
}

function splitPassFail(
  questions: GeneratedQuestion[],
  results: DetailedValidationResult[]
): SplitResult {
  const passed: GeneratedQuestion[] = []
  const failed: GeneratedQuestion[] = []
  const failedResults: DetailedValidationResult[] = []

  for (let i = 0; i < questions.length; i++) {
    const result = results[i]
    if (result.overall_verdict === 'PASS' || result.overall_verdict === 'WARN') {
      // WARN questions pass with notes
      passed.push(questions[i])
    } else {
      failed.push(questions[i])
      failedResults.push(result)
    }
  }

  return { passed, failed, failedResults }
}

// ---------------------------------------------------------------------------
// Internal: Determine correction actions for round
// ---------------------------------------------------------------------------

function determineCorrectionAction(
  round: number,
  failedQuestions: GeneratedQuestion[],
  failedResults: DetailedValidationResult[]
): Array<{ question: GeneratedQuestion; result: DetailedValidationResult; action: string }> {
  return failedQuestions.map((q, idx) => {
    const result = failedResults[idx]

    if (round >= 2) {
      // Round 2: any FAIL → ESCALATE (no more retries)
      return { question: q, result, action: 'ESCALATE' }
    }

    // Round 1 logic
    const action = result.corrective_action

    // Check if critical checks failed → escalate immediately
    const checks = result.checks
    const passageFidelityFailed = checks['passage_fidelity']?.verdict === 'FAIL'
    const answerUniqueFailed = checks['answer_uniqueness']?.verdict === 'FAIL'

    if (passageFidelityFailed || answerUniqueFailed) {
      return { question: q, result, action: 'ESCALATE' }
    }

    if (action === 'PATCH' && failedQuestions.length <= 1) {
      return { question: q, result, action: 'PATCH' }
    }

    if (action === 'REGENERATE' || failedQuestions.length >= 2) {
      return { question: q, result, action: 'REGENERATE' }
    }

    return { question: q, result, action: action ?? 'ESCALATE' }
  })
}

// ---------------------------------------------------------------------------
// Internal: Run correction for failed questions
// ---------------------------------------------------------------------------

async function runCorrection(
  failedQuestions: GeneratedQuestion[],
  failedResults: DetailedValidationResult[],
  passage: StructuredPassage,
  typeContexts: TypeContext[],
  systemPrompt: string,
  round: number
): Promise<{ corrected: GeneratedQuestion[]; escalated: GeneratedQuestion[] }> {
  const actions = determineCorrectionAction(round, failedQuestions, failedResults)

  const toCorrect: GeneratedQuestion[] = []
  const toCorrectResults: DetailedValidationResult[] = []
  const escalated: GeneratedQuestion[] = []

  for (const { question, result, action } of actions) {
    if (action === 'ESCALATE') {
      escalated.push(question)
    } else {
      // PATCH or REGENERATE — both go through correction prompt
      toCorrect.push(question)
      toCorrectResults.push(result)
    }
  }

  if (toCorrect.length === 0) {
    return { corrected: [], escalated }
  }

  // Build correction message and call Claude
  const correctionMsg = buildCorrectionMessage(
    toCorrect,
    toCorrectResults,
    passage,
    typeContexts
  )

  try {
    const result = await callClaude(systemPrompt, correctionMsg, 'generate', 8192)
    const correctedQuestions = parseGeneratedQuestions(result.raw)
    return { corrected: correctedQuestions, escalated }
  } catch (err) {
    console.error(
      `[generator] Correction round ${round} failed:`,
      err instanceof Error ? err.message : err
    )
    // If correction fails, escalate all
    return { corrected: [], escalated: [...escalated, ...toCorrect] }
  }
}

// ---------------------------------------------------------------------------
// Internal: Passage coverage fairness check
// ---------------------------------------------------------------------------

function checkPassageCoverage(
  questions: GeneratedQuestion[],
  passage: StructuredPassage
): void {
  // Simple heuristic: ensure questions don't all reference the same paragraph
  if (passage.paragraphs.length <= 1 || questions.length <= 2) return

  // Log a warning if all questions seem to focus on the same section
  const passageTexts = questions
    .map((q) => q.passage_with_markers)
    .filter(Boolean)

  if (passageTexts.length === 0) return

  // Check if first paragraph is disproportionately used
  const firstPara = passage.paragraphs[0]?.rawText ?? ''
  if (!firstPara) return

  const firstParaWords = new Set(firstPara.toLowerCase().split(/\s+/).slice(0, 10))
  let firstParaCount = 0

  for (const text of passageTexts) {
    const words = text.toLowerCase().split(/\s+/).slice(0, 10)
    const overlap = words.filter((w) => firstParaWords.has(w)).length
    if (overlap > 5) firstParaCount++
  }

  if (firstParaCount > Math.ceil(passageTexts.length * 0.8)) {
    console.warn(
      '[generator] Passage coverage warning: most questions focus on the first paragraph.'
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main question generation pipeline.
 *
 * Pipeline steps:
 * 1. RAG load: loadQuestionTypeContext for requested types (filtered by mode)
 * 2. Load few-shot examples
 * 3. Choose system prompt based on generationMode
 * 4. Build user message
 * 5. Call Claude API → parse JSON array
 * 6. Basic validation (parse check)
 * 7. Detailed validation for each question
 * 8. Split pass/fail
 * 9. Correction loop (max 2 rounds)
 * 10. Merge corrected with passed
 * 11. Passage coverage fairness check
 * 12. Return final questions
 */
export async function generateQuestions(
  passage: StructuredPassage,
  options: GenerationOptions,
  dnaProfile?: SchoolDnaProfile
): Promise<GeneratedQuestion[]> {
  const mode = options.generationMode ?? 'variation'

  // ── Step 1: RAG load ──
  // Filter requested types by mode availability
  const availableTypes = await getTypesForMode(mode)
  const requestedTypes = options.types.filter((t) => availableTypes.includes(t))

  if (requestedTypes.length === 0) {
    throw new Error(
      `No valid question types for mode "${mode}". ` +
      `Requested: [${options.types.join(', ')}], Available: [${availableTypes.join(', ')}]`
    )
  }

  const typeContexts = await loadQuestionTypeContext(requestedTypes)

  // ── Step 2: Load few-shot examples ──
  const fewShotExamples = await loadFewShotExamples(requestedTypes, 1)

  // ── Step 3: Choose system prompt ──
  let systemPrompt: string
  if (mode === 'workbook') {
    systemPrompt = await buildWorkbookSystemPrompt()
  } else {
    systemPrompt = await buildGenerateSystemPrompt()
  }

  // ── Step 4: Build user message ──
  let userMessage: string
  if (mode === 'workbook') {
    userMessage = buildWorkbookUserMessage(passage, typeContexts, fewShotExamples, options)
  } else {
    userMessage = buildGenerateUserMessage(
      passage,
      typeContexts,
      fewShotExamples,
      options,
      dnaProfile
    )
  }

  // ── Step 5: Call Claude API ──
  const result = await callClaude(systemPrompt, userMessage, 'generate')

  // ── Step 6: Parse + basic validation ──
  let questions: GeneratedQuestion[]
  try {
    questions = parseGeneratedQuestions(result.raw)
  } catch (err) {
    throw new Error(
      `Failed to parse generated questions: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (questions.length === 0) {
    throw new Error('Claude returned an empty question array.')
  }

  // ── Step 7-9: Validation & correction loop ──
  // DISABLED for now to stay within Vercel 60s timeout.
  // Each validation call takes 15-20s, correction loop adds 2-3 more calls.
  // TODO: Re-enable when using a server with longer timeout, or run async.
  const finalQuestions = questions

  // Re-number questions sequentially
  finalQuestions.forEach((q, idx) => {
    q.question_number = idx + 1
  })

  // ── Step 11: Passage coverage fairness check ──
  checkPassageCoverage(finalQuestions, passage)

  // ── Step 12: Return ──
  return finalQuestions
}
