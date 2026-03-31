// lib/api-client.ts — Internal API call wrapper for client-side
// Each function maps to an API route endpoint.

import type {
  StructuredPassage,
  GenerationOptions,
  GeneratedQuestion,
  SchoolDnaProfile,
  ExportOptions,
  UploadedFile,
} from './types'

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    return { error: body.error || `Request failed: ${res.status}` }
  }

  const data = await res.json()
  return { data }
}

// ─── Structurize ───────────────────────────────────────────────────────────

export interface StructurizeRequest {
  passageId: string
}

export interface StructurizeResponse {
  passage: StructuredPassage
}

export async function structurize(
  data: StructurizeRequest
): Promise<ApiResponse<StructurizeResponse>> {
  return fetchApi<StructurizeResponse>('/api/structurize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Generate ──────────────────────────────────────────────────────────────

export interface GenerateRequest {
  passageId: string
  options: GenerationOptions
}

export interface GenerateResponse {
  questionSetId: string
  questions: GeneratedQuestion[]
}

export async function generate(
  data: GenerateRequest
): Promise<ApiResponse<GenerateResponse>> {
  return fetchApi<GenerateResponse>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── DNA Analysis ──────────────────────────────────────────────────────────

export interface AnalyzeDnaRequest {
  images: { base64: string; mediaType: string }[]
  metadata: {
    school_name: string
    grade: number
    exam_papers: { semester: number; exam_type: string; year: number; image_index: number }[]
  }
}

export interface AnalyzeDnaResponse {
  profile: SchoolDnaProfile
}

export async function analyzeDna(
  data: AnalyzeDnaRequest
): Promise<ApiResponse<AnalyzeDnaResponse>> {
  return fetchApi<AnalyzeDnaResponse>('/api/analyze-dna', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Chat (SSE Streaming) ──────────────────────────────────────────────────

export interface ChatStreamRequest {
  passageId: string
  message: string
}

export async function chatStream(
  data: ChatStreamRequest
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `Chat request failed: ${res.status}`)
  }

  if (!res.body) {
    throw new Error('No response body for chat stream')
  }

  return res.body
}

// ─── Export DOCX ───────────────────────────────────────────────────────────

export interface ExportDocxRequest {
  questionSetId: string
  options: ExportOptions
}

export interface ExportDocxResponse {
  fileUrl: string
}

export async function exportDocx(
  data: ExportDocxRequest
): Promise<ApiResponse<ExportDocxResponse>> {
  return fetchApi<ExportDocxResponse>('/api/export', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── File Upload ───────────────────────────────────────────────────────────

export async function uploadFile(
  file: File
): Promise<ApiResponse<UploadedFile>> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/structurize', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    return { error: body.error || `Upload failed: ${res.status}` }
  }

  const data = await res.json()
  return { data }
}

// ─── Projects ──────────────────────────────────────────────────────────────

export interface ProjectListItem {
  id: string
  title: string
  status: string
  createdAt: string
}

export async function getProjects(): Promise<ApiResponse<ProjectListItem[]>> {
  return fetchApi<ProjectListItem[]>('/api/structurize', {
    method: 'GET',
  })
}

export async function deleteProject(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchApi<{ success: boolean }>(`/api/structurize?id=${id}`, {
    method: 'DELETE',
  })
}
