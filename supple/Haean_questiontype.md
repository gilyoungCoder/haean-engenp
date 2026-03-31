# Haean 문제 유형 체계 정리

> 작성일: 2026-03-30
> 출처: HaeanLab_Guidebook_Workbook.md / HaeanLab_Guidebook_Variation Problem set.md / GitHub repo (EngGeneartor/engen-v2)

---

## 1. 유형 체계 개요

Haean은 **두 가지 출력물**을 생성한다.

| 출력물 | 지침서 | 유형 수 | 용도 |
|--------|--------|---------|------|
| **변형문제** | HaeanLab_Guidebook_Variation Problem set.md | 6가지 | 내신 시험 대비 객관식+서술형 문제지 |
| **워크북** | HaeanLab_Guidebook_Workbook.md | 10가지 | 교과서 본문 학습용 전수 문제집 |

---

## 2. 변형문제 6유형 ↔ JSON 대응

| # | 변형문제 유형 | JSON 파일 | 상태 |
|---|---|---|---|
| 1 | 어법 (Grammar) | `grammar_choice.json` | ✅ |
| 2 | 어휘 (Vocabulary) | `vocabulary_choice.json` | ✅ |
| 3 | 대의파악 (Main Idea) — 주제/요지/제목 | `topic_summary.json` | ✅ |
| 4-a | 문장삽입 (Flow) | `sentence_insertion.json` | ✅ |
| 4-b | 글의 순서 (Flow) | `sentence_ordering.json` | ✅ |
| 5-a | 서술형 — 동사 변환 | `verb_transform.json` | ✅ |
| 5-b | 서술형 — 문장 변환 | `sentence_transform.json` | ✅ |
| 6 | 내용 일치/불일치 (Inference) | `content_match.json` | ✅ |

> **특이사항**: 변형문제 유형 4번(Flow)과 5번(서술형)은 각각 2개 JSON으로 분리되어 있음.
> **→ 변형문제 6유형은 현재 repo에서 모두 커버됨.**

---

## 3. 워크북 10유형 ↔ JSON 대응

| # | 워크북 유형 | JSON 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 01 | 어휘 선택 | `vocabulary_choice.json` | ✅ 공유 | 변형문제와 동일 JSON |
| 02 | 어법 선택 | `grammar_choice.json` | ✅ 공유 | 변형문제와 동일 JSON |
| 03 | 동사 변형 | `verb_transform.json` | ✅ | |
| 04 | 어법 오류 수정 | `grammar_error_correction.json` | ✅ 신규 생성 | |
| 05 | 내용일치 TF | `content_match_tf.json` | ✅ 신규 생성 | content_match(5지선다)와 별도 |
| 06 | 순서배열 (전수) | `sentence_ordering_full.json` | ✅ 신규 생성 | sentence_ordering((A)(B)(C))과 별도 |
| 07 | 문장삽입 | `sentence_insertion.json` | ✅ 공유 | 변형문제와 동일 JSON |
| 08 | 단어배열 | `word_order.json` | ✅ 신규 생성 | |
| 09 | 해석 쓰기 | `translation_writing.json` | ✅ 신규 생성 | |
| 10 | 영작 | `korean_to_english.json` | ✅ 신규 생성 | |

---

## 4. 전체 JSON 목록 (기존 10개 + 신규 6개 = 총 16개)

### 기존 JSON (repo에 있던 것)

| 파일명 | 유형 | 분류 |
|---|---|---|
| `vocabulary_choice.json` | 어휘 선택 | 변형문제 + 워크북 공유 |
| `grammar_choice.json` | 어법 선택 | 변형문제 + 워크북 공유 |
| `topic_summary.json` | 주제/요지/제목 | 변형문제 전용 |
| `sentence_insertion.json` | 문장 삽입 | 변형문제 + 워크북 공유 |
| `sentence_ordering.json` | (A)(B)(C) 단락 순서 배열 | 변형문제 전용 |
| `content_match.json` | 내용 일치/불일치 (5지선다) | 변형문제 전용 |
| `verb_transform.json` | 동사 변형 | 변형문제 + 워크북 공유 |
| `sentence_transform.json` | 문장 변환 (서술형) | 변형문제 전용 |
| `blank_inference.json` | 빈칸 추론 | 수능 유형 추가 (지침서 외) |
| `eng_to_eng.json` | 영영풀이 | 추가 유형 (지침서 외) |

### 신규 생성 JSON (이 폴더)

| 파일명 | 유형 | 분류 |
|---|---|---|
| `grammar_error_correction.json` | 어법 오류 수정 | 워크북 04 전용 |
| `content_match_tf.json` | 내용일치 TF | 워크북 05 전용 |
| `sentence_ordering_full.json` | 순서배열 (문장 전수) | 워크북 06 전용 |
| `word_order.json` | 단어배열 | 워크북 08 전용 |
| `translation_writing.json` | 해석 쓰기 | 워크북 09 전용 |
| `korean_to_english.json` | 영작 | 워크북 10 전용 |

---

## 5. 유형 분류 다이어그램

```
Haean 문제 유형 (총 16개 JSON)
│
├── 변형문제 전용 (4개)
│   ├── topic_summary.json         주제/요지/제목
│   ├── sentence_ordering.json     (A)(B)(C) 단락 순서
│   ├── content_match.json         내용 일치/불일치 (5지선다)
│   └── sentence_transform.json   문장 변환 서술형
│
├── 변형문제 + 워크북 공유 (4개)
│   ├── vocabulary_choice.json     어휘 선택
│   ├── grammar_choice.json        어법 선택
│   ├── sentence_insertion.json    문장 삽입
│   └── verb_transform.json        동사 변형
│
├── 워크북 전용 (6개) ← 신규 생성
│   ├── grammar_error_correction.json   어법 오류 수정
│   ├── content_match_tf.json           내용일치 TF
│   ├── sentence_ordering_full.json     순서배열 (전수)
│   ├── word_order.json                 단어배열
│   ├── translation_writing.json        해석 쓰기
│   └── korean_to_english.json          영작
│
└── 지침서 외 추가 유형 (2개)
    ├── blank_inference.json       빈칸 추론 (수능 유형)
    └── eng_to_eng.json            영영풀이
```

---

## 6. content_match vs content_match_tf 차이

| 항목 | `content_match.json` | `content_match_tf.json` |
|---|---|---|
| 형식 | 5지선다 (①~⑤ 중 1개 선택) | T / F 이진 판단 |
| 진술문 수 | 5개 (선지) | 6~8개 이상 (전수 가능) |
| 용도 | 변형문제 (시험 출제용) | 워크북 (학습용) |
| 난이도 | 중~고 | 하~중 |

---

## 7. sentence_ordering vs sentence_ordering_full 차이

| 항목 | `sentence_ordering.json` | `sentence_ordering_full.json` |
|---|---|---|
| 형식 | (A)(B)(C) 단락 블록 배열 | 문장 단위 순서 배열 |
| 도입부 | 있음 (intro_passage) | 없음 |
| 선지 | ①~⑤ 5지선다 | 정답 순서 직접 기술 |
| 용도 | 변형문제 (수능형) | 워크북 (전수 학습용) |

---

> 신규 JSON 파일 위치: `해안/question_types_missing/`
> repo 반영 시: `data/question_types/` 폴더에 복사
