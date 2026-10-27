# Pocha Menu Check

외국인 여행자가 포장마차 **메뉴판 사진**을 찍으면 Claude가 메뉴를 읽고, 보통 들어가는 재료를 추정해 선택한 식이 기준(돼지고기, 갑각류 등)별로 OK / ASK / AVOID를 판정하고, 상인에게 보여줄 한국어 확인 문장을 큰 글씨로 띄워주는 모바일 웹.

> Reference only — not a halal/vegan/allergy certification.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # MOCK_MODE=true 기본값: 키 없이 UI 전체 흐름 동작
npm run dev                  # http://localhost:3000
```

실제 Claude 호출: `.env.local`에서 `MOCK_MODE=false`, `ANTHROPIC_API_KEY=...` 입력 후 dev 서버 재시작.

## 환경변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 실제 호출 시 | 서버(API route)에서만 사용. `NEXT_PUBLIC_` 붙이지 말 것 |
| `ANTHROPIC_MODEL` | 아니오 | 기본값 `claude-sonnet-5-5` |
| `MOCK_MODE` | 아니오 | `true`면 샘플 JSON 반환 (Claude 호출 안 함) |

`.env.local`은 `.gitignore`에 포함됨. 실제 키는 커밋하지 말 것.

## 구조

```
app/page.tsx             업로드 → 기준 선택 → 결과 카드 → 상인용 큰 글씨 모달
app/api/analyze/route.ts 검증(형식/크기/기준 화이트리스트) · IP 분당 10회 제한 · MOCK_MODE · Claude 호출 + zod 검증, 실패 시 1회 재시도
lib/schema.ts            응답/요청 zod 스키마, 식이 기준 목록
lib/prompt.ts            시스템 프롬프트 (라벨 읽기 모드는 여기 프롬프트 추가)
lib/i18n.ts              모든 UI 문자열 (언어 추가는 여기)
lib/image.ts             브라우저 리사이즈/압축 (긴 변 1600px, JPEG 0.8, ≤3MB)
lib/mock.ts              MOCK_MODE 샘플 응답
```

이미지는 저장하지 않음(요청 메모리에서만 처리). 로그에는 에러 종류/상태 코드만 남김.

## Vercel 배포

1. GitHub에 새 저장소를 만들고 push (`git remote add origin ... && git push -u origin main`)
2. [vercel.com/new](https://vercel.com/new) → 저장소 Import (Framework: Next.js 자동 감지, 설정 변경 불필요)
3. **Environment Variables**에 추가:
   - `ANTHROPIC_API_KEY` = (본인 키)
   - `ANTHROPIC_MODEL` = `claude-sonnet-5-5` (선택)
   - `MOCK_MODE` = `false` (키 없이 데모만 하려면 `true`)
4. Deploy → 배포 URL을 휴대폰으로 열어 메뉴판 촬영 테스트
5. 환경변수를 바꾼 뒤에는 Deployments → 최신 배포 → **Redeploy** 해야 반영됨

참고: 요청 제한은 서버리스 인스턴스 메모리 기반이라 인스턴스마다 따로 셈. 데모용으로 충분.
