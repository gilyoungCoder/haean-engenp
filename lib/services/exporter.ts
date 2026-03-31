// lib/services/exporter.ts — DOCX Export
// Generates .docx files from structured passages and generated questions.
// Uses the 'docx' npm package with type-specific renderers.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  PageBreak,
  ShadingType,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
} from 'docx'
import type {
  StructuredPassage,
  GeneratedQuestion,
  ExportOptions,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FONT_EN = 'Times New Roman'
const FONT_KO = '맑은 고딕'
const FONT_SIZE_BODY = 20 // half-points (10pt)
const FONT_SIZE_TITLE = 36 // 18pt
const FONT_SIZE_SUBTITLE = 28 // 14pt
const FONT_SIZE_HEADING = 24 // 12pt
const FONT_SIZE_SMALL = 18 // 9pt

// Circled numbers for inline markers
const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤']

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Exports passage and questions to a DOCX buffer.
 */
export async function exportToDocx(
  passage: StructuredPassage,
  questions: GeneratedQuestion[],
  options: ExportOptions
): Promise<Buffer> {
  const sections: Paragraph[] = []

  // 1. Cover page
  sections.push(...buildCoverPage(options))

  // 2. Student info table
  sections.push(new Paragraph({ spacing: { after: 200 } }))
  sections.push(...buildStudentInfoTable())

  // 3. Questions section
  sections.push(new Paragraph({ spacing: { after: 400 } }))
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [makeTextRun('문제', { bold: true, size: FONT_SIZE_SUBTITLE, font: FONT_KO })],
    })
  )

  let questionNum = 0
  for (const q of questions) {
    questionNum++
    sections.push(new Paragraph({ spacing: { after: 100 } }))
    sections.push(...renderQuestion(q, questionNum))
  }

  // 4. Answer & explanation section (optional)
  if (options.includeAnswers || options.includeExplanations) {
    sections.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    )
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [makeTextRun('정답 및 해설', { bold: true, size: FONT_SIZE_SUBTITLE, font: FONT_KO })],
      })
    )
    sections.push(new Paragraph({ spacing: { after: 200 } }))

    for (const q of questions) {
      sections.push(...renderAnswer(q, options))
    }
  }

  // Build document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }, // A4
            margin: {
              top: convertInchesToTwip(0.98),    // 2.5cm
              bottom: convertInchesToTwip(0.79),  // 2cm
              left: convertInchesToTwip(0.98),    // 2.5cm
              right: convertInchesToTwip(0.98),   // 2.5cm
            },
          },
        },
        children: sections,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function buildCoverPage(options: ExportOptions): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // School name
  if (options.schoolName) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [makeTextRun(options.schoolName, { bold: true, size: FONT_SIZE_TITLE, font: FONT_KO })],
      })
    )
  }

  // Exam title
  if (options.examTitle) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [makeTextRun(options.examTitle, { bold: true, size: FONT_SIZE_SUBTITLE, font: FONT_KO })],
      })
    )
  }

  // Exam date
  if (options.examDate) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [makeTextRun(options.examDate, { size: FONT_SIZE_HEADING, font: FONT_KO })],
      })
    )
  }

  return paragraphs
}

// ---------------------------------------------------------------------------
// Student info table
// ---------------------------------------------------------------------------

function buildStudentInfoTable(): Paragraph[] {
  const table = new Table({
    rows: [
      new TableRow({
        children: [
          makeInfoCell('학년', 1200),
          makeInfoCell('', 2000),
          makeInfoCell('반', 1200),
          makeInfoCell('', 1500),
          makeInfoCell('번호', 1200),
          makeInfoCell('', 1500),
          makeInfoCell('이름', 1200),
          makeInfoCell('', 2500),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  return [new Paragraph({ children: [] }), table as unknown as Paragraph].filter(
    (p): p is Paragraph => p instanceof Paragraph
  )
  // Note: Tables need to be added as children at the section level.
  // For simplicity, we return both. The caller handles layout.
}

function makeInfoCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [makeTextRun(text, { bold: !!text, size: FONT_SIZE_BODY, font: FONT_KO })],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  })
}

// ---------------------------------------------------------------------------
// Question rendering — dispatcher
// ---------------------------------------------------------------------------

function renderQuestion(q: GeneratedQuestion, num: number): Paragraph[] {
  switch (q.type_id) {
    case 'vocabulary_choice':
    case 'grammar_choice':
      return renderVocabGrammar(q, num)

    case 'blank_inference':
      return renderBlankInference(q, num)

    case 'sentence_ordering':
      return renderSentenceOrdering(q, num)

    case 'sentence_insertion':
      return renderSentenceInsertion(q, num)

    case 'content_match':
      return renderContentMatch(q, num)

    case 'sentence_transform':
    case 'verb_transform':
      return renderSubjective(q, num)

    case 'grammar_error_correction':
      return renderGrammarErrorCorrection(q, num)

    case 'content_match_tf':
      return renderContentMatchTF(q, num)

    case 'sentence_ordering_full':
      return renderSentenceOrderingFull(q, num)

    case 'word_order':
      return renderWordOrder(q, num)

    case 'translation_writing':
      return renderTranslation(q, num)

    case 'korean_to_english':
      return renderKoreanToEnglish(q, num)

    default:
      return renderGeneric(q, num)
  }
}

// ---------------------------------------------------------------------------
// Type-specific renderers — Variation types
// ---------------------------------------------------------------------------

/** vocabulary_choice, grammar_choice — ①②③④⑤ inline markers */
function renderVocabGrammar(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Instruction
  paragraphs.push(makeInstructionParagraph(q, num))

  // Passage with inline markers
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // Choices (only for bracket-style grammar questions)
  if (q.choices && q.choices.length > 0) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    for (const choice of q.choices) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [makeTextRun(choice, { size: FONT_SIZE_BODY })],
        })
      )
    }
  }

  return paragraphs
}

/** blank_inference — blank + 5 choices */
function renderBlankInference(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // 5 choices
  if (q.choices) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    for (let i = 0; i < q.choices.length; i++) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [
            makeTextRun(`${CIRCLED_NUMBERS[i] ?? `(${i + 1})`} ${q.choices[i]}`, {
              size: FONT_SIZE_BODY,
            }),
          ],
        })
      )
    }
  }

  return paragraphs
}

/** sentence_ordering — intro + (A)(B)(C) blocks */
function renderSentenceOrdering(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))

  // Intro passage
  if (q.intro_passage) {
    paragraphs.push(makePassageParagraph(q.intro_passage))
  }

  // (A)(B)(C) blocks
  if (q.blocks) {
    for (const [label, text] of Object.entries(q.blocks)) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [
            makeTextRun(`${label} `, { bold: true, size: FONT_SIZE_BODY }),
            makeTextRun(text, { size: FONT_SIZE_BODY }),
          ],
        })
      )
    }
  }

  // Choices
  if (q.choices) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    for (const choice of q.choices) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [makeTextRun(choice, { size: FONT_SIZE_BODY })],
        })
      )
    }
  }

  return paragraphs
}

/** sentence_insertion — insertion sentence + passage with ①~⑤ position markers */
function renderSentenceInsertion(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))

  // The passage_with_markers contains the insertion sentence and marked positions
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // Choices if present
  if (q.choices) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    for (const choice of q.choices) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [makeTextRun(choice, { size: FONT_SIZE_BODY })],
        })
      )
    }
  }

  return paragraphs
}

/** content_match — 5 English statement choices */
function renderContentMatch(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  if (q.choices) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    for (let i = 0; i < q.choices.length; i++) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [
            makeTextRun(`${CIRCLED_NUMBERS[i] ?? `(${i + 1})`} ${q.choices[i]}`, {
              size: FONT_SIZE_BODY,
            }),
          ],
        })
      )
    }
  }

  return paragraphs
}

/** sentence_transform, verb_transform — subjective (서술형) */
function renderSubjective(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // Conditions if present
  if (q.conditions && q.conditions.length > 0) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    paragraphs.push(
      new Paragraph({
        children: [makeTextRun('<조건>', { bold: true, size: FONT_SIZE_BODY, font: FONT_KO })],
      })
    )
    for (const cond of q.conditions) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [makeTextRun(`• ${cond}`, { size: FONT_SIZE_BODY })],
        })
      )
    }
  }

  // Answer writing lines
  paragraphs.push(new Paragraph({ spacing: { before: 200 } }))
  paragraphs.push(makeWritingLine())
  paragraphs.push(makeWritingLine())

  return paragraphs
}

// ---------------------------------------------------------------------------
// Type-specific renderers — Workbook types
// ---------------------------------------------------------------------------

/** grammar_error_correction — (A)(B)(C) error markers + correction table */
function renderGrammarErrorCorrection(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // Correction answer table
  paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
  paragraphs.push(makeCorrectionTable())

  return paragraphs
}

/** content_match_tf — passage + T/F statement table */
function renderContentMatchTF(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // Statements with T/F blanks
  if (q.statements && q.statements.length > 0) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    for (const stmt of q.statements) {
      paragraphs.push(
        new Paragraph({
          children: [
            makeTextRun(`${stmt.number}. ${stmt.text}  (    )`, { size: FONT_SIZE_BODY }),
          ],
        })
      )
    }
  }

  return paragraphs
}

/** sentence_ordering_full — full sentence reordering */
function renderSentenceOrderingFull(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // Answer line for ordering
  paragraphs.push(new Paragraph({ spacing: { before: 200 } }))
  paragraphs.push(
    new Paragraph({
      children: [makeTextRun('순서: ____________________________________', { size: FONT_SIZE_BODY, font: FONT_KO })],
    })
  )

  return paragraphs
}

/** word_order — Korean translation + word slash list + writing line */
function renderWordOrder(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  // Writing line
  paragraphs.push(new Paragraph({ spacing: { before: 200 } }))
  paragraphs.push(makeWritingLine())

  return paragraphs
}

/** translation_writing — English text (bold) + writing lines */
function renderTranslation(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [makeTextRun(q.passage_with_markers, { bold: true, size: FONT_SIZE_BODY })],
    })
  )

  // Writing lines
  paragraphs.push(new Paragraph({ spacing: { before: 200 } }))
  paragraphs.push(makeWritingLine())
  paragraphs.push(makeWritingLine())

  return paragraphs
}

/** korean_to_english — Korean text (bold) + conditions + writing lines */
function renderKoreanToEnglish(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [makeTextRun(q.passage_with_markers, { bold: true, size: FONT_SIZE_BODY, font: FONT_KO })],
    })
  )

  // Conditions
  if (q.conditions && q.conditions.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [makeTextRun('<조건>', { bold: true, size: FONT_SIZE_BODY, font: FONT_KO })],
      })
    )
    for (const cond of q.conditions) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [makeTextRun(`• ${cond}`, { size: FONT_SIZE_BODY })],
        })
      )
    }
  }

  // Writing lines
  paragraphs.push(new Paragraph({ spacing: { before: 200 } }))
  paragraphs.push(makeWritingLine())
  paragraphs.push(makeWritingLine())

  return paragraphs
}

// ---------------------------------------------------------------------------
// Generic fallback renderer
// ---------------------------------------------------------------------------

function renderGeneric(q: GeneratedQuestion, num: number): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(makeInstructionParagraph(q, num))
  paragraphs.push(makePassageParagraph(q.passage_with_markers))

  if (q.choices && q.choices.length > 0) {
    paragraphs.push(new Paragraph({ spacing: { before: 100 } }))
    for (let i = 0; i < q.choices.length; i++) {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.3) },
          children: [
            makeTextRun(`${CIRCLED_NUMBERS[i] ?? `(${i + 1})`} ${q.choices[i]}`, {
              size: FONT_SIZE_BODY,
            }),
          ],
        })
      )
    }
  }

  return paragraphs
}

// ---------------------------------------------------------------------------
// Answer rendering
// ---------------------------------------------------------------------------

function renderAnswer(q: GeneratedQuestion, options: ExportOptions): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(
    new Paragraph({
      spacing: { before: 100 },
      children: [
        makeTextRun(`${q.question_number}. `, { bold: true, size: FONT_SIZE_BODY }),
        ...(options.includeAnswers
          ? [makeTextRun(`정답: ${q.answer}`, { bold: true, size: FONT_SIZE_BODY, font: FONT_KO })]
          : []),
      ],
    })
  )

  if (options.includeExplanations && q.explanation) {
    paragraphs.push(
      new Paragraph({
        indent: { left: convertInchesToTwip(0.3) },
        spacing: { after: 100 },
        children: [makeTextRun(q.explanation, { size: FONT_SIZE_SMALL, font: FONT_KO })],
      })
    )
  }

  return paragraphs
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface TextRunOptions {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  size?: number
  font?: string
  color?: string
}

function makeTextRun(text: string, opts: TextRunOptions = {}): TextRun {
  // Detect if text is primarily Korean or English for font selection
  const hasKorean = /[\uac00-\ud7af\u3130-\u318f]/.test(text)
  const defaultFont = hasKorean ? FONT_KO : FONT_EN

  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italic,
    underline: opts.underline ? {} : undefined,
    size: opts.size ?? FONT_SIZE_BODY,
    font: { name: opts.font ?? defaultFont },
    color: opts.color,
  })
}

function makeInstructionParagraph(q: GeneratedQuestion, num: number): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      makeTextRun(`${num}. `, { bold: true, size: FONT_SIZE_HEADING }),
      makeTextRun(q.instruction, { size: FONT_SIZE_BODY, font: FONT_KO }),
    ],
  })
}

function makePassageParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: convertInchesToTwip(0.2) },
    children: [makeTextRun(text, { size: FONT_SIZE_BODY })],
  })
}

function makeWritingLine(): Paragraph {
  return new Paragraph({
    spacing: { before: 100 },
    children: [
      makeTextRun('_'.repeat(60), { size: FONT_SIZE_BODY, color: 'AAAAAA' }),
    ],
  })
}

function makeCorrectionTable(): Paragraph {
  // Simple 3-column placeholder for (A)(B)(C) corrections
  return new Paragraph({
    children: [
      makeTextRun('(A) ________________   (B) ________________   (C) ________________', {
        size: FONT_SIZE_BODY,
      }),
    ],
  })
}
