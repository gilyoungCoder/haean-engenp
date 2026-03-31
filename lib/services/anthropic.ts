// lib/services/anthropic.ts — Claude API Wrapper (Singleton)
// Provides text, vision, and streaming calls to Claude with retry logic.

import Anthropic from '@anthropic-ai/sdk'
import type {
  ClaudeTask,
  ClaudeResponse,
  ImageMediaType,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class AnthropicServiceError extends Error {
  code: string
  retryable: boolean
  statusCode?: number

  constructor(message: string, code: string, retryable: boolean, statusCode?: number) {
    super(message)
    this.name = 'AnthropicServiceError'
    this.code = code
    this.retryable = retryable
    this.statusCode = statusCode
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

const DEFAULT_MAX_TOKENS: Record<ClaudeTask, number> = {
  structurize: 16384,
  generate: 16384,
  validate: 8192,
  chat: 4096,
  dna: 8192,
}

const MAX_RETRIES = 3
const BACKOFF_BASE_MS = 800

// ---------------------------------------------------------------------------
// Singleton client (lazy init)
// ---------------------------------------------------------------------------

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new AnthropicServiceError(
        'ANTHROPIC_API_KEY is not set',
        'MISSING_API_KEY',
        false
      )
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------

/**
 * Extracts JSON from Claude's response, handling markdown code fences
 * or raw JSON responses.
 */
export function extractJSON(raw: string): string {
  const trimmed = raw.trim()

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  // Handle various fence styles Claude may use
  const fencePattern = /^```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```\s*$/
  const fenceMatch = trimmed.match(fencePattern)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  // Try inline fence (fence not at start/end of string)
  const inlineFencePattern = /```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```/
  const inlineMatch = trimmed.match(inlineFencePattern)
  if (inlineMatch) {
    return inlineMatch[1].trim()
  }

  // Try to find first { or [ and match to last } or ]
  const firstBrace = trimmed.indexOf('{')
  const firstBracket = trimmed.indexOf('[')
  let startIdx = -1

  if (firstBrace === -1 && firstBracket === -1) return trimmed
  if (firstBrace === -1) startIdx = firstBracket
  else if (firstBracket === -1) startIdx = firstBrace
  else startIdx = Math.min(firstBrace, firstBracket)

  const startChar = trimmed[startIdx]
  const endChar = startChar === '{' ? '}' : ']'
  const lastEnd = trimmed.lastIndexOf(endChar)

  if (lastEnd > startIdx) {
    return trimmed.slice(startIdx, lastEnd + 1)
  }

  return trimmed
}

// ---------------------------------------------------------------------------
// Retry helper with exponential backoff
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  taskLabel: string
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Determine if retryable
      const isRetryable = isRetryableError(err)
      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        throw wrapError(err, taskLabel)
      }

      // Exponential backoff
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  throw wrapError(lastError, taskLabel)
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    // Rate limit (429), server errors (500+), timeout
    return err.status === 429 || err.status >= 500
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return msg.includes('timeout') || msg.includes('econnreset') || msg.includes('socket hang up')
  }
  return false
}

function wrapError(err: unknown, taskLabel: string): AnthropicServiceError {
  if (err instanceof AnthropicServiceError) return err

  if (err instanceof Anthropic.APIError) {
    return new AnthropicServiceError(
      `Claude API error during ${taskLabel}: ${err.message}`,
      `API_${err.status}`,
      isRetryableError(err),
      err.status
    )
  }

  const message = err instanceof Error ? err.message : String(err)
  return new AnthropicServiceError(
    `Claude API error during ${taskLabel}: ${message}`,
    'UNKNOWN',
    false
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// callClaude — Text-only API call
// ---------------------------------------------------------------------------

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  task: ClaudeTask,
  maxTokens?: number
): Promise<ClaudeResponse> {
  const tokens = maxTokens ?? DEFAULT_MAX_TOKENS[task]

  return withRetry(async () => {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: tokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock ? textBlock.text : ''

    return {
      raw,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  }, task)
}

// ---------------------------------------------------------------------------
// callClaudeWithVision — Vision API call (base64 image)
// ---------------------------------------------------------------------------

export async function callClaudeWithVision(
  systemPrompt: string,
  imageBase64: string,
  mediaType: ImageMediaType,
  userText: string,
  maxTokens?: number
): Promise<ClaudeResponse> {
  const tokens = maxTokens ?? DEFAULT_MAX_TOKENS.structurize

  return withRetry(async () => {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: tokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: userText,
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock ? textBlock.text : ''

    return {
      raw,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  }, 'vision')
}

// ---------------------------------------------------------------------------
// callClaudeWithMultipleImages — Vision API with multiple images
// ---------------------------------------------------------------------------

export async function callClaudeWithMultipleImages(
  systemPrompt: string,
  images: Array<{ base64: string; mediaType: ImageMediaType }>,
  userText: string,
  maxTokens?: number
): Promise<ClaudeResponse> {
  const tokens = maxTokens ?? DEFAULT_MAX_TOKENS.dna

  const contentBlocks: Anthropic.MessageCreateParams['messages'][0]['content'] = [
    ...images.map((img) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mediaType,
        data: img.base64,
      },
    })),
    { type: 'text' as const, text: userText },
  ]

  return withRetry(async () => {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: tokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock ? textBlock.text : ''

    return {
      raw,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  }, 'multi-vision')
}

// ---------------------------------------------------------------------------
// callClaudeStream — SSE streaming for chat
// ---------------------------------------------------------------------------

export async function* callClaudeStream(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number
): AsyncIterable<string> {
  const tokens = maxTokens ?? DEFAULT_MAX_TOKENS.chat

  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: tokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

// ---------------------------------------------------------------------------
// callClaudeStreamWithMessages — SSE streaming with full message history
// ---------------------------------------------------------------------------

export async function* callClaudeStreamWithMessages(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens?: number
): AsyncIterable<string> {
  const tokens = maxTokens ?? DEFAULT_MAX_TOKENS.chat

  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: tokens,
    system: systemPrompt,
    messages,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}
