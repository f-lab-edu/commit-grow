---
name: backend-conventions
description: 백엔드 디렉터리 구조·파일명 suffix 규칙. backend/ 아래 파일 생성·수정하거나 파일 어디 둘지·이름 뭘로 할지 고민될 때 사용.
---

# 구조

- `apps/api/src/<domain>/`: controller·service·module·dto/·`.service.spec.ts`(colocation). e2e는 `apps/api/e2e-test/`로 분리.
- `apps/batch/src/<domain>/`: scheduler(`@Cron` 진입점, controller 대신)·service·module.
- `libs/entity/src/domain/<domain>/<domain>.entity.ts`: api·batch 공유 테이블, 한 곳에서만 정의. `base/`(BaseEntity 등)·`enums/`도 여기.
- `libs/shared/src/`: config·logger 등 공통.
- 테스트 전략(단위/통합/E2E 구분, DB 처리) 미정 — 임의로 만들지 않음.

# 네이밍 — `[도메인].[역할].ts`

| 역할 | suffix |
|------|--------|
| 컨트롤러 | `.controller.ts` |
| 서비스 | `.service.ts` |
| 모듈 | `.module.ts` |
| 엔티티 | `.entity.ts` |
| 레포지토리 | `.read-repository.ts` |
| DTO | `.dto.ts` |
| 스케줄러 | `.scheduler.ts` |
| 가드 | `.guard.ts` |
| 인터셉터 | `.interceptor.ts` |
| 단위 테스트 | `.spec.ts` |
| E2E 테스트 | `.e2e-spec.ts` |

파일 생성 시 `nest g <schematic> <name>` CLI 우선 사용 (예: `nest g service retrospect` → service + spec 자동 생성).

# 하지 말 것

- `libs`에서 `apps` import (lint 강제)