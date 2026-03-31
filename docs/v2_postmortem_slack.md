# 🔧 engenp-v2 기술 포스트모템 — v3 재구축 결정 배경

> **작성일**: 2026-03-31
> **작성자**: Younghwan
> **대상**: 해안 개발팀 Slack DM

---

## TL;DR

v2 웹앱을 Vercel Serverless + Claude API 기반으로 구축 완료했으나, **Vercel 60초 타임아웃**이라는 근본적 제약에 부딪혀 핵심 기능(문제 검증 루프)을 비활성화한 상태로 운영 중. 이 외에도 12개 이상의 기술적 이슈를 해결했지만, 아키텍처 레벨의 한계가 남아있어 **v3 재구축을 결정**했습니다.

---

## 1️⃣ 핵심 문제: Vercel 60초 타임아웃

**우리 파이프라인 실제 소요 시간**:
```
[1단계] 지문 구조화 (Claude Vision)    → 15~25초
[2단계] 문제 생성 (Claude Text)         → 20~40초
[3단계] 7-check 검증 (Claude Text)     → 15~20초 × N문항
[4단계] 자기교정 루프 (최대 2라운드)     → 15~20초 × 2
───────────────────────────────────────
합계:  65~125초  ← Vercel Hobby 60초 초과
```

**v2에서 취한 조치**:
- 구조화/생성을 2개 API로 **분리** (각각 60초)
- **검증 루프 완전 비활성화** (Step 3~4 스킵)
- Opus 모델 포기 → Sonnet으로 고정 (Opus는 구조화만 57초)

**결과**: 문제는 생성되지만 **검증 없이 출력**됨. REBUILD_PLAN에서 설계한 7-check validation + 자기교정 루프가 프로덕션에서 전혀 작동하지 않음.

**v3 해결 방향**: Vercel Pro ($20/월, 300초) 또는 자체 서버(Railway/Fly.io)로 전환하여 전체 파이프라인을 단일 요청으로 실행.

---

## 2️⃣ Claude JSON 응답 파싱 실패 (3회 연속 장애)

**현상**: 문제 생성 시 `SyntaxError: Unexpected token` 반복 발생

**원인 1 — 코드펜스 래핑**:
```
Claude 응답: ```json { "paragraphs": [...] } ```
extractJSON(): 정규식이 코드펜스를 못 벗김 → JSON.parse 실패
```

**원인 2 — max_tokens 잘림**:
```
Claude 응답 (4096 토큰에서 잘림): {"paragraphs": [{"sentences": [{"text": "Flow matching and...
→ 닫는 }]}] 없음 → JSON.parse 실패
```

**원인 3 — 이스케이프 안 된 특수문자**:
```
Claude 응답: {..., "explanation": "①번에서 'many recent work'는 단수..."}
→ 작은따옴표 ' 가 JSON 내부에서 문제 (position 2805)
```

**v2에서 취한 조치**:
- extractJSON을 3단계 파서로 강화 (코드펜스 → 브레이스 매칭 → 잘린 JSON 자동 복구)
- max_tokens를 4096 → 16384로 증가
- sanitizeJSON으로 trailing comma 제거

**v3 반영**: 이 파서를 처음부터 내장. 프롬프트에 "JSON만 출력, 코드펜스 금지" 강제 지시 추가.

---

## 3️⃣ NextAuth.js Edge Middleware 충돌

**현상**: 모든 API 요청에서 `Invalid character in header content ["authorization"]` 에러

**원인**: NextAuth.js v5의 middleware가 Edge Runtime에서 실행되면서, 세션 쿠키에 포함된 특수문자를 파싱하다 HTTP 헤더 규격 위반 발생. 특히 `NEXTAUTH_URL=http://localhost:3000`이 프로덕션에 설정되어 쿠키 도메인 불일치 → 깨진 쿠키 → 헤더 에러.

**v2에서 취한 조치**:
- auth.ts를 auth.config.ts(Edge용) + auth.ts(Node용)로 분리
- 결국 **middleware.ts 완전 비활성화** (빈 matcher)
- 각 API route에서 `requireAuth()` 직접 호출로 대체

**v3 반영**: middleware는 처음부터 사용하지 않음. 대시보드 보호는 `useSession()` 클라이언트 리다이렉트로.

---

## 4️⃣ Vercel 환경변수 trailing newline

**현상**: Google OAuth `invalid_client` 에러 (클라이언트 찾을 수 없음)

**원인**: `echo "값" | npx vercel env add` 명령어에서 `echo`가 trailing newline(`\n`)을 추가. 결과:
```
GOOGLE_CLIENT_ID=399442068776-d8rq...apps.googleusercontent.com\n
→ Google에 전달: client_id=399442068776-d8rq...com%0A
→ Google: "이 클라이언트 없음"
```

**v2에서 취한 조치**: 모든 환경변수를 `printf` (newline 없음)로 재설정
```bash
# ❌ echo
echo "값" | npx vercel env add KEY production
# ✅ printf
printf "값" | npx vercel env add KEY production
```

**v3 반영**: 배포 문서에 `printf` 사용 필수 명시. 자동 설정 스크립트 제공.

---

## 5️⃣ SSE 스트리밍 — WritableStream 이중 close

**현상**: Vercel 로그에 `TypeError: Invalid state: WritableStream is closed` 반복

**원인**: `generate-stream` API에서 `TransformStream` 사용 시, 에러 발생 후 `finally` 블록에서 `writer.close()` 호출 → 이미 닫힌 스트림에 재호출. Vercel Serverless가 함수 종료 후에도 background에서 실행 중이던 코드가 close 시도.

**v2에서 취한 조치**: `TransformStream` → `ReadableStream` with `start()` controller로 전환. `controller.close()`를 try/catch로 보호.

**v3 반영**: SSE는 처음부터 `ReadableStream` 패턴 사용. `generate-stream`은 사용하지 않고, 프론트에서 2단계 분리 호출.

---

## 6️⃣ R2 iframe 차단 + CSP 충돌

**현상**: "이 콘텐츠는 차단되어 있습니다" — 업로드된 PDF/이미지가 뷰어에 안 보임

**원인 1**: Cloudflare R2의 `r2.dev` 도메인이 **자체적으로 iframe embed를 차단** (X-Frame-Options: DENY)
**원인 2**: next.config.js의 CSP가 `object-src 'none'` + `connect-src`에 blob: 미포함

**v2에서 취한 조치**:
- 파일 뷰어에서 R2 URL 대신 **base64 data URI**로 직접 표시
- CSP를 API 라우트에 적용하지 않도록 source 패턴 변경

**v3 반영**: 업로드 시 base64를 클라이언트에 보관하는 패턴 유지. R2는 백업/다운로드용으로만 사용.

---

## 7️⃣ Tailwind CSS v4 + Node 22 호환성 붕괴

**현상**: `TypeError: generate is not a function` — 로컬 빌드 불가

**원인**: Node.js 22.20.0에서 `@tailwindcss/postcss` v4.x의 내부 함수 호환성 문제. 같은 코드가 Node 20에서는 정상 빌드.

**v2에서 취한 조치**: Vercel Node 버전을 24.x → **20.x로 고정**. 로컬 빌드는 포기하고 Vercel에서만 빌드.

**v3 반영**: `package.json`에 `"engines": {"node": ">=20 <22"}` 명시. 로컬 개발 시 Node 20 사용 필수.

---

## 8️⃣ 문제 카드 렌더링 이슈

**현상**:
- 밑줄 마킹이 안 됨 (①revolutionized → 밑줄 없이 텍스트만)
- 선택지 번호 중복 (① ① Flow matching...)

**원인**: `passage_with_markers`를 plain text로 렌더링. ①②③④⑤ 마커를 파싱하여 밑줄/볼드 처리하는 로직 부재.

**v2에서 취한 조치**: `renderPassageWithMarkers()` 함수 추가 — 마커 감지 → 다음 단어 `<u>` 태그 래핑. 선택지가 이미 마커 포함 시 중복 방지.

**v3 반영**: 마커 렌더링을 처음부터 설계에 포함.

---

## 📊 영향도 요약

| 문제 | 심각도 | 사용자 영향 | v3 해결 |
|------|--------|------------|---------|
| 60초 타임아웃 | 🔴 치명 | 검증 없는 문제 출력 | 서버 타임아웃 확장 |
| JSON 파싱 실패 | 🔴 치명 | 문제 생성 불가 | 3단계 파서 내장 |
| Middleware 충돌 | 🟡 높음 | 업로드/채팅 불가 | middleware 미사용 |
| 환경변수 newline | 🟡 높음 | Google 로그인 불가 | printf 자동화 |
| SSE 이중 close | 🟠 중간 | 간헐적 에러 | ReadableStream 패턴 |
| R2 iframe 차단 | 🟠 중간 | 파일 미리보기 불가 | base64 직접 표시 |
| Node 22 호환성 | 🟡 높음 | 로컬 빌드 불가 | Node 20 고정 |
| 마커 렌더링 | 🟢 낮음 | 문제 가독성 저하 | 렌더러 내장 |

---

## 🎯 v3 재구축 결정 이유

1. **검증 루프가 작동하지 않는 상태로 서비스하는 것은 품질 보증 불가**
2. 12개 hotfix의 누적으로 코드 복잡도 증가 (middleware disabled, JSON 파서 3중 감싸기 등)
3. 프롬프트 시스템 재설계 필요 (밑줄 마킹, 번호 형식, 난이도 예시 등)
4. v2의 모든 교훈을 반영한 **깨끗한 아키텍처**로 재시작하는 것이 유지보수 비용 절감

**v3 목표**: 같은 기능을 **더 안정적으로, 검증 루프 포함하여** 제공. REBUILD_PLAN_V3.md (3,200줄) 기반.

---

*질문이나 논의 필요한 부분 있으면 언제든 DM 주세요.*
