# 디렉터리 구조

레포지토리는 백엔드 / 프론트엔드 / 문서를 최상위에서 분리하는 모노레포로 구성합니다.

## 설계 원칙

업계 모범 사례(NestJS 공식, Nx, 다수 실무 사례)와 1인 프로젝트의 현실을 함께 반영합니다.

1. **기능(feature) 단위로 묶는다.** 레이어(controller/service/repository)별로 폴더를 나누지 않는다. 기능 하나가 폴더 하나다.
2. **과설계하지 않는다.** 별도 Repository 추상화 레이어, 도메인 전용 라이브러리는 _지금_ 만들지 않는다. ORM(MikroORM)이 제공하는 `EntityRepository`를 그대로 사용한다.
3. **공유는 증명될 때 추출한다.** `libs`에 도메인 코드를 미리 넣지 않는다. api·batch가 _실제로_ 같은 코드를 쓰는 게 확인된 순간에만 `libs`로 끌어올린다.
4. `libs`**는 절대** `apps`**를 import하지 않는다.** (lint로 강제)

## 최상위 구조

```
commit-grow/
├── backend/          # NestJS (API 서버 + 배치)
├── frontend/         # 프론트엔드 (스택 미정)
├── docs/             # 기획 / 설계 / 컨벤션 문서
└── .github/          # 이슈 템플릿, 워크플로우
```

## 백엔드 (NestJS Monorepo Mode)

API 서버와 배치는 NestJS 공식 모노레포 모드(`apps` + `libs`)로 구성합니다.
각 앱은 **기능(feature) 단위 폴더**로 내부를 구성하며, 한 폴더 안에 그 기능의 controller / service / entity / dto / 테스트가 모두 들어갑니다.

```
backend/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── retrospect/                 # 기능 단위 폴더
│   │       │   ├── retrospect.controller.ts
│   │       │   ├── retrospect.service.ts        # MikroORM EntityRepository를 직접 주입
│   │       │   ├── dto/
│   │       │   │   └── create-retrospect.dto.ts
│   │       │   ├── retrospect.module.ts
│   │       │   └── retrospect.service.spec.ts   # 단위 테스트는 코드 옆에(colocation)
│   │       ├── app.module.ts
│   │       └── main.ts                          # API 부트스트랩
│   │   └── test/
│   │       └── retrospect.e2e-spec.ts           # E2E 테스트만 분리
│   │
│   └── batch/
│       └── src/
│           ├── retrospect/
│           │   ├── retrospect.scheduler.ts      # @Cron 진입점 (controller 대신)
│           │   ├── retrospect.service.ts
│           │   ├── retrospect.module.ts
│           │   └── retrospect.service.spec.ts
│           ├── batch.module.ts
│           └── main.ts                          # 배치 부트스트랩
│
├── libs/
│   ├── entity/           # MikroORM 엔티티 (api·batch 공유 — 같은 테이블)
│   │   └── src/
│   │       ├── domain/           # 실제 테이블 엔티티 (도메인별)
│   │       │   ├── retrospect/
│   │       │   │   └── retrospect.entity.ts
│   │       │   └── activity/
│   │       │       └── activity.entity.ts
│   │       ├── base/             # BaseEntity, 공통 컬럼(createdAt 등)
│   │       └── enums/            # 공유 enum
│   │
│   └── shared/           # 진짜 공유되는 것만: config, logger, 공통 타입
│       └── src/
│
├── nest-cli.json         # projects 정의 (api / batch / entity / shared)
├── package.json          # 단일 package.json
└── tsconfig.json         # paths: @app/entity, @app/shared 매핑
```

### 계층별 위치

| 계층        | 위치                     | 역할                                                                  |
| ----------- | ------------------------ | --------------------------------------------------------------------- |
| controller  | `apps/api`               | HTTP 요청 수신. thin 하게 유지                                        |
| scheduler   | `apps/batch`             | `@Cron` 진입점 (batch의 controller 역할)                              |
| service     | `apps/api`, `apps/batch` | 비즈니스 흐름. MikroORM EntityRepository를 직접 주입                  |
| entity      | `libs/entity`            | 데이터 모델. api·batch가 **같은 테이블**을 쓰므로 한 번만 정의해 공유 |
| 공통 인프라 | `libs/shared`            | config, logger, 공통 타입 등 framework 무관 코드                      |

> **entity를** `libs`**에 두는 이유**: api와 batch는 동일한 PostgreSQL 테이블을 다루므로 entity가 같습니다.
> 각 앱에 중복 정의하면 MikroORM 매핑이 이중화되고 스키마 불일치 위험이 생깁니다.
> service(흐름)는 앱마다 다르므로 앱에 두고, entity(데이터 모델)만 공유합니다.
>
> `libs/entity/src` 아래는 실제 테이블 엔티티(`domain/`)와 그 외 분류(`base/`, `embeddables/`, `enums/`)를 구분합니다.

### Repository 추상화는 지금 만들지 않는다

ORM은 **MikroORM**을 사용하며, `service`에서 MikroORM의 `EntityRepository`를 직접 주입받아 사용합니다.

```ts
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/core";

@Injectable()
export class RetrospectService {
  constructor(
    @InjectRepository(Retrospect)
    private readonly repo: EntityRepository<Retrospect>,
  ) {}
}
```

별도 Repository 인터페이스/구현 분리는, 복잡한 영속성 로직이 실제로 생길 때 도입합니다.  
필요하면 MikroORM이 지원하는 **커스텀 리포지토리**(`EntityRepository` 상속)로 확장하면 됩니다.

### 경계 규칙

- `libs`는 절대 `apps`를 import하지 않는다. (lint로 강제)
- 모듈은 외부에 `Service`만 노출하고, Repository 등 내부 구현은 모듈 내부에 둔다.

### 테스트 파일 배치

테스트는 **코드 옆에 두는(colocation)** 방식을 기본으로 합니다.

- **단위 테스트**(`*.spec.ts`) → 대상 코드와 **같은 feature 폴더**
- **E2E 테스트**(`*.e2e-spec.ts`) → 각 앱의 `test/` 디렉터리

```
apps/api/
├── src/
│   └── retrospect/
│       ├── retrospect.service.ts
│       └── retrospect.service.spec.ts    # 단위 — 코드 옆
└── test/
    └── retrospect.e2e-spec.ts            # E2E — 분리
```

- 코드가 이동(예: `libs`로 추출)할 때 `.ts`와 `.spec.ts`가 한 쌍으로 함께 이동하므로 구조가 흔들리지 않습니다.
- 네이밍 규칙은 [네이밍 컨벤션 문서](./naming-convention.md)를 따릅니다.

> **테스트 전략은 미정.** 단위/통합/E2E를 어떻게 나누고 DB를 어떻게 다룰지(mock, PGlite 등)는 추후 별도로 정의합니다. 이 문서에서는 **파일 배치 규칙만** 확정합니다.

## 프론트엔드

> **미정** — 스택(React / Vue 등) 확정 후 별도로 정의합니다.

## 문서 (docs)

```
docs/
├── planning/         # 요구사항, ERD 등 기획
├── architecture/     # 시스템 아키텍처, API 명세
├── conventions/      # 네이밍 / 커밋 / 디렉터리 규칙
└── adr/              # 기술 결정 기록 (Architecture Decision Record)
```

## 참고 자료

- [NestJS — Monorepo (Workspaces)](https://docs.nestjs.com/cli/monorepo) — apps/libs 공식 구조
- [Nx — Enforce Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — libs↔apps 경계 강제
- [NestJS Project Structure Best Practices 2026 (Encore)](https://encore.dev/articles/nestjs-project-structure-best-practices) — feature 단위 조직화
- [Repository Pattern in NestJS: Do It Right or Go Home](https://dev.to/adamthedeveloper/repository-pattern-in-nestjs-do-it-right-or-go-home-268f) — Repository 추상화 판단 기준
- [Software Architecture Is Overrated, Clear and Simple Design Is Underrated (HN)](https://news.ycombinator.com/item?id=21001676) — 과설계 경계
