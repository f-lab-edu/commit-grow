# CLAUDE.md — Commit Grow

GitHub 활동 수집·집계, AI 회고 제공하는 개발자 성장 플랫폼.
1인 백엔드 프로젝트. (NestJS 11 + MikroORM + PostgreSQL 18)

## 절대 하지 말 것

- `libs`에서 `apps` import 안 함. (lint 강제)
- Repository 인터페이스 추상화 레이어 안 만듦. MikroORM `EntityRepository` service에 직접 주입이 이 프로젝트 방침.
- 지금 불필요한 추상화 도입 안 함. 1인 프로젝트.

## 기술 스택

| 레이어 | 스택 |
|--------|------|
| 런타임 | Node.js 24.18 LTS (fnm으로 버전 고정) |
| API 서버 | NestJS 11, Passport (passport-github2), @nestjs/swagger |
| 배치 | NestJS 11, @nestjs/schedule |
| ORM | MikroORM — EntityRepository 직접 주입 |
| DB | PostgreSQL 18.4 |
| 검증 | class-validator + class-transformer |
| 패키지 매니저 | pnpm |
| 인프라 | Docker + Docker Compose, GitHub Actions |

## 디렉터리 구조

```
commit-grow/
├── backend/
│   ├── apps/
│   │   ├── api/
│   │   │   ├── src/<domain>/
│   │   │   │   ├── <domain>.controller.ts   # HTTP 요청 수신
│   │   │   │   ├── <domain>.service.ts
│   │   │   │   ├── <domain>.module.ts
│   │   │   │   ├── <domain>.service.spec.ts   # 단위 테스트 — 코드 옆에 colocation
│   │   │   │   └── dto/
│   │   │   └── e2e-test/                      # E2E 테스트만 분리
│   │   └── batch/
│   │       └── src/<domain>/
│   │           ├── <domain>.scheduler.ts      # @Cron 진입점 (controller 대신)
│   │           ├── <domain>.service.ts
│   │           └── <domain>.module.ts
│   └── libs/
│       ├── entity/src/
│       │   ├── domain/<domain>/<domain>.entity.ts   # api·batch 같은 테이블 공유, 한 번만 정의
│       │   ├── base/      # BaseEntity, createdAt 등
│       │   └── enums/
│       └── shared/src/    # config, logger, 공통 타입
├── frontend/              # 스택 미정
├── docs/
└── .github/
```

테스트 전략(단위/통합/E2E 구분, DB 처리 방법) 미정. 임의로 전략 안 만듦.

## Repository 패턴

기본: service에서 MikroORM `EntityRepository` 직접 주입.

```ts
@Injectable()
export class RetrospectService {
  constructor(
    @InjectRepository(Retrospect)
    private readonly repo: EntityRepository<Retrospect>,
  ) {}
}
```

쿼리 빌더 필요할 때만 `EntityReadRepository` 상속한 커스텀 Repository로 분리.

```ts
// retrospect.read-repository.ts
export class RetrospectRepository extends EntityReadRepository<Retrospect> {
  async findByUserId(userId: string): Promise<Retrospect[]> {
    return this.createQueryBuilder()
      .where({ userId })
      .orderBy({ createdAt: 'DESC' })
      .getResultList();
  }
}
```

## 네이밍 규칙

### 공통

| 대상 | 규칙 | 예시 |
|------|------|------|
| 폴더 | kebab-case | `weekly-report/` |
| 클래스 | PascalCase | `WeeklyReportService` |
| 변수 / 함수 | camelCase | `aggregateDailyActivity` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

### 백엔드 파일명 — `[도메인].[역할].ts`

| 역할 | suffix | 예시 |
|------|--------|------|
| 컨트롤러 | `.controller.ts` | `retrospect.controller.ts` |
| 서비스 | `.service.ts` | `retrospect.service.ts` |
| 모듈 | `.module.ts` | `retrospect.module.ts` |
| 엔티티 | `.entity.ts` | `retrospect.entity.ts` |
| 레포지토리 | `.read-repository.ts` | `retrospect.read-repository.ts` |
| DTO | `.dto.ts` | `create-retrospect.dto.ts` |
| 스케줄러 | `.scheduler.ts` | `retrospect.scheduler.ts` |
| 가드 | `.guard.ts` | `auth.guard.ts` |
| 인터셉터 | `.interceptor.ts` | `logging.interceptor.ts` |
| 단위 테스트 | `.spec.ts` | `retrospect.service.spec.ts` |
| E2E 테스트 | `.e2e-spec.ts` | `retrospect.e2e-spec.ts` |

파일 생성 시 `nest g <schematic> <name>` CLI 우선 사용.
예: `nest g service retrospect` → `retrospect.service.ts` + `retrospect.service.spec.ts` 자동 생성.

## Git 워크플로우

커밋 형식: `<type>(<scope>): <subject>` — subject는 **한글**로 간결히, 마침표 없이.

| type | 용도 |
|------|------|
| `feat` | 신규 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `test` | 테스트 추가 / 수정 |
| `chore` | 빌드, 설정, 의존성 |
| `docs` | 문서 |

| scope | 대상 |
|-------|------|
| `api` | `apps/api` |
| `batch` | `apps/batch` |
| `domain` | `libs/domain` |
| `frontend` | 프론트엔드 |
| `root` | 루트 공통 설정 (gitignore, CI 등) |

예시:
```
feat(api): GitHub OAuth 로그인 구현
fix(frontend): 히트맵 날짜 오프셋 버그 수정
chore(root): .gitignore 업데이트
docs: README 아키텍처 섹션 추가
```

브랜치: `feat/<이슈번호>-<간단한-설명>`, `fix/<이슈번호>-<간단한-설명>` — 예: `feat/12-github-oauth`

작업 흐름: **이슈 생성 → PR 생성 → 작업 → 리뷰 → Approve → 이슈 close**