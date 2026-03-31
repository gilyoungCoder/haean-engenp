// lib/services/validator.ts — Question Validation
// Validates generated questions against the original passage using Claude.

import { randomUUID } from 'crypto'
import { callClaude, extractJSON } from '@/lib/services/anthropic'
import { buildValidateSystemPrompt, buildValidateUserMessage } from '@/lib/services/prompt-builder'
import type {
  StructuredPassage,
  GeneratedQuestion,
  DetailedValidationResult,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Internal: Parse validation response
// ---------------------------------------------------------------------------

function parseValidationResponse(
  raw: string,
  passageId: string,
  question: GeneratedQuestion
): DetailedValidationResult {
  const jsonStr = extractJSON(raw)
  const parsed = JSON.parse(jsonStr)

  return {
    validation_id: parsed.validation_id ?? randomUUID(),
    passage_id: parsed.passage_id ?? passageId,
    question_number: parsed.question_number ?? question.question_number,
    question_type: parsed.question_type ?? question.type_id,
    overall_verdict: parsed.overall_verdict ?? 'FAIL',
    corrective_action: parsed.corrective_action ?? null,
    checks: parsed.checks ?? {},
    patch_suggestions: Array.isArray(parsed.patch_suggestions) ? parsed.patch_suggestions : [],
    quality_score: parsed.quality_score ?? 0,
    validator_notes: parsed.validator_notes ?? '',
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a single question against the original passage.
 * Calls Claude with the validate system prompt and returns a DetailedValidationResult.
 *
 * 7-check validation:
 * 1. 지문 근거 충실도 (passage fidelity)
 * 2. 정답 유일성 (answer uniqueness)
 * 3. 포맷 일관성 (format consistency)
 * 4. 해설 완결성 (explanation completeness)
 * 5. 난이도 적정성 (difficulty appropriateness)
 * 6. 출제 포인트 적절성 (test point relevance)
 * 7. JSON 구문 유효성 (JSON validity)
 */
export async function validateQuestion(
  passage: StructuredPassage,
  question: GeneratedQuestion,
  correctionRound?: number
): Promise<DetailedValidationResult> {
  const systemPrompt = await buildValidateSystemPrompt()
  let userMessage = buildValidateUserMessage(passage, question)

  if (correctionRound !== undefined) {
    userMessage += `\n\nNote: This is correction round ${correctionRound}. Apply stricter evaluation.`
  }

  try {
    const result = await callClaude(systemPrompt, userMessage, 'validate', 4096)
    return parseValidationResponse(result.raw, passage.id, question)
  } catch (err) {
    // If validation call itself fails, return a FAIL result
    console.error(
      `[validator] Failed to validate question ${question.question_number}:`,
      err instanceof Error ? err.message : err
    )

    return {
      validation_id: randomUUID(),
      passage_id: passage.id,
      question_number: question.question_number,
      question_type: question.type_id,
      overall_verdict: 'FAIL',
      corrective_action: 'ESCALATE',
      checks: {
        api_error: {
          verdict: 'FAIL',
          details: `Validation API call failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      },
      patch_suggestions: [],
      quality_score: 0,
      validator_notes: 'Validation could not be completed due to API error.',
    }
  }
}

/**
 * Validates all questions sequentially.
 * Sequential execution avoids rate limit issues with Claude API.
 */
export async function validateQuestions(
  passage: StructuredPassage,
  questions: GeneratedQuestion[]
): Promise<DetailedValidationResult[]> {
  const results: DetailedValidationResult[] = []

  for (const question of questions) {
    const result = await validateQuestion(passage, question)
    results.push(result)
  }

  return results
}
