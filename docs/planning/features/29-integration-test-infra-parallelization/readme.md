# 백엔드 통합 테스트 인프라 병렬화

이슈에 대한 내용을 빠르게 이해하기 위한 내용

## 개요

레퍼런스 프로젝트(NestJS + TypeORM + PostgreSQL + Redis, Vitest)에서 검증된 통합 테스트 전략을, 이 프로젝트(NestJS + MikroORM + PostgreSQL + Redis, Vitest)에 동일한 설계 원칙으로 이식한다. ORM API가 다른 지점만 MikroORM 것으로 치환하고, 격리/재사용 전략(테스트컨테이너 재사용, worker별 스키마/redis db 격리, 테스트 단위 트랜잭션 롤백, Factory 픽스처)은 그대로 유지한다.

## 목표

- vitest `test.projects`로 unit(`*.spec.ts`)/integration(`*.int-spec.ts`) 실행을 분리한다.
- Postgres/Redis 테스트컨테이너를 프로세스당 1회, `.withReuse()`로 기동해 매 실행마다 컨테이너를 새로 띄우지 않는다.
- vitest worker가 여러 개 떠도(`maxWorkers: '50%'`) worker끼리 데이터가 섞이지 않도록 Postgres는 worker별 schema, Redis는 worker별 db index로 격리한다.
- 매 `it()`마다 실제 DB 트랜잭션을 시작하고 종료 시 롤백해서, 스키마 재생성보다 빠르게 테스트 간 데이터 격리를 보장한다(`ServiceIntTestHelper` / `ControllerTestHelper`).
- MikroORM은 기본적으로 request-scoped `EntityManager`(fork)를 쓰므로, 테스트 헬퍼가 시작한 트랜잭션과 서비스가 실제로 주입받는 `EntityManager`가 같은 트랜잭션 컨텍스트를 보도록 하는 방식(`RequestContext.createAsync()` 또는 `em.fork({ useContext: true })`)을 먼저 스파이크로 검증한다 — TypeORM 대비 이식 리스크가 가장 큰 지점.
- 엔티티별 `XxxFactory extends BaseFactory<XxxEntity>`로 픽스처를 만들고, `BaseFactory`가 엔티티 메타데이터로 not-null 컬럼 기본값을 타입별 자동 생성한다. `FactoryManager`가 모든 Factory를 한 곳에 모은다.
- 서비스 하나에 위 패턴을 먼저 적용해 검증한 뒤 나머지로 확산할 수 있는 재사용 가능한 구조로 만든다.

## 비목표

- 기존 unit 테스트(`*.spec.ts`) 자체의 리팩터링/커버리지 확대는 다루지 않는다(경로/실행 스크립트 분리만 다룸).
- 이 작업에서 모든 서비스에 integration 테스트를 새로 작성하지 않는다 — 패턴 검증용으로 서비스 1개만 적용한다.
- CI(GitHub Actions) 파이프라인 변경은 범위 밖이다(로컬 `pnpm test` / `pnpm test:int` 통과가 기준).
- `vitest-mock-extended` 기반 unit 모킹 컨벤션 자체를 새로 만들지 않는다(이미 정해진 규칙을 따름).

## 완료 기준

- `pnpm test`(unit)와 `pnpm test:int`(integration)가 로컬에서 통과한다.
- `--project integration`을 여러 worker로 병렬 실행해도(`vitest run --project integration`) worker 간 데이터 격리가 깨지지 않는다 — 같은 컨테이너/DB를 공유하는 worker끼리 schema/redis db가 분리되어 있음을 실제로 확인한다.
- 같은 프로세스 내에서 테스트를 반복 실행해도(`--reuse` 컨테이너 재사용) 이전 실행의 데이터가 남지 않는다(매 `it()` 트랜잭션 롤백 확인).
- MikroORM 트랜잭션 컨텍스트 공유 스파이크가 통과한다: 헬퍼가 시작한 트랜잭션 안에서 실행한 서비스 호출이 실제로 그 트랜잭션을 보고, 롤백 시 서비스가 쓴 데이터도 함께 사라진다.
- 파일럿 서비스 1개에 대해 Factory 픽스처 기반 integration 테스트가 최소 1개 작성되어 통과한다.

## 테스트

- 스파이크(트랜잭션 컨텍스트 공유)는 별도 검증용 테스트로 먼저 확인한 뒤 헬퍼 코드에 반영한다.
- 파일럿 서비스의 integration 테스트에서 `ServiceIntTestHelper`(HTTP 레벨이 필요하면 `ControllerTestHelper`)로 트랜잭션 start/rollback을 검증한다.
- `pnpm test:int -- --project integration`을 다중 worker로 돌려 스키마/redis db 격리가 깨지지 않는지 확인한다(실패 시 worker 간 데이터 오염이 있다는 뜻).

## 예외사항

- worker 수가 32개(Redis db index 범위)를 넘으면 `REDIS_DATABASE_COUNT` 상수와 global-setup의 `--databases` 플래그를 함께 올려야 한다 — 지금은 그 상황을 가정하지 않는다.
- MikroORM 트랜잭션 컨텍스트 공유 스파이크가 실패할 경우(`RequestContext.createAsync()` / `em.fork({ useContext: true })` 둘 다 기대대로 동작하지 않는 경우), 이 문서의 격리 전략 자체를 재검토해야 하므로 plan.md 진행 전에 별도로 보고한다.
