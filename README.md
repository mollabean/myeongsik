# 명식 — 만세력 사주·궁합·2027 신년운세

모바일 중심 사주 웹서비스입니다. 사주 계산은 모두 브라우저에서 하고, AI 풀이만 서버 함수(`/api/reading`)가 Claude API를 호출해 실시간으로 보여 줍니다.

- **만세력 엔진** `public/saju.js`: 절기를 천문 계산(태양 황경)으로 분 단위까지 구하고, 한국 표준시 변경(1954–61년 UTC+8:30)과 서머타임을 반영합니다. 기존 만세력 라이브러리와 무작위 2만 건, 한국천문연구원 음력 데이터와 2만 건을 비교해 불일치 0건을 확인했습니다.
- **개인정보**: 생년월일은 이용자 기기에만 저장합니다. 서버는 AI 풀이 요청을 처리만 하고 저장하지 않습니다.
- **남용 방지**: 클라이언트는 프로필과 주제만 보내고, 프롬프트는 서버가 만듭니다. 그래서 이 API로 임의의 질문을 할 수 없습니다. IP별·전체 일일 호출 제한이 있습니다.

## 배포 (Vercel, 약 5분)

1. **Anthropic API 키 만들기**
   [console.anthropic.com](https://console.anthropic.com)에서 API 키를 만들고, **월 사용 한도(Spend limit)를 꼭 걸어 두세요.** 사이트가 갑자기 많이 퍼져도 이 한도를 넘는 비용은 나가지 않습니다.
2. **Vercel에 저장소 연결**
   [vercel.com](https://vercel.com)에 GitHub 계정으로 가입 → **Add New → Project** → `myeongsik` 저장소 **Import**.
   Framework Preset은 **Other**, Build Command와 Output Directory는 비워 둡니다.
3. **환경 변수 입력 (선택)**
   같은 화면의 Environment Variables에 `ANTHROPIC_API_KEY` = (1번 키)를 넣고 **Deploy**.
   키 없이 배포해도 사이트는 모두 작동하고, AI 풀이 버튼만 "준비 중"으로 표시됩니다. 나중에 키를 넣은 뒤 **Deployments → Redeploy** 하면 AI 풀이가 켜집니다.
4. 배포가 끝나면 `https://myeongsik-xxxx.vercel.app` 주소가 생깁니다. 폰으로 열어 AI 풀이까지 되는지 확인하세요.

이후 `main` 브랜치에 푸시할 때마다 자동으로 다시 배포됩니다.

### 배포 후 하면 좋은 것

| 할 일 | 방법 |
|---|---|
| 내 도메인 연결 | Vercel 프로젝트 → Settings → Domains |
| 다른 사이트에서 API 호출 막기 | 환경 변수 `ALLOWED_ORIGINS=https://내도메인.com,https://myeongsik-xxxx.vercel.app` |
| 호출 제한을 모든 서버에 정확히 적용 | Vercel Marketplace에서 Upstash Redis 추가 → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 설정 |
| 호출 한도 조정 | `LIMIT_PER_IP_HOUR`(기본 20), `LIMIT_PER_IP_DAY`(기본 60), `LIMIT_GLOBAL_DAY`(기본 1000) |
| 모델 변경 | `MODEL_MAIN`(긴 풀이), `MODEL_QUICK`(오늘 한마디) |
| 개인정보처리방침 완성 | `public/privacy.html`의 `[ ]` 부분(운영자, 연락처, 시행일)을 채우고 전문가 검토 |

## 로컬 실행

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev    # http://localhost:3000
npm test                                     # 엔진 회귀 테스트 + API 통합 테스트(가짜 Claude API 사용)
```

## 구조

```
public/
  index.html, app.css, app.js   화면 (오늘 · 내 사주 · 궁합 · 2027 탭, 입력 시트, 풀이 시트)
  saju.js                       만세력 엔진 (브라우저·서버 공용)
  shared.js                     출생지·시진·입력 검증 (브라우저·서버 공용)
  astronomy.browser.min.js      천문 계산 라이브러리 (MIT, astronomy-engine 2.1.19)
  privacy.html                  개인정보처리방침 초안
api/reading.js                  AI 풀이 서버 함수 (Claude API 스트리밍)
lib/prompts.js                  풀이 프롬프트 (서버 전용)
lib/ratelimit.js                호출 제한
test/                           엔진·API 테스트
scripts/dev-server.js           로컬 개발 서버
```

## 다음 단계

- 결제: 사업자등록·통신판매업 신고 후 토스페이먼츠/포트원 연동, 궁합·신년운세 상세 풀이를 유료로 전환
- 방문 분석: Vercel Web Analytics 켜기
- 공유 미리보기 이미지(og:image) 추가
