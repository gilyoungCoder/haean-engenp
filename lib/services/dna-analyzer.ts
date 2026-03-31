// lib/services/dna-analyzer.ts — School Exam DNA Analysis
// Analyzes past exam papers to extract a school's question generation patterns.

import { randomUUID } from 'crypto'
import { callClaudeWithMultipleImages, extractJSON } from '@/lib/services/anthropic'
import { buildDnaAnalysisSystemPrompt } from '@/lib/services/prompt-builder'
import type {
  SchoolDnaProfile,
  DnaExamImage,
  DnaExamMetadata,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Internal: Parse DNA profile response
// ---------------------------------------------------------------------------

function parseDnaProfileResponse(raw: string): SchoolDnaProfile {
  const jsonStr = extractJSON(raw)
  const parsed = JSON.parse(jsonStr)

  return {
    profile_id: parsed.profile_id ?? randomUUID(),
    school_name: parsed.school_name ?? 'Unknown',
    grade: parsed.grade ?? 0,
    exam_count: parsed.exam_count ?? 0,
    question_type_distribution: parsed.question_type_distribution ?? {},
    grammar_focus: {
      top_grammar_points: Array.isArray(parsed.grammar_focus?.top_grammar_points)
        ? parsed.grammar_focus.top_grammar_points
        : [],
    },
    vocabulary_style: {
      antonym_swap_rate: parsed.vocabulary_style?.antonym_swap_rate ?? 0,
      semantic_field_swap_rate: parsed.vocabulary_style?.semantic_field_swap_rate ?? 0,
      preferred_difficulty: parsed.vocabulary_style?.preferred_difficulty ?? 3,
    },
    distractor_patterns: {
      passage_word_recycling_rate: parsed.distractor_patterns?.passage_word_recycling_rate ?? 0,
      similar_form_rate: parsed.distractor_patterns?.similar_form_rate ?? 0,
    },
    difficulty_trend: {
      average: parsed.difficulty_trend?.average ?? 3,
      range: parsed.difficulty_trend?.range ?? [2, 4],
    },
    generation_guidelines: {
      recommended_type_mix: Array.isArray(parsed.generation_guidelines?.recommended_type_mix)
        ? parsed.generation_guidelines.recommended_type_mix
        : [],
      grammar_priority_list: Array.isArray(parsed.generation_guidelines?.grammar_priority_list)
        ? parsed.generation_guidelines.grammar_priority_list
        : [],
      vocabulary_guidelines: Array.isArray(parsed.generation_guidelines?.vocabulary_guidelines)
        ? parsed.generation_guidelines.vocabulary_guidelines
        : [],
      formatting_notes: Array.isArray(parsed.generation_guidelines?.formatting_notes)
        ? parsed.generation_guidelines.formatting_notes
        : [],
    },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyzes school exam papers (images) to extract a DNA profile.
 * Sends all exam images to Claude Vision in a single call.
 *
 * @param images - Array of base64-encoded exam images (max 20)
 * @param metadata - Optional metadata about the school and exam papers
 * @returns SchoolDnaProfile with analyzed patterns
 */
export async function analyzeDna(
  images: DnaExamImage[],
  metadata?: DnaExamMetadata
): Promise<SchoolDnaProfile> {
  if (images.length === 0) {
    throw new Error('At least one exam image is required for DNA analysis.')
  }

  if (images.length > 20) {
    throw new Error('Maximum 20 exam images allowed per DNA analysis.')
  }

  const systemPrompt = await buildDnaAnalysisSystemPrompt()

  // Build user text with metadata
  const userTextParts: string[] = [
    'Analyze the following school exam papers and extract the DNA profile.',
  ]

  if (metadata) {
    userTextParts.push('')
    userTextParts.push('=== EXAM METADATA ===')
    userTextParts.push(`School Name: ${metadata.school_name}`)
    userTextParts.push(`Grade: ${metadata.grade}`)

    if (metadata.exam_papers.length > 0) {
      userTextParts.push('')
      userTextParts.push('Exam Papers:')
      for (const paper of metadata.exam_papers) {
        userTextParts.push(
          `  - Image ${paper.image_index + 1}: ${paper.year}년 ${paper.semester}학기 ${paper.exam_type}`
        )
      }
    }
  }

  userTextParts.push('')
  userTextParts.push(`Total images: ${images.length}`)
  userTextParts.push('')
  userTextParts.push(
    'Return the analysis as a single JSON object following the SchoolDnaProfile schema. ' +
    'Analyze question type distribution, grammar focus points, vocabulary patterns, ' +
    'distractor strategies, and provide generation guidelines.'
  )

  const userText = userTextParts.join('\n')

  const result = await callClaudeWithMultipleImages(
    systemPrompt,
    images,
    userText,
    8192
  )

  return parseDnaProfileResponse(result.raw)
}
