# Biome + ESLint(class member 순서 autofix) 병행 Plan

**Goal:** class 멤버 순서(필드 → 생성자 → static 메서드 → public 메서드 → private 메서드 → getter/setter)를 강제 + 저장 시 자동 재배치.

**Architecture:** Biome은 기존처럼 포맷터+대부분 린트 담당 유지. ESLint는 순서 검사/autofix 하나만 전담 (다른 규칙 전부 off → Biome과 판정 중복/충돌 방지). VSCode는 저장 시 Biome fix-all(포맷) + ESLint fix-all(재배치) 병행.

**Tech Stack:** eslint, typescript-eslint, eslint-plugin-sort-class-members (flat config)

**규칙 선정 경위:** 처음엔 `@typescript-eslint/member-ordering` 사용 — 근데 이 규칙은 **autofix 미지원**(`--fix` 돌려도 그대로, 감지만 함). 저장 시 자동 재배치까지 원해서 `eslint-plugin-sort-class-members`(`fixable: 'code'`, 실제 fix 함수 있음)로 교체.

**Order 확정:** `property → constructor → static method(nonAccessor) → public method(nonAccessor) → private method(nonAccessor) → get → set`, `accessorPairPositioning: "getThenSet"`

---

## Task 1: 의존성 설치

**Files:**
- Modify: `package.json` (root devDependencies)
- Modify: `pnpm-lock.yaml`

- [ ] `pnpm add -D -w eslint typescript-eslint`

## Task 2: ESLint flat config 작성 (backend, frontend 개별)

**Files:**
- Create: `backend/eslint.config.mjs`
- Create: `frontend/eslint.config.mjs`

- [ ] `@typescript-eslint/member-ordering` 규칙만 error로 설정, 나머지 rule 없음
- [ ] `languageOptions.parserOptions.project`로 각자 tsconfig.json 지정

## Task 3: VSCode 세팅 반영

**Files:**
- Modify: `.vscode/settings.json`
- Create: `.vscode/extensions.json`

- [ ] `editor.codeActionsOnSave`에 `source.fixAll.biome`(explicit) + `quickfix.eslint`(explicit) 추가
- [ ] `eslint.workingDirectories: ["backend", "frontend"]`
- [ ] `eslint.rules.customizations`로 member-ordering 외 규칙 전부 off 처리(이중 안전장치)
- [ ] `extensions.json`에 `dbaeumer.vscode-eslint` 추천 추가

## Task 4: 검증

- [ ] `pnpm --filter backend exec eslint . --ext .ts` 실행, 설정 정상 동작 확인
- [ ] `pnpm --filter frontend exec eslint . --ext .ts,.tsx` 실행, 설정 정상 동작 확인
- [ ] 기존 코드에서 위반 나오면 개수만 보고 (이번 범위에서 자동수정/일괄수정은 안 함)

## Task 5: 커밋

- [ ] 이번 작업으로 생성/수정된 파일만 커밋
