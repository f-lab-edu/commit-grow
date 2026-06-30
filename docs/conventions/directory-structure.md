# 디렉터리 구조

레포지토리는 백엔드 / 프론트엔드 / 문서를 최상위에서 분리하는 모노레포로 구성합니다.

## 설계 원칙

업계 모범 사례(NestJS 공식, Nx, 다수 실무 사례)와 1인 프로젝트의 현실을 함께 반영합니다.

1. **기능(feature) 단위로 묶는다.** 레이어(controller/service/repository)별로 폴더를 나누지 않는다. 기능 하나가 폴더 하나다.
2. **과설계하지 않는다.** 별도 Repository 추상화 레이어, 도메인 전용 라이브러리는 *지금* 만들지 않는다. ORM(MikroORM)이 제공하는 `EntityRepository`를 그대로 사용한다.
3. **공유는 증명될 때 추출한다.** `libs`에 도메인 코드를 미리 넣지 않는다. api·batch가 *실제로* 같은 코드를 쓰는 게 확인된 순간에만 `libs`로 끌어올린다.
4. **`libs`는 절대 `apps`를 import하지 않는다.** (lint로 강제)

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
│   │       │   ├── retrospect.entity.ts
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
│   └── shared/           # 진짜 공유되는 것만: config, logger, 공통 타입
│       └── src/
│
├── nest-cli.json         # projects 정의 (api / batch / shared)
├── package.json          # 단일 package.json
└── tsconfig.json         # paths: @app/shared 매핑
```

### 계층별 위치

| 계층 | 위치 | 역할 |
| --- | --- | --- |
| controller | `apps/api` | HTTP 요청 수신. thin 하게 유지 |
| scheduler | `apps/batch` | `@Cron` 진입점 (batch의 controller 역할) |
| service | `apps/api`, `apps/batch` | 비즈니스 흐름. MikroORM EntityRepository를 직접 주입 |
| entity | 각 앱의 feature 폴더 | 데이터 모델 |
| 공통 인프라 | `libs/shared` | config, logger, 공통 타입 등 framework 무관 코드 |

### Repository 추상화는 지금 만들지 않는다

ORM은 **MikroORM**을 사용하며, `service`에서 MikroORM의 `EntityRepository`를 직접 주입받아 사용합니다.

```ts
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';

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

### 공유가 필요해지면 (지금이 아님)

api·batch가 같은 service/엔티티 코드를 **실제로 중복해서 쓰는 게 확인되면**, 그때 도메인별 라이브러리로 추출합니다.

```
libs/
├── shared/        # config, logger, 공통 타입
├── retrospect/    # (추출 시점에) 회고 공유 도메인
└── activity/      # (추출 시점에) 활동 수집 공유 도메인
```

추출 대상은 **앱 컨텍스트(@Cron, Request, 세션, 외부 호출)가 없는 순수 코드**에 한합니다.
코드와 테스트(`.spec.ts`)는 한 쌍으로 함께 이동하므로 구조가 흔들리지 않습니다.

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

### 공식 문서
- [NestJS — Monorepo (Workspaces)](https://docs.nestjs.com/cli/monorepo)
- [NestJS — Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)
- [NestJS — Testing](https://docs.nestjs.com/fundamentals/testing)
- [Nx — Enforce Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries)

### 구조 / 아키텍처
- [Encore — NestJS Project Structure Best Practices 2026](https://encore.dev/articles/nestjs-project-structure-best-practices)
- [NestJS Architecture That Survived Real Production Traffic](https://medium.com/@bhagyarana80/nestjs-architecture-that-survived-real-production-traffic-d690fc6afefd)
- [NestJS Monorepos Without the Meltdown](https://medium.com/@bhagyarana80/nestjs-monorepos-without-the-meltdown-3a155795ea94)
- [Architecting a Scalable NestJS Application with a Feature-First Approach](https://medium.com/@rahmounidev/architecting-a-scalable-nestjs-application-with-a-feature-first-approach-092234485a51)
- [Clean Architecture in NestJS — A Practical Guide](https://dev.to/kubabuilds/clean-architecture-in-nestjs-a-practical-guide-101p)
- [Enforcing the Controller-Service-Repository Pattern with Static Analysis](https://dev.to/franciscuo/clean-architecture-in-nestjs-enforcing-the-controller-service-repository-pattern-with-static-4ejc)
- [Structuring a NestJS Project with DDD and Onion Architecture](https://medium.com/@patrick.cunha336/structuring-a-nestjs-project-with-ddd-and-onion-architecture-65b04b7f2754)
- [Applying Domain-Driven Design principles to a NestJS project (Forward Digital)](https://forward.digital/blog/applying-domain-driven-design-principles-to-a-nestjs-project)
- [Minimal Domain-Driven Design for NestJS](https://bilaltehseen.medium.com/minimal-domain-driven-design-for-nest-js-b07152ec9970)
- [Stop the Spaghetti: Enforcing Module Boundaries in an Nx Monorepo](https://dev.to/sakthicodes22/stop-the-spaghetti-enforcing-module-boundaries-in-an-nx-monorepo-2a24)

### Repository 패턴 / 과설계
- [Repository Pattern in NestJS: Do It Right or Go Home](https://dev.to/adamthedeveloper/repository-pattern-in-nestjs-do-it-right-or-go-home-268f)
- [Repository pattern explained — overkill for simple cases](https://draganatanasov.com/2023/01/15/repository-pattern-explained-with-laravel-and-nestjs-examples/)
- [Software Architecture Is Overrated, Clear and Simple Design Is Underrated (HN)](https://news.ycombinator.com/item?id=21001676)
- [Developing Solo — How to write a production-grade project](https://medium.com/swlh/developing-solo-dc075fa3127e)

### 테스트
- [Unit Testing in NestJS using Suites (AppSignal, 2025)](https://blog.appsignal.com/2025/07/30/unit-testing-in-nestjs-for-node-using-suites-formerly-automock.html)
- [Mastering NestJS Unit Testing](https://caw.tech/mastering-nestjs-unit-testing-to-write-clean-maintainable-tests/)
