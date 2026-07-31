# 프론트엔드 기초 세팅 가이드

구조: `frontend/`, `backend/` 분리 모놀리스 레포 · pnpm workspace
스택: Next.js(App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Biome
기준 문서: `디자인 목업V1.dc.html`

## 0단계 — 루트 사전 작업 (frontend 생성 전)

1. `.nvmrc` 루트에 추가 (Node 24.18 고정 — [00-overview.md](../planning/00-overview.md) 스택 기준)
2. `pnpm-workspace.yaml` 루트에 추가

   ```yaml
   packages:
     - "frontend"
     - "backend"
   ```

3. 루트 `biome.jsonc`는 `frontend`가 `extends: "//"`로 상속받는 구조 그대로 유지. 다만 현재 루트엔 `$schema` / `root: true` 외 실질 규칙이 거의 없다는 점만 인지하고 넘어간다.

## 1단계 — Next.js 프로젝트 생성

```
pnpm dlx create-next-app@latest frontend
```

옵션: TypeScript **Yes** / ESLint **Yes**(일단 그대로 생성, 5단계에서 제거) / Tailwind CSS **Yes** / App Router **Yes** / `src/` directory **Yes** / import alias는 기본값 유지

- `pnpm-workspace.yaml`이 이미 있는 상태에서 생성하는 것이므로 충돌 여부 확인 (알려진 이슈 있음)

## 2단계 — 실행 확인 및 포트 조정

- backend 로컬 기본 포트가 3000 (`backend/env/env.exam-local.yml` 확인) → frontend는 **3001**로 변경

  ```json
  // frontend/package.json
  "scripts": {
    "dev": "next dev -p 3001"
  }
  ```

- `pnpm --filter frontend dev`로 정상 기동 확인

## 3단계 — 디자인 토큰 이식

- `디자인 목업V1.dc.html`의 CSS 변수(`--bg-surface`, `--text-primary`, `--accent-700`, `--radius-lg`, `--font-family-base` 등)를 `src/app/globals.css`의 `@theme`에 이식
  - Tailwind **v4** 기준 — `tailwind.config.ts`에 매핑하지 않음 (v4는 CSS-first, config 파일 기본 생성 안 됨)
- 화면 단위로 나눠서 Claude Code에 요청 (목업 파일 전체를 한 번에 요청하지 않는다)

## 4단계 — 폰트 적용

- `--font-family-base` 실제 폰트 확인 (Google Fonts / 시스템 폰트)
- Google Fonts면 `next/font/google`로 `layout.tsx`에 로드 후 CSS 변수에 연결

## 5단계 — Biome 전환

1. create-next-app이 만든 ESLint 설정(`eslint.config.mjs`) 내용 확인
2. `frontend/biome.jsonc` 작성 — 루트(`//`) extends + ESLint 설정에서 확인한 규칙을 Biome 규칙으로 옮겨서 추가
   - 주의: `eslint-config-next`의 React Hooks / Next.js 전용 / jsx-a11y 규칙 중 Biome에 1:1 대응이 없는 항목은 근사치로 대체되거나 누락될 수 있음
3. ESLint/Prettier 관련 설정 파일·devDependency 삭제
4. `package.json`의 lint/format 스크립트를 Biome 명령으로 교체

## 6단계 — shadcn/ui 초기화

```
pnpm dlx shadcn@latest init
```

- alias 질문에 `tsconfig.json`의 `@/*`와 동일하게 답변
- 생성된 `components.json`에서 alias가 실제로 일치하는지 최종 확인
- 목업에 실제 등장하는 컴포넌트만 그때그때 추가

```
pnpm dlx shadcn@latest add button card input avatar
```

## 7단계 — 폴더 구조

```
src/
  app/
  components/ui/       # shadcn이 채움
  features/            # 화면 단위 로직 (auth, dashboard...)
  lib/
    api-client.ts      # 뼈대만 작성 — 실구현은 API 준비 후
  types/
    api.ts             # 코드젠 대기 (swagger → OpenAPI 스키마 방식 예정)
```

## 8단계 — `.gitignore` 확인

- `node_modules`, `.next`, `.env*.local` 등 create-next-app 기본 생성분 확인
- 루트 `.gitignore`와 중복·누락 여부 점검

## 9단계 — 환경변수 (YAML)

backend와 동일한 컨벤션 사용 (`backend/libs/environment/src/EnviromentUtil.ts` 참고):

```
frontend/
  env/
    env.local.yml
    env.exam-local.yml
```

```ts
// next.config.ts
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

const nodeEnv = process.env.NODE_ENV ?? "local";
const config = load(readFileSync(`env/env.${nodeEnv}.yml`, "utf8")) as any;

export default {
  env: {
    NEXT_PUBLIC_API_URL: config.api.baseUrl, // 브라우저에 노출돼도 되는 값만
  },
};
```

- Next.js는 서버 코드와 브라우저 번들이 분리되므로, `NEXT_PUBLIC_*`로 노출하는 값에 시크릿이 섞이지 않도록 주의
- 서버 전용 값은 `env` 필드로 빼지 않고, 서버 컴포넌트/route handler 전용 유틸을 별도로 둔다

## 10단계 — CORS (backend 측 작업)

```ts
app.enableCors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3001",
  credentials: true,
});
```

- 세션 쿠키 기반 인증(Passport GitHub OAuth + express-session + connect-redis)이므로, 이후 `api-client.ts` 작성 시 `credentials: 'include'` 필수 — 지금은 메모만 해두고 대기

## 11단계 — 보호된 라우트 뼈대

- `middleware.ts` 파일만 생성해두고, 실제 인증 검증 로직은 API 준비 후 채운다

## 12단계 — Next.js 기본 페이지

- `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` 초안 적용
- `layout.tsx`에 `metadata`(title, favicon) 초안 적용

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Commit Grow",
    template: "%s | Commit Grow",
  },
  description: "GitHub 활동 기반 개발자 성장 회고 플랫폼",
  icons: {
    icon: "/favicon.ico",
  },
};
```

## 13단계 — CI

- `.github/workflows/frontend-ci.yml` 추가: `paths: frontend/**` 필터로 install → biome lint → `tsc --noEmit` → `next build` 순서로 실행
- SonarCloud exclusion 설정(`sonar.exclusions` 등)은 보류 — 추후 확인 후 결정

## 14단계 — 커밋

```
git add .
git commit -m "chore: frontend 기초 세팅 (Next.js + Tailwind + shadcn + Biome)"
```

## 이번 범위 제외 (작업 시 별도 논의)

- GitHub OAuth 로그인 연동 (프론트 리다이렉트 처리)
- `next.config`의 GitHub 아바타 도메인(`avatars.githubusercontent.com`) 허용
- `api-client.ts` / `types/api.ts` 실구현
- 테스트 프레임워크 도입 (보류)
- husky + lint-staged (추후 추가 예정)
- SonarCloud exclusion 세부값
- frontend Docker Compose 편입 (로컬 개발엔 불필요 — backend는 DB/Redis 의존성 때문에 필요했던 것)
