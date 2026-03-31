// lib/services/rag.ts — RAG: Question Type Template + Dataset Loader
// Loads question type JSON templates from data/question_types/ with in-memory caching.

import { promises as fs } from 'fs'
import path from 'path'
import type { TypeContext, QuestionExample } from '@/lib/types'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const QUESTION_TYPES_DIR = path.join(process.cwd(), 'data', 'question_types')

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

interface RawQuestionType {
  type_id: string
  type_name_ko: string
  type_name_en: string
  description: string
  difficulty_range: [number, number]
  category: string
  instruction_template: string
  instruction_template_variant?: string
  instruction_template_correct?: string
  output_schema: Record<string, unknown>
  generation_rules: string[]
  examples: Array<{
    instruction: string
    passage_with_markers?: string
    choices: string[] | null
    answer: string
    explanation: string
    test_point?: string
  }>
}

const typeCache = new Map<string, RawQuestionType>()
let allTypeIdsCache: string[] | null = null

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadRawTypeFile(typeId: string): Promise<RawQuestionType> {
  const cached = typeCache.get(typeId)
  if (cached) return cached

  const filePath = path.join(QUESTION_TYPES_DIR, `${typeId}.json`)
  const content = await fs.readFile(filePath, 'utf-8')
  const parsed: RawQuestionType = JSON.parse(content)
  typeCache.set(typeId, parsed)
  return parsed
}

function rawToTypeContext(raw: RawQuestionType): TypeContext {
  return {
    typeId: raw.type_id,
    typeNameKo: raw.type_name_ko,
    typeNameEn: raw.type_name_en,
    description: raw.description,
    difficultyRange: raw.difficulty_range,
    category: raw.category,
    instructionTemplate: raw.instruction_template,
    outputSchema: raw.output_schema,
    generationRules: raw.generation_rules,
    examples: raw.examples.map((ex) => ({
      instruction: ex.instruction,
      passage_with_markers: ex.passage_with_markers,
      choices: ex.choices,
      answer: ex.answer,
      explanation: ex.explanation,
      test_point: ex.test_point,
    })),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads TypeContext for each requested type ID.
 * Reads from data/question_types/*.json with in-memory caching.
 */
export async function loadQuestionTypeContext(
  selectedTypes: string[]
): Promise<TypeContext[]> {
  const results: TypeContext[] = []

  for (const typeId of selectedTypes) {
    try {
      const raw = await loadRawTypeFile(typeId)
      results.push(rawToTypeContext(raw))
    } catch (err) {
      console.warn(
        `[rag] Failed to load question type "${typeId}":`,
        err instanceof Error ? err.message : err
      )
    }
  }

  return results
}

/**
 * Formats few-shot examples as text blocks for prompt injection.
 */
export async function loadFewShotExamples(
  types: string[],
  countPerType: number = 1
): Promise<string> {
  const sections: string[] = []

  for (const typeId of types) {
    try {
      const raw = await loadRawTypeFile(typeId)
      const examples = raw.examples.slice(0, countPerType)

      if (examples.length === 0) continue

      const exampleBlocks = examples.map((ex: QuestionExample, idx: number) => {
        const lines: string[] = [
          `--- Example ${idx + 1} (${raw.type_name_ko} / ${raw.type_id}) ---`,
          `Instruction: ${ex.instruction}`,
        ]

        if (ex.passage_with_markers) {
          lines.push(`Passage: ${ex.passage_with_markers}`)
        }
        if (ex.choices) {
          lines.push(`Choices: ${JSON.stringify(ex.choices)}`)
        }
        lines.push(`Answer: ${ex.answer}`)
        lines.push(`Explanation: ${ex.explanation}`)
        if (ex.test_point) {
          lines.push(`Test Point: ${ex.test_point}`)
        }
        return lines.join('\n')
      })

      sections.push(exampleBlocks.join('\n\n'))
    } catch {
      // Skip types that fail to load
    }
  }

  return sections.join('\n\n')
}

/**
 * Scans data/question_types/ directory and returns all available type IDs.
 */
export async function loadAllAvailableTypeIds(): Promise<string[]> {
  if (allTypeIdsCache) return allTypeIdsCache

  const files = await fs.readdir(QUESTION_TYPES_DIR)
  allTypeIdsCache = files
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort()

  return allTypeIdsCache
}

/**
 * Returns type IDs available for a given generation mode based on category filtering.
 * - variation / mock_exam: shared + variation types
 * - workbook: shared + workbook types
 */
export async function getTypesForMode(
  mode: 'variation' | 'workbook' | 'mock_exam'
): Promise<string[]> {
  const allIds = await loadAllAvailableTypeIds()
  const results: string[] = []

  for (const typeId of allIds) {
    try {
      const raw = await loadRawTypeFile(typeId)
      const category = raw.category

      if (mode === 'workbook') {
        if (category === 'shared' || category === 'workbook') {
          results.push(typeId)
        }
      } else {
        // variation or mock_exam
        if (category === 'shared' || category === 'variation') {
          results.push(typeId)
        }
      }
    } catch {
      // Skip types that fail to load
    }
  }

  return results
}
