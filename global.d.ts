// Type declarations for CSS modules and static assets

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}

// Type declarations for packages without bundled types
declare module 'bcryptjs' {
  export function hash(s: string, salt: number | string): Promise<string>
  export function hashSync(s: string, salt: number | string): string
  export function compare(s: string, hash: string): Promise<boolean>
  export function compareSync(s: string, hash: string): boolean
  export function genSalt(rounds?: number): Promise<string>
  export function genSaltSync(rounds?: number): string
  export function getRounds(hash: string): number
}

declare module 'pdf-parse' {
  interface PDFData {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown> | null
    version: string
    text: string
  }
  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>
  export = pdfParse
}
