// lib/services/structurizer.ts — VLM Passage Structurization
// Handles image → StructuredPassage and PDF → StructuredPassage conversion.

import { randomUUID } from 'crypto'
import { callClaude, callClaudeWithVision, extractJSON } from '@/lib/services/anthropic'
import { buildStructurizeSystemPrompt } from '@/lib/services/prompt-builder'
import type { StructuredPassage, ImageMediaType, KeyVocab, GrammarPoint } from '@/lib/types'

// ---------------------------------------------------------------------------
// SSRF prevention
// ---------------------------------------------------------------------------

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^localhost$/i,
]

function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Only HTTPS allowed
    if (parsed.protocol !== 'https:') return true

    // Block private IPs
    const hostname = parsed.hostname
    return PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostname))
  } catch {
    return true
  }
}

// ---------------------------------------------------------------------------
// Internal: Parse structured passage response
// ---------------------------------------------------------------------------

function sanitizeJSON(str: string): string {
  // Fix common Claude JSON issues:
  // 1. Control characters inside strings (unescaped newlines, tabs)
  // 2. Trailing commas before } or ]
  let result = str

  // Remove trailing commas: ,} or ,]
  result = result.replace(/,\s*([}\]])/g, '$1')

  return result
}

function parseJSON(jsonStr: string): Record<string, unknown> {
  // First try direct parse
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch {
    // Try after sanitization
  }

  // Try sanitized version
  try {
    return JSON.parse(sanitizeJSON(jsonStr)) as Record<string, unknown>
  } catch {
    // Try more aggressive cleanup
  }

  // Last resort: try to repair by finding balanced braces
  const start = jsonStr.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  let depth = 0
  let end = -1
  let inString = false
  let escaped = false

  for (let i = start; i < jsonStr.length; i++) {
    const ch = jsonStr[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (ch === '\\') {
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) {
    // JSON is truncated — auto-close open braces/brackets
    let truncated = jsonStr.slice(start)

    // Remove any trailing incomplete string (unmatched quote)
    if (inString) {
      const lastQuote = truncated.lastIndexOf('"')
      if (lastQuote > 0) {
        truncated = truncated.slice(0, lastQuote + 1)
      }
    }

    // Remove trailing comma or colon
    truncated = truncated.replace(/[,:\s]+$/, '')

    // Close all open braces/brackets
    let openBraces = 0
    let openBrackets = 0
    let inStr = false
    let esc = false
    for (const c of truncated) {
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (c === '{') openBraces++
      else if (c === '}') openBraces--
      else if (c === '[') openBrackets++
      else if (c === ']') openBrackets--
    }
    truncated += ']'.repeat(Math.max(0, openBrackets))
    truncated += '}'.repeat(Math.max(0, openBraces))

    try {
      return JSON.parse(sanitizeJSON(truncated)) as Record<string, unknown>
    } catch {
      throw new Error('Failed to parse Claude response as JSON. The response may be too large or malformed.')
    }
  }

  const balanced = jsonStr.slice(start, end + 1)
  return JSON.parse(sanitizeJSON(balanced)) as Record<string, unknown>
}

function parseStructuredPassageResponse(raw: string): StructuredPassage {
  const jsonStr = extractJSON(raw)
  const parsed = parseJSON(jsonStr)

  // Inject UUID and timestamp
  const passage: StructuredPassage = {
    id: randomUUID(),
    title: (parsed.title as string) ?? undefined,
    source: (parsed.source as string) ?? undefined,
    paragraphs: Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [],
    keyVocab: Array.isArray(parsed.key_vocab ?? parsed.keyVocab)
      ? (parsed.key_vocab ?? parsed.keyVocab) as KeyVocab[]
      : [],
    grammarPoints: Array.isArray(parsed.grammar_points ?? parsed.grammarPoints)
      ? (parsed.grammar_points ?? parsed.grammarPoints) as GrammarPoint[]
      : undefined,
    fullText: (parsed.full_text ?? parsed.fullText ?? '') as string,
    wordCount: (parsed.word_count ?? parsed.wordCount ?? 0) as number,
    estimatedDifficulty: (parsed.estimated_difficulty ?? parsed.estimatedDifficulty ?? 3) as number,
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    structurizedAt: new Date().toISOString(),
  }

  // Ensure fullText is populated
  if (!passage.fullText && passage.paragraphs.length > 0) {
    passage.fullText = passage.paragraphs
      .map((p) => p.rawText ?? p.sentences.map((s) => s.text).join(' '))
      .join('\n\n')
  }

  // Ensure wordCount is populated
  if (!passage.wordCount && passage.fullText) {
    passage.wordCount = passage.fullText.split(/\s+/).filter(Boolean).length
  }

  return passage
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Structurizes a passage from a publicly accessible HTTPS URL.
 * Fetches the image and converts to base64 before calling Claude Vision.
 */
export async function structurizeFromUrl(fileUrl: string): Promise<StructuredPassage> {
  // SSRF prevention
  if (isPrivateUrl(fileUrl)) {
    throw new Error(
      'Invalid URL: only public HTTPS URLs are allowed. ' +
      'Private/local addresses are blocked for security.'
    )
  }

  // Fetch image
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg'
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  // Validate media type
  const mediaType = normalizeMediaType(contentType)

  return structurizeFromBase64(base64, mediaType)
}

/**
 * Structurizes a passage from a base64-encoded image.
 * Calls Claude Vision API directly.
 */
export async function structurizeFromBase64(
  base64: string,
  mediaType: string
): Promise<StructuredPassage> {
  const systemPrompt = await buildStructurizeSystemPrompt()
  const validMediaType = normalizeMediaType(mediaType)

  const result = await callClaudeWithVision(
    systemPrompt,
    base64,
    validMediaType,
    'Please analyze this image and extract the English passage into the structured JSON format as specified in your instructions.',
    4096
  )

  return parseStructuredPassageResponse(result.raw)
}

/**
 * Structurizes a passage from a PDF buffer.
 * Uses pdf-parse for text extraction. If text is sufficient (>= 50 chars),
 * uses text-only Claude call. Otherwise, throws an error suggesting image upload.
 */
export async function structurizeFromPdf(buffer: Buffer): Promise<StructuredPassage> {
  // Dynamic import of pdf-parse (not all environments may have it)
  const pdfParse = (await import('pdf-parse')).default
  const pdfData = await pdfParse(buffer)

  const extractedText = pdfData.text?.trim() ?? ''

  if (extractedText.length >= 50) {
    // Text-based PDF: use Claude text API (no vision needed, saves tokens)
    const systemPrompt = await buildStructurizeSystemPrompt()

    const userMessage =
      'The following text was extracted from a PDF file. ' +
      'Please analyze and structurize it according to your instructions.\n\n' +
      '=== EXTRACTED TEXT ===\n' +
      extractedText

    const result = await callClaude(systemPrompt, userMessage, 'structurize')
    return parseStructuredPassageResponse(result.raw)
  }

  // Scanned PDF (text < 50 chars): VLM fallback
  // In a full implementation, we would convert PDF pages to images.
  // For now, throw an informative error asking for image upload.
  throw new Error(
    'This appears to be a scanned PDF with insufficient text content. ' +
    'Please upload the pages as JPG/PNG images instead for accurate analysis.'
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeMediaType(contentType: string): ImageMediaType {
  const lower = contentType.toLowerCase()
  if (lower.includes('png')) return 'image/png'
  if (lower.includes('gif')) return 'image/gif'
  if (lower.includes('webp')) return 'image/webp'
  return 'image/jpeg' // default
}
