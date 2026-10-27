# 🍢 Pocha Menu Check

**한국 지역 축제 포장마차에서 외국인 여행자가 "이거 먹어도 되나?"를 바로 확인하는 모바일 웹**

### 👉 [pocha-menu.vercel.app](https://pocha-menu.vercel.app) — 로그인 없이 휴대폰으로 바로 열기

메뉴판 사진을 찍으면 AI(Google Gemini)가 메뉴를 읽고, 육수·젓갈·양념·튀김 기름 같은 **숨은 재료**까지 추정해 내 식이 기준(할랄, 채식, 알레르기 등)에 맞춰 메뉴마다 **OK / ASK / AVOID**를 알려줍니다. 애매한 메뉴는 상인에게 보여줄 **한국어 질문**을 큰 글씨로 띄우고, 상인이 화면의 버튼으로 답하면 그 답을 **내 언어로** 보여줍니다.

> ⚠️ Reference only — not a halal/vegan/allergy certification. Recipes vary by stall.

---

## 왜 필요한가

- 번역앱은 "어묵"을 "fish cake"로 바꿔줄 뿐, **국물에 새우나 돼지뼈가 들어가는지**, 김치에 **젓갈**이 있는지, 튀김을 **새우튀김과 같은 기름**에 튀기는지는 알려주지 않습니다.
- 축제 현장의 상인은 대부분 영어를 쓰지 않아서, 물어보고 싶어도 질문도 답도 통하지 않습니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 📷 **메뉴판 사진 분석** | 후면 카메라 바로 실행 → 메뉴를 읽고 숨은 재료까지 추정 → 기준별 OK / ASK / AVOID + 확신도 + 이유 |
| 🗣️ **상인에게 묻기** | 인사말 + 내 제한(한국어 고정 문장) + 질문을 전체 화면 큰 글씨로. 상인이 **"네, 들어가요 / 아니요 / 잘 모르겠어요"** 버튼을 누르면 내 언어로 결과와 조언 표시 |
| 🪪 **한국어 식사 카드** | 사진·AI·네트워크 없이 바로 쓰는 카드("할랄 음식만 먹어요. 돼지고기와 술(맛술 포함)은 안 돼요." 등) |
| 🥗 **13가지 기준** | Diet: 할랄, 채식, 비건, 돼지고기, 소고기 · Allergies: 갑각류, 생선, 달걀, 유제품, 밀, 땅콩·견과류, 대두, 참깨 |
| 🌏 **4개 언어** | English · 日本語 · 简体中文 · العربية(RTL). 재료는 "egg (달걀)"처럼 내 언어 + 한국어 |
| 🏷️ **식품 라벨 모드** | 편의점 식품 뒷면 원재료를 그대로 읽고 "…함유" / "같은 제조시설" 문구를 따로 표시 |
| ✨ **샘플 데모** | API 호출 없이 즉시 결과를 보여주는 시연용 안전망 |
| 🔎 **결과 정리** | 요약("6 items: 2 OK · 2 ASK · 2 AVOID"), 필터 탭, 위험 순/메뉴판 순 정렬, 이미지로 저장·공유 |
| 💾 **기준 기억** | 고른 기준·언어를 휴대폰에 저장해 다음 가게에서 바로 촬영 |

## 사용 방법 (여행자)

1. [pocha-menu.vercel.app](https://pocha-menu.vercel.app) 열기 → 언어 선택
2. 피해야 할 것 선택 (예: Halal + Shellfish)
3. **Take photo**로 메뉴판 촬영 (음식 말고 메뉴판)
4. 결과에서 ASK / AVOID 메뉴는 **Show to vendor** → 상인에게 화면을 보여주고 답 버튼을 눌러 달라고 하기
5. 사진이 안 되거나 급할 땐 **🪪 My diet card in Korean**

## 심사 기준별 대응

| 기준 | 대응 |
|---|---|
| **열림** | URL만 열면 바로 사용, 로그인/가입 없음. 첫 화면에 설명·기준·촬영 버튼이 스크롤 없이 보임(375×812 기준). 네트워크·AI가 안 될 때도 샘플 데모와 식사 카드로 사용 가능. 4개 언어 + RTL |
| **문제 발견** | 번역으로는 알 수 없는 숨은 재료(육수, 젓갈, 맛술, 돼지기름, 공유 기름)와, 상인과의 질문·답이 통하지 않는 순간을 해결 |
| **AI 활용** | 한 번의 비전 호출로 ① 간판·손글씨 메뉴 읽기 ② 숨은 재료 추정 ③ 기준별 판정 + 확신도 ④ 메뉴별·메뉴판 전체 한국어 질문 생성 ⑤ 사용자 언어로 이유·질문 번역. JSON 스키마 구조화 출력 + zod 검증, 실패 시 가벼운 모델로 재시도 |
| **차별성** | 번역 → 재료 추정 → 판정 → 상인 질문 → **상인 답을 다시 내 언어로**까지 한 흐름. 보수적 판정(의심되면 ASK), 인증·"안전" 표현 금지 |

## 기술 스택

Next.js (App Router) · TypeScript · Tailwind CSS · `@google/genai` (Gemini) · zod · Vercel

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # MOCK_MODE=true: 키 없이 전체 UI 흐름 동작
npm run dev                  # http://localhost:3000
```

실제 AI 호출: `.env.local`에서 `MOCK_MODE=false`, `GEMINI_API_KEY=...` 입력 후 재시작. 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료 발급(무료 티어는 호출 횟수 제한 있음).

## 환경변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | 실제 호출 시 | 서버(API route)에서만 사용. `NEXT_PUBLIC_` 붙이지 말 것. 없으면 `server_misconfigured`(500) |
| `GEMINI_MODEL` | 아니오 | 기본값 `gemini-3.6-flash`. (`gemini-3.8-flash`는 2026-10-27 기준 무료 티어 과부하가 잦아 제외) |
| `GEMINI_FALLBACK_MODEL` | 아니오 | 기본값 `gemini-3.5-flash-lite`. 첫 시도 실패(과부하 503 등) 시 재시도에 사용 |
| `MOCK_MODE` | 아니오 | `true`면 샘플 JSON 반환 (AI 호출 안 함) |

`.env.local`은 `.gitignore`에 포함. 실제 키는 커밋하지 말 것.

## 구조

```
app/page.tsx              첫 화면 · 결과(요약/필터/정렬/카드) · 상인용 화면(답 버튼) · 식사 카드
app/api/analyze/route.ts  검증 · 요청 제한 · MOCK_MODE · Gemini 호출(55초 예산, 실패 시 fallback 모델로 재시도)
lib/gemini.ts             Gemini 구조화 출력 호출
lib/schema.ts             요청/응답 zod 스키마, 기준·언어·모드 화이트리스트
lib/prompt.ts             메뉴판/라벨 시스템 프롬프트(숨은 재료·할랄 규칙), 언어별 예시
lib/i18n.ts               UI 문자열 4개 언어 + 상인용 한국어 고정 문장(VENDOR_KO)
lib/image.ts              브라우저 리사이즈/압축 (긴 변 1600px, JPEG 0.8→필요시 낮춤, ≤3MB)
lib/sample.ts             샘플 데모 결과 (MOCK_MODE도 이것을 반환) + public/sample-menu.svg
lib/share.ts              결과를 캔버스 이미지로 그려 공유/다운로드
tests/menu-cases.json     대표 메뉴 30개 × 기준별 기대 판정
tests/eval.mts            프롬프트 자동 채점 스크립트
tests/ask.test.mts        상인 질문 템플릿·조사 검사 (node tests/ask.test.mts)
lib/ask.ts                상인 질문을 고정 틀로 생성("…들어가나요?" → 네 = 들어감 보장)
```

## 안전 설계와 한계

- **단정 금지**: 프롬프트가 "safe / certified / 안전합니다 / 인증" 표현을 금지하고 "usually contains / likely"만 허용. UI의 "certification"은 면책 문구의 부정형에만 사용.
- **보수적 판정**: 의심되면 ASK, 여러 기준 중 가장 조심스러운 쪽으로 판정. 할랄은 맛술·돼지기름·젤라틴까지 보고, 도축 여부를 알 수 없는 고기는 최소 ASK. 알레르기 기준을 고르면 모든 카드에 "Always confirm with the vendor".
- **개인정보**: 앱은 사진을 저장하지 않음(요청 메모리에서만 처리). 단, 분석을 위해 Google Gemini로 전송되며 **무료 티어는 보낸 콘텐츠를 Google 제품 개선에 쓸 수 있음** — 화면에도 그대로 안내. 로그에는 에러 종류·상태 코드·모델명만 남김. 브라우저에는 언어·모드·기준만 저장.
- **남용 방지**: IP당 분당 10회, 이미지 크기(≤4MB)·매직바이트 형식 검증, 기준/언어/모드 화이트리스트, `maxDuration = 60`.
- **한계**: 판정은 일반적인 레시피 기준 추정이며 가게마다 다름. 교차오염은 사진으로 알 수 없음. 요청 제한은 서버리스 인스턴스별 메모리 기반. 무료 티어 특성상 응답 시간이 가끔 크게 늘어남(보통 6~8초). 샘플 데모 문장은 영어로만 들어 있음.

## 실패 처리

| 상황 | API | 화면 안내 | 다시 시도 |
|---|---|---|---|
| 메뉴판을 못 읽음 / 가격만 있음 / 음식 사진 | 200 `readable:false` | We couldn't read it… (+ 이유) | ✓ |
| 스키마 불일치 | 재시도 후 502 `analysis_failed` | Something went wrong… | ✓ |
| Gemini 과부하 | 재시도 후 503 `busy` | The AI is busy… or show your diet card | ✓ |
| 응답 시간 초과 | 504 `timeout` | This took too long… | ✓ |
| 이미지 과대 / 형식 오류 | 413 `too_large` / 400 `bad_image` | That photo is too large… / We couldn't open… | 다른 사진 |
| 요청 제한 초과 | 429 `rate_limited` | Too many requests… | ✓ |
| 키 누락 / 잘못된 키 | 500 `server_misconfigured` | The service isn't set up yet… | 샘플로 |
| 네트워크 끊김 | — | Network error… | ✓ |

## 테스트

**배포본 실제 호출 확인 (2026-10-27)** — 샘플 메뉴판 이미지, 할랄 + 갑각류 알레르기

| 언어 | 결과 | 시간 |
|---|---|---|
| English | 순대·새우튀김 AVOID / 어묵·떡볶이 ASK / 호떡·고구마 OK, 맛술을 할랄 위험으로 탐지 | 6~8초 (한 번은 51초) |
| 日本語 | 같은 판정, 이름·재료·질문 일본어 ("豚の腸 (돼지 창자)") | 7.6초 |
| العربية | 같은 판정, 이름·재료·질문 아랍어 | 7.1초 |

**프롬프트 정확도 채점** (실제 API 호출, 기준당 1회):

```bash
GEMINI_API_KEY=... npm run eval          # 기존 9개 기준
GEMINI_API_KEY=... npm run eval -- pork  # 한 기준만
```

메뉴 30개를 텍스트로 보내 기준별 판정을 채점하고 `tests/eval-results.md`에 표와 실패 목록을 씀. 기대 AVOID → AVOID만 정답, 기대 ASK → ASK/AVOID 정답, 그 외 → OK/ASK 정답. 정확도 표는 아직 미실행이며, 할랄·채식·대두·참깨는 기대값이 아직 없음.

**수동 확인**: `MOCK_MODE=true`로 실행 → 기준 선택 → 아무 사진 업로드 → 결과/필터/정렬/상인 화면 답 버튼/식사 카드/공유 확인. 언어를 العربية로 바꿔 RTL 확인.

## Vercel 배포

1. [vercel.com/new](https://vercel.com/new) → 이 저장소 Import (Next.js 자동 감지)
2. **Environment Variables**: `GEMINI_API_KEY`, `MOCK_MODE=false`
3. Deploy. 이후 `master`에 push하면 자동 배포. 환경변수를 바꾸면 **Redeploy** 필요

## 배포본 점검 체크리스트

- [ ] 휴대폰(iOS Safari, Android Chrome)에서 로그인 없이 첫 화면이 스크롤 없이 보인다
- [ ] 기준을 고르기 전엔 촬영 버튼이 비활성이고 안내가 보인다
- [ ] **Take photo**가 후면 카메라를, **Gallery**가 앨범을 연다
- [ ] 12MP 원본 사진도 업로드된다(1600px·3MB 이하로 줄여 전송)
- [ ] 실제 메뉴판 사진 → 60초 안에 결과
- [ ] 결과 맨 위에 "Reference only — not a halal/vegan/allergy certification…"
- [ ] 알레르기 기준 선택 시 모든 카드에 "Always confirm with the vendor"
- [ ] Show to vendor → 상인이 답 버튼을 누르면 내 언어로 결과, 닫기 한 번으로 닫힘
- [ ] 🪪 식사 카드가 네트워크 없이도 열린다
- [ ] 음식만 찍은 사진 → "We couldn't read it…" + Try again
- [ ] 1분에 11번 요청 → "Too many requests…"
- [ ] 새로고침해도 고른 기준·언어가 남아 있다
- [ ] 언어 4개 전환, 아랍어에서 RTL
- [ ] Vercel 로그에 이미지 데이터나 키가 없다
