# Pocha Menu Check

외국인 여행자가 한국 축제 포장마차의 **메뉴판 사진**(또는 편의점 식품의 **원재료 라벨**)을 찍으면, Google Gemini가 메뉴를 읽고 보통 들어가는 재료(육수·젓갈·소스 같은 숨은 재료 포함)를 추정해, 사용자의 식이 기준(돼지고기, 갑각류, 비건 등)별로 **OK / ASK / AVOID**를 판정하고, 상인에게 그대로 보여줄 **한국어 확인 문장**을 큰 글씨로 띄워주는 모바일 웹. 로그인 없음, 앱에 사진 저장 없음.

> Reference only — not a halal/vegan/allergy certification. Recipes vary by stall.

## 심사 기준별 대응

| 기준 | 대응 |
|---|---|
| **열림** | URL만 열면 바로 사용. 로그인/가입 없음. 첫 화면에 한 줄 설명·기준 선택·촬영 버튼이 스크롤 없이 보임(375×812 기준 612px 안). 와이파이·카메라가 안 될 때는 **Try a sample**로 API 호출 없이 즉시 시연. 영어·일본어·중국어(간체)·아랍어(RTL) UI. |
| **문제 발견** | 번역앱으로 "어묵"을 "fish cake"로 바꿔도 육수의 새우·돼지뼈, 김치의 젓갈, 튀김 기름 공유 같은 **숨은 재료**는 알 수 없음. 말이 안 통하는 상인에게 물어볼 방법도 없음. |
| **AI 활용** | 한 번의 비전 호출로 ① 손글씨/간판 메뉴 읽기 ② 재료 추정(숨은 재료 지식 포함) ③ 기준별 판정 + 확신도 ④ 메뉴별·메뉴판 전체 한국어 질문 문장 생성 ⑤ 사용자 언어로 이유 설명. 구조화 출력(zod 스키마)으로 형식 보장, 실패 시 1회 재시도. 라벨 모드에서는 추정 대신 원재료를 그대로 읽고 함유/같은 제조시설 문구를 분리. |
| **차별성** | 번역앱은 글자만 바꿈. 이 서비스는 재료 추정 → 기준별 판정 → 상인에게 보여줄 문장까지 한 흐름. 보수적 판정(의심되면 ASK, 알레르기는 항상 "Always confirm with the vendor"). 결과를 이미지로 저장·공유. |

## 화면 흐름

1. 기준 칩 선택(1개 이상) → **Take photo**(후면 카메라 바로 실행) 또는 Gallery → 자동 분석
2. 결과: 상단 고정 면책 문구 → 요약("6 items: 2 OK · 2 ASK · 2 AVOID") → 전체 질문 버튼 → 필터 탭(All/OK/ASK/AVOID) → 정렬 토글(위험 먼저/메뉴판 순서) → 카드
3. 카드: 한국어/현지어 이름, 배지(색 + 아이콘 ✓?✕ + 텍스트), 확신도, 이유, 재료 칩(기준에 걸리는 재료는 빨간색 ⚠), Show to vendor
4. Show to vendor: 전체 화면 큰 한국어 문장, 아무 데나 한 번 탭하면 닫힘

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # MOCK_MODE=true: 키 없이 전체 UI 흐름 동작
npm run dev                  # http://localhost:3000
```

실제 Gemini 호출: `.env.local`에서 `MOCK_MODE=false`, `GEMINI_API_KEY=...` 입력 후 dev 서버 재시작. 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급(무료 티어는 분당·일일 호출 제한 있음).

## 환경변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | 실제 호출 시 | 서버(API route)에서만 사용. `NEXT_PUBLIC_` 붙이지 말 것. 없으면 API가 `server_misconfigured`(500)를 반환하고 화면에 "The service isn't set up yet. Try the sample menu instead." 표시 |
| `GEMINI_MODEL` | 아니오 | 기본값 `gemini-3.6-flash` (무료 티어). `gemini-3.8-flash`는 2026-10-27 기준 과부하(503·무응답)가 잦아 제외, 더 빠른 대안은 `gemini-3.5-flash-lite` |
| `MOCK_MODE` | 아니오 | `true`면 샘플 JSON 반환 (Gemini 호출 안 함) |

`.env.local`은 `.gitignore`에 포함됨. 실제 키는 커밋하지 말 것.

## 구조

```
app/page.tsx              첫 화면 · 결과(요약/필터/정렬/카드) · 상인용 모달
app/api/analyze/route.ts  검증 · 요청 제한 · MOCK_MODE · Gemini 호출(55초 예산 안에서 1회 재시도)
lib/schema.ts             요청/응답 zod 스키마, 기준·언어·모드 화이트리스트
lib/prompt.ts             메뉴판/라벨 시스템 프롬프트(숨은 재료 참고표 포함), 언어 파라미터
lib/i18n.ts               UI 문자열 4개 언어 (언어 추가는 여기 + schema.ts LANGS)
lib/image.ts              브라우저 리사이즈/압축 (긴 변 1600px, JPEG 0.8→필요시 낮춤, ≤3MB)
lib/sample.ts             샘플 데모 결과 (MOCK_MODE도 이것을 반환) + public/sample-menu.svg
lib/share.ts              결과를 캔버스 이미지로 그려 공유/다운로드
tests/menu-cases.json     대표 메뉴 30개 × 기준별 기대 판정
tests/eval.mts            프롬프트 자동 채점 스크립트
```

## 안전 설계와 한계

- **단정 금지**: 프롬프트가 "safe/certified/안전합니다/인증" 표현을 금지하고 "usually contains / likely"만 허용. 채점 스크립트가 응답에서 금지어를 따로 셈. UI의 "certification"은 면책 문구의 부정형("not a … certification")에만 사용.
- **보수적 판정**: 의심되면 ASK, 판정은 선택 기준 중 가장 조심스러운 쪽. 갑각류/견과류/달걀 선택 시 모든 카드에 "Always confirm with the vendor" 표시 + Show to vendor 버튼.
- **개인정보**: 이 앱은 사진을 저장하지 않음(요청 메모리에서만 처리). 단, 분석을 위해 Google Gemini API로 전송되며, **Gemini 무료 티어는 보낸 콘텐츠를 Google 제품 개선에 사용할 수 있음**(유료 티어는 사용 안 함). 그래서 화면 문구도 "Photos are not stored by this app; they're sent to Google Gemini for analysis."로 사실대로 표시. 로그에는 에러 종류/상태 코드만 남김(이미지·키·응답 본문 없음). 언어 선택만 브라우저 localStorage에 저장.
- **남용 방지**: IP당 분당 10회(초과 시 429), 서버에서 이미지 크기(≤4MB)·매직바이트로 형식(JPEG/PNG/WebP) 검증, 기준/언어/모드 화이트리스트(zod), `maxDuration = 60`.
- **한계**: 판정은 일반적인 레시피 기준 추정이며 가게마다 다름. 교차오염은 사진으로 알 수 없음. 요청 제한은 서버리스 인스턴스별 메모리 기반(데모용). 샘플 데모의 이유 문장은 영어로만 들어 있음. 라벨 모드는 글자가 흐리면 readable=false.

## 실패 처리

| 상황 | API | 화면 문구(영어 기본) | 다시 시도 |
|---|---|---|---|
| 메뉴판을 못 읽음 / 가격만 있음 / 음식 사진 | 200 `readable:false` | We couldn't read it. Move closer… (+ 이유) | ✓ |
| 스키마 불일치 | 1회 재시도 후 502 `analysis_failed` | Something went wrong… | ✓ |
| Gemini 응답 시간 초과 | 504 `timeout` | This took too long… | ✓ |
| 이미지 과대 / 형식 오류 | 413 `too_large` / 400 `bad_image` | That photo is too large… / We couldn't open… | 다른 사진 |
| 요청 제한 초과 | 429 `rate_limited` | Too many requests… | ✓ |
| 키 누락 / 잘못된 키 | 500 `server_misconfigured` | The service isn't set up yet… | 샘플로 |
| 네트워크 끊김 | — | Network error… | ✓ |

## 테스트

**프롬프트 정확도 (실제 API 호출, 9회 요청):**

```bash
GEMINI_API_KEY=... npm run eval          # 전체 기준
GEMINI_API_KEY=... npm run eval -- pork  # 한 기준만
```

메뉴 30개 이름을 텍스트로 보내 기준별 판정을 채점하고 `tests/eval-results.md`에 표와 실패 목록을 씀. 채점: 기대 AVOID → AVOID만 정답, 기대 ASK → ASK/AVOID 정답(더 조심스러운 건 허용), 그 외 → OK/ASK 정답(AVOID는 오경보).

**정확도 결과**: 아직 미실행 (API 키 필요). 실행 후 아래 표를 `tests/eval-results.md`의 표로 교체.

| Restriction | Pass | Accuracy |
|---|---|---|
| (not run yet) | – | – |

**수동 확인**: `MOCK_MODE=true`로 실행 → 기준 선택 → 아무 사진 업로드 → 결과/필터/정렬/모달/공유 확인. 언어 선택에서 العربية → 화면 전체 RTL 확인.

## Vercel 배포

1. GitHub에 push (이미 연결된 경우 `git push`)
2. [vercel.com/new](https://vercel.com/new) → 저장소 Import (Framework: Next.js 자동 감지)
3. **Environment Variables**: `GEMINI_API_KEY`, `MOCK_MODE=false`, (선택) `GEMINI_MODEL`
4. Deploy. 환경변수를 바꾼 뒤에는 Deployments → 최신 배포 → **Redeploy** 해야 반영됨

## 배포본 점검 체크리스트

- [ ] 배포 URL을 휴대폰(iOS Safari, Android Chrome)에서 열면 로그인 없이 첫 화면이 스크롤 없이 보인다
- [ ] 기준을 고르기 전에는 촬영 버튼이 비활성이고 안내가 보인다
- [ ] **Take photo**가 후면 카메라를 바로 연다, **Gallery**는 앨범을 연다
- [ ] 12MP 원본 사진도 업로드된다(브라우저에서 1600px로 줄어 3MB 이하로 전송) — Network 탭에서 요청 크기 확인
- [ ] 실제 메뉴판 사진 → 60초 안에 결과가 나온다(`maxDuration = 60`)
- [ ] 결과 최상단에 "Reference only — not a halal/vegan/allergy certification…"이 고정돼 있다
- [ ] 갑각류/견과류/달걀 선택 시 모든 카드에 "Always confirm with the vendor"
- [ ] Show to vendor → 큰 한국어 문장, 한 번 탭으로 닫힘
- [ ] 음식만 찍은 사진 → "We couldn't read it…" + Try again
- [ ] `GEMINI_API_KEY`를 빼고 배포 → "The service isn't set up yet…" (Vercel 로그에 `GEMINI_API_KEY is not set`)
- [ ] 1분에 11번 요청 → "Too many requests…"
- [ ] Try a sample → 네트워크 없이도 즉시 결과
- [ ] 언어 4개 전환, 아랍어에서 RTL
- [ ] Vercel Functions 로그에 이미지 데이터나 키가 없다
