# 백엔드 통합 테스트 인프라 병렬화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 레퍼런스 프로젝트(TypeORM)에서 검증된 testcontainer 재사용 + worker별 격리 + 트랜잭션 롤백 + Factory 픽스처 전략을, MikroORM API로 치환해 이 프로젝트(`backend/`)에 이식한다.

**Architecture:** vitest `test.projects`로 unit/integration을 분리하고, integration 쪽에만 `globalSetup`(Postgres/Redis testcontainer, `.withReuse()`)과 `setupFiles`(worker별 schema/redis db 격리)를 건다. MikroORM은 `@mikro-orm/nestjs`가 HTTP 미들웨어로만 등록하는 `RequestContext`를 테스트에서 수동으로 열어(`RequestContext.enter()`), 그 안에서 `em.begin()`/`em.rollback()`으로 매 테스트를 감싼다. 기존 정적 `docker-compose.test.yml` 기반 e2e(`test:e2e`)는 건드리지 않고 그대로 둔다 — 회귀 리스크 최소화.

**Tech Stack:** NestJS 11, MikroORM 7(`@mikro-orm/postgresql`, `@mikro-orm/nestjs`), Vitest 3.2, `testcontainers`/`@testcontainers/postgresql`/`@testcontainers/redis`, `redis`(v6) 패키지, pnpm.

**Spec:** [docs/planning/features/29-integration-test-infra-parallelization/readme.md](./readme.md)

## Global Constraints

- 테스트는 소스 파일 옆에 배치, integration은 `*.int-spec.ts`. 단 컨테이너 기동/worker 격리처럼 특정 소스 파일에 속하지 않는 공용 인프라만 `backend/test/setup/`에 둔다.
- `ServiceIntTestHelper`/Factory처럼 이미 `backend/libs/common/test-helper/`에 자리가 있는 종류의 코드는 그 디렉토리에 이어서 둔다(기존 `createTestingModule.ts`와 같은 위치).
- 기존 `pnpm test:e2e`(`vitest.config.e2e.ts` + `docker-compose.test.yml`, 포트 5433/6380)는 이번 작업 범위 밖 — 수정하지 않는다.
- 값은 하드코딩 리터럴 우선, faker는 랜덤성 자체가 테스트 대상일 때만. 실패 케이스는 케이스마다 개별 `it()`. `// given` / `// when` / `// then` 주석으로 구획.
- Postgres/Redis 버전·크레덴셜은 `backend/docker-compose.test.yml`과 동일하게: `postgres:18.4`, `redis:7.4`, user/password/db 전부 `commit_grow`.
- worker 수가 32개(`REDIS_DATABASE_COUNT`)를 넘는 상황은 다루지 않는다.

---

## Task 1: vitest unit/integration 프로젝트 분리

**Files:**

- Create: `backend/vitest.config.mts`
- Delete: `backend/vitest.config.ts`
- Modify: `backend/package.json:18-21` (스크립트)

**Interfaces:**

- Produces: `vitest run --project unit`, `vitest run --project integration` 커맨드. 이후 태스크의 `globalSetup`/`setupFiles`는 `integration` 프로젝트에만 연결된다(아직 파일 없음 — Task 2/3에서 생성).

- [x] **Step 1: `backend/vitest.config.mts` 작성**

```ts
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths(), swc.vite()],
	test: {
		root: '.',
		environment: 'node',
		setupFiles: ['./vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			reportsDirectory: './coverage',
			include: ['apps/**/*.{ts,js}', 'libs/**/*.{ts,js}'],
		},
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['apps/**/*.spec.ts', 'libs/**/*.spec.ts'],
					maxWorkers: '50%',
					testTimeout: 5_000,
				},
			},
			{
				extends: true,
				test: {
					name: 'integration',
					include: ['apps/**/*.int-spec.ts', 'libs/**/*.int-spec.ts'],
					globalSetup: ['test/setup/global-setup.ts'],
					setupFiles: ['./vitest.setup.ts', 'test/setup/worker-setup.ts'],
					maxWorkers: '50%',
					testTimeout: 5_000,
				},
			},
		],
	},
});
```

- [x] **Step 2: 기존 `backend/vitest.config.ts` 삭제**

```bash
rm backend/vitest.config.ts
```

- [x] **Step 3: `backend/package.json` 스크립트 수정**

`test`/`test:watch`를 `--project unit`으로, `test:int`를 신규 추가:

```json
		"test": "vitest run --project unit",
		"test:watch": "vitest --project unit",
		"test:cov": "vitest run --coverage",
		"test:debug": "vitest --inspect-brk --no-file-parallelism",
		"test:int": "vitest run --project integration",
```

(`test:e2e`/`test:e2e:up`/`test:e2e:down`은 그대로 둔다.)

- [x] **Step 4: 기존 unit 테스트가 여전히 통과하는지 확인**

Run: `cd backend && pnpm test`
Expected: 기존 `*.spec.ts` 전부 PASS (동작 변화 없이 실행 방식만 바뀜 확인).

- [x] **Step 5: integration 프로젝트가 빈 상태로 정상 인식되는지 확인**

Run: `cd backend && pnpm test:int`
Expected: `*.int-spec.ts` 파일이 아직 없으므로 "No test files found" 류 메시지로 종료(에러 없이). `globalSetup: test/setup/global-setup.ts`가 없어 모듈 로드 에러가 나면 정상 — Task 2에서 생성한다.

- [x] **Step 6: 커밋**

```bash
git add backend/vitest.config.mts backend/vitest.config.ts backend/package.json
git commit -m "test: vitest unit/integration 프로젝트 분리"
```

---

## Task 2: testcontainers 의존성 + global-setup(Postgres/Redis 재사용)

**Files:**

- Modify: `backend/package.json` (devDependencies)
- Modify: `backend/libs/environment/src/EnviromentUtil.ts`
- Create: `backend/test/setup/global-setup.ts`

**Interfaces:**

- Consumes: `EnviromentUtil.getEnv()` (기존, `backend/libs/environment/src/EnviromentUtil.ts`).
- Produces: `global-setup.ts`가 `process.env.DB_HOST`/`DB_PORT`/`REDIS_HOST`/`REDIS_PORT`를 설정 — 이후 태스크(worker-setup, ServiceIntTestHelper)는 `EnviromentUtil.getEnv().database`/`.redis`를 그대로 읽으면 testcontainer 포트를 받는다.

- [x] **Step 1: 의존성 추가**

```bash
cd backend && pnpm add -D testcontainers @testcontainers/postgresql @testcontainers/redis
```

- [x] **Step 2: `EnviromentUtil.getEnv()`에 override 옵션 추가, `vitest.setup.ts`에서 `process.env` → override 변환**

`EnviromentUtil.ts`는 `process.env`를 직접 읽지 않고 명시적 override 파라미터만 받는다(순수하게 유지, 외부 의존성 없음). `global-setup.ts`가 심어준 testcontainer 포트(`process.env.DB_HOST` 등)를 override로 변환해 넘기는 역할은 공용 `vitest.setup.ts`가 맡는다 — 프로세스 경계를 넘는 유일한 통로(globalSetup → worker)라 `process.env`가 필요한 지점은 거기뿐이다.

```ts
// EnviromentUtil.ts
export interface EnvOverrides {
	database?: Partial<{ host: string; port: number }>;
	redis?: Partial<{ host: string; port: number }>;
}

export class EnviromentUtil {
	static getEnv(
		nodeEnv: string = process.env.NODE_ENV || 'test',
		overrides?: EnvOverrides,
	): Environment { /* ... */ }

	private static getEnvFrom(nodeEnv: string, overrides?: EnvOverrides) {
		const environmentObject: Record<string, any> =
			load(readFileSync(`env/env.${nodeEnv}.yml`, 'utf8')) || {};
		environmentObject['environment'] = nodeEnv;

		if (overrides?.database) {
			environmentObject.database = { ...environmentObject.database, ...overrides.database };
		}
		if (overrides?.redis) {
			environmentObject.redis = { ...environmentObject.redis, ...overrides.redis };
		}

		return plainToInstance(Environment, environmentObject, { enableImplicitConversion: false });
	}
}
```

```ts
// vitest.setup.ts
import 'reflect-metadata';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';

if (process.env.DB_HOST) {
	EnviromentUtil.getEnv(undefined, {
		database: { host: process.env.DB_HOST, port: Number(process.env.DB_PORT) },
		redis: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) },
	});
}
```

- [x] **Step 3: `backend/test/setup/global-setup.ts` 작성**

```ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';

export default async function setup(): Promise<void> {
	const env = EnviromentUtil.getEnv();

	const postgresContainer = await new PostgreSqlContainer('postgres:18.4')
		.withName('local-test-commit-grow-pg')
		.withUsername(env.database.user)
		.withPassword(env.database.password)
		.withDatabase(env.database.database)
		.withExposedPorts({ container: 5432, host: 15433 })
		.withReuse()
		.start();

	const redisContainer = await new RedisContainer('redis:7.4')
		.withName('local-test-commit-grow-redis')
		.withCommand(['redis-server', '--databases', '32'])
		.withExposedPorts({ container: 6379, host: 16380 })
		.withReuse()
		.start();

	process.env.DB_HOST = postgresContainer.getHost();
	process.env.DB_PORT = String(postgresContainer.getMappedPort(5432));
	process.env.REDIS_HOST = redisContainer.getHost();
	process.env.REDIS_PORT = String(redisContainer.getMappedPort(6379));
}
```

고정 호스트 포트는 `docker-compose.test.yml`(5433/6380)과 겹치지 않도록 15433/16380 사용 — `test:e2e`와 `test:int`를 동시에 띄워도 충돌 없음.

- [x] **Step 4: 컨테이너가 실제로 뜨는지 확인**

Run: `cd backend && pnpm test:int`
Expected: (Task 1에서 아직 `*.int-spec.ts` 없음) 컨테이너 기동 로그가 보이고 "No test files found"로 정상 종료. `docker ps`에 `local-test-commit-grow-pg`/`local-test-commit-grow-redis`가 떠 있는지 확인.

- [x] **Step 5: 재실행 시 재사용되는지 확인**

Run: `cd backend && pnpm test:int` (한 번 더)
Expected: 같은 컨테이너 id가 재사용됨(`docker ps` 상 컨테이너 시작 시각이 갱신되지 않음).

- [x] **Step 6: 커밋**

```bash
git add backend/package.json backend/pnpm-lock.yaml backend/libs/environment/src/EnviromentUtil.ts backend/test/setup/global-setup.ts
git commit -m "test: testcontainers 기반 Postgres/Redis global-setup 추가"
```

---

## Task 3: worker별 schema/redis db 격리

**Files:**

- Create: `backend/test/setup/workerContext.ts`
- Create: `backend/test/setup/worker-setup.ts`

**Interfaces:**

- Consumes: `EnviromentUtil.getEnv()`(Task 2), `test-mikro-orm.config`(기존, `backend/test-mikro-orm.config.ts`).
- Produces: `getWorkerSchema(): string`, `getWorkerRedisDb(): number`, `REDIS_DATABASE_COUNT: number` — Task 5(`ServiceIntTestHelper`)가 `getWorkerSchema()`를 MikroORM `schema` 옵션에 사용한다.

- [x] **Step 1: `backend/test/setup/workerContext.ts` 작성**

```ts
export const REDIS_DATABASE_COUNT = 32; // worker 32개 넘으면 이 상수와 global-setup의 --databases 플래그를 같이 올릴 것

export function getWorkerId(): string {
	return process.env.VITEST_WORKER_ID ?? '0';
}

export function getWorkerSchema(): string {
	return `test_worker_${getWorkerId()}`;
}

export function getWorkerRedisDb(): number {
	return Number(getWorkerId()) % REDIS_DATABASE_COUNT;
}
```

- [x] **Step 2: `backend/test/setup/worker-setup.ts` 작성**

worker schema는 MikroORM의 `SchemaGenerator`로 만들고(원시 SQL 클라이언트 추가 의존성 없이 이미 있는 MikroORM API 재사용), redis는 기존 `redis` 패키지로 db index를 골라 flush한다.

```ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { MikroORM } from '@mikro-orm/core';
import { createClient } from 'redis';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import testMikroOrmConfig from 'test-mikro-orm.config';
import { getWorkerRedisDb, getWorkerSchema } from './workerContext';

let schemaOrm: MikroORM;

beforeAll(async () => {
	schemaOrm = await MikroORM.init({
		...testMikroOrmConfig,
		schema: getWorkerSchema(),
		autoLoadEntities: false,
		entities: ['./libs/entity/src/domain/**/*.entity.ts'],
		entitiesTs: ['./libs/entity/src/domain/**/*.entity.ts'],
	});
	await schemaOrm.schema.createNamespace(getWorkerSchema());
	await schemaOrm.schema.create();
});

afterAll(async () => {
	await schemaOrm.schema.dropNamespace(getWorkerSchema());
	await schemaOrm.close();
});

afterEach(async () => {
	const redisEnv = EnviromentUtil.getEnv().redis;
	const client = createClient({
		socket: { host: redisEnv.host, port: redisEnv.port },
		database: getWorkerRedisDb(),
	});
	await client.connect();
	await client.flushDb();
	await client.quit();
});
```

`entities`/`entitiesTs`를 여기서만 glob으로 명시하는 이유: `test-mikro-orm.config.ts`는 vitest의 이중 로딩(SWC + glob) 문제로 `entities: []`(forFeature 등록 방식)를 쓰지만, 스키마 생성 전용 이 ORM 인스턴스는 Nest DI를 거치지 않으므로 glob으로 직접 엔티티를 읽어야 테이블을 만들 수 있다 — Nest를 통해 뜨는 `ServiceIntTestHelper`(Task 5) 쪽 ORM은 기존 방식(`entities: []` + `autoLoadEntities`)을 그대로 쓴다.

- [x] **Step 3: 스키마가 실제로 생기고 지워지는지 확인**

임시로 `backend/libs/common/worker-setup.int-spec.ts`를 만들어 한 번 실행 후 삭제한다(이 파일은 커밋하지 않음 — 검증 전용):

```ts
import { describe, expect, it } from 'vitest';
import { MikroORM } from '@mikro-orm/core';
import testMikroOrmConfig from '../../test-mikro-orm.config';
import { getWorkerSchema } from '../../test/setup/workerContext';

describe('worker schema', () => {
	it('현재 worker schema에 연결된다', async () => {
		// given & when
		const orm = await MikroORM.init({ ...testMikroOrmConfig, entities: [], schema: getWorkerSchema() });

		// then
		expect(await orm.isConnected()).toBe(true);
		await orm.close();
	});
});
```

Run: `cd backend && pnpm test:int`
Expected: PASS. 완료 후 `rm backend/libs/common/worker-setup.int-spec.ts`.

- [x] **Step 4: 커밋**

```bash
git add backend/test/setup/workerContext.ts backend/test/setup/worker-setup.ts
git commit -m "test: worker별 Postgres schema / Redis db 격리 추가"
```

---

## Task 4: 스파이크 — MikroORM 트랜잭션 컨텍스트 공유 검증

이 태스크의 목적은 "헬퍼가 시작한 트랜잭션을, 주입받은 서비스가 실제로 보는지"를 실제 testcontainer DB로 확인하는 것이다. `@mikro-orm/nestjs`는 `MikroOrmModule.forRoot()`가 **HTTP 미들웨어**로만 `RequestContext.create(orm.em, next)`를 등록한다(`node_modules/.../@mikro-orm/nestjs/mikro-orm-core.module.js`의 `configure()`) — HTTP 요청이 없는 서비스 단위 테스트에서는 이 미들웨어가 절대 실행되지 않으므로, 주입된 `EntityManager`는 그냥 `orm.em`(전역)을 본다. 따라서 테스트가 직접 컨텍스트를 열어야 한다. MikroORM core는 `RequestContext.enter(em)`(`AsyncLocalStorage.enterWith()` 기반, 콜백 불필요)를 제공하므로 `beforeEach`/`afterEach`처럼 나뉜 훅에서도 컨텍스트가 이어진다.

**Files:**

- Create: `backend/libs/common/test-helper/transactionContext.spike.int-spec.ts`

**Interfaces:**

- Consumes: `MikroORM`, `RequestContext`, `EntityManager`(모두 `@mikro-orm/core`), `User` 엔티티(`@app/entity/domain/User.entity`), `getWorkerSchema()`(Task 3).
- Produces: 이 스파이크에서 검증한 `RequestContext.enter(em) → em.begin()` / `em.rollback()` 패턴이 Task 5 `ServiceIntTestHelper`의 구현 근거가 된다.

- [x] **Step 1: 실패(아직 존재하지 않는 동작 확인)하는 스파이크 테스트 작성**

```ts
import { EntityManager, MikroORM, RequestContext } from '@mikro-orm/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { User } from '@app/entity/domain/User.entity';
import testMikroOrmConfig from 'test-mikro-orm.config';
import { getWorkerSchema } from 'test/setup/workerContext';

describe('MikroORM 트랜잭션 컨텍스트 공유 스파이크', () => {
	let orm: MikroORM;

	beforeAll(async () => {
		orm = await MikroORM.init({
			...testMikroOrmConfig,
			schema: getWorkerSchema(),
			entities: [],
			entitiesTs: ['./libs/entity/src/domain/**/*.entity.ts'],
		});
	});

	afterAll(async () => {
		await orm.close();
	});

	it('RequestContext 안에서 만든 유저는, 같은 컨텍스트를 보는 다른 EntityManager 참조로도 조회된다', async () => {
		// given
		RequestContext.enter(orm.em);
		const em = RequestContext.getEntityManager() as EntityManager;
		await em.begin();

		// when: em을 새로 fork하지 않고, "주입받은 EntityManager"를 흉내내기 위해
		// RequestContext.getEntityManager()를 다시 호출해 같은 포크인지 확인한다.
		const user = User.create('spike-user', 'spike@example.com', 'spike-github-id');
		em.persist(user);
		await em.flush();
		const emFromContextAgain = RequestContext.getEntityManager() as EntityManager;
		const found = await emFromContextAgain.findOne(User, { githubId: 'spike-github-id' });

		// then
		expect(found?.id).toBe(user.id);

		// cleanup
		await em.rollback();
	});

	it('rollback 이후에는 같은 worker schema 안에서도 데이터가 남지 않는다', async () => {
		// given
		RequestContext.enter(orm.em);
		const em = RequestContext.getEntityManager() as EntityManager;
		await em.begin();
		const user = User.create('spike-user-2', 'spike2@example.com', 'spike-github-id-2');
		em.persist(user);
		await em.flush();
		await em.rollback();

		// when
		RequestContext.enter(orm.em);
		const freshEm = RequestContext.getEntityManager() as EntityManager;
		const found = await freshEm.findOne(User, { githubId: 'spike-github-id-2' });

		// then
		expect(found).toBeNull();
	});
});
```

- [x] **Step 2: 실행해서 검증**

Run: `cd backend && pnpm test:int`
Expected: PASS. 실패한다면(특히 `emFromContextAgain`이 `em`과 다른 트랜잭션을 보는 경우) 이 문서의 격리 전략 자체를 재검토해야 하므로 — readme.md의 예외사항대로 — Task 5로 넘어가지 말고 먼저 보고한다.

- [x] **Step 3: 커밋**

```bash
git add backend/libs/common/test-helper/transactionContext.spike.int-spec.ts
git commit -m "test: MikroORM 트랜잭션 컨텍스트 공유 스파이크 검증"
```

(이 스파이크 파일은 Task 5 완성 후에도 리그레션 가드로 남겨둔다 — 지우지 않는다.)

---

## Task 5: ServiceIntTestHelper

**Files:**

- Modify: `backend/libs/common/test-helper/createTestingModule.ts`
- Create: `backend/libs/common/test-helper/ServiceIntTestHelper.ts`
- Create: `backend/libs/common/test-helper/ServiceIntTestHelper.int-spec.ts`

**Interfaces:**

- Consumes: `createTestingModule(imports, mikroOrmOverrides?)`(수정), `getWorkerSchema()`(Task 3), `RequestContext.enter`/`em.begin`/`em.rollback`(Task 4에서 검증).
- Produces: `ServiceIntTestHelper.of(imports): Promise<ServiceIntTestHelper>`, `.getService<T>(service: Type<T>): T`, `.runInTransaction(fn): Promise<void>`, `.startTransaction(): Promise<void>`, `.rollbackTransaction(): Promise<void>`, `.moduleClose(): Promise<void>` — Task 7의 `auth.service.int-spec.ts`가 이 메서드들을 사용한다.

> **구현 중 방향 변경**: `RequestContext.enter()`(AsyncLocalStorage `enterWith`)로 연 컨텍스트가 Vitest의 `beforeEach`→`it()` 훅 경계를 넘지 못함을 실측으로 확인(Vitest 3.2.7). 원안대로 `beforeEach`에서 `startTransaction()`, `it()`에서 서비스 호출, `afterEach`에서 `rollbackTransaction()`을 나누는 구조는 동작하지 않는다. `runInTransaction(fn)`으로 시작→콜백→롤백을 하나의 `it()` 콜스택 안에서 완결시키도록 변경(Task 4 스파이크가 실제로 통과한 패턴과 동일). `beforeEach`/`afterEach`는 RequestContext를 건드리지 않는 모듈 생성/종료(`of`/`moduleClose`)만 맡는다.

> 추가로 `ServiceIntTestHelper.of(imports)`는 `imports`에 최소 하나 이상 `MikroOrmModule.forFeature([Entity])`가 있어야 한다 — `autoLoadEntities`는 forFeature로 등록된 엔티티만 모으므로, imports가 비어 있으면 "No entities found" 에러가 난다.

- [x] **Step 1: `createTestingModule.ts`에 MikroORM 옵션 오버라이드 파라미터 추가**

기존 유일한 호출부(`Auth.controller.e2e.spec.ts`)는 인자를 하나만 넘기므로 기본값 `{}`로 동작 변화 없음.

```ts
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { generatePinoLoggerModule } from '@app/logger/generatePinoLoggerModule';
import { MikroOrmModule, type MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import testMikroOrmConfig from 'test-mikro-orm.config';

export function createTestingModule(
	imports: any[],
	mikroOrmOverrides: Partial<MikroOrmModuleOptions> = {},
) {
	return Test.createTestingModule({
		imports: [
			ConfigModule.forRoot({
				load: [() => EnviromentUtil.getEnv()],
				isGlobal: true,
			}),
			generatePinoLoggerModule(),
			MikroOrmModule.forRoot({
				...testMikroOrmConfig,
				autoLoadEntities: true,
				...mikroOrmOverrides,
			}),
			...imports,
		],
	});
}
```

- [x] **Step 2: `ServiceIntTestHelper.ts` 작성**

```ts
import { EntityManager, MikroORM, RequestContext } from '@mikro-orm/core';
import type { ModuleMetadata, Type } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { getWorkerSchema } from 'test/setup/workerContext';
import { createTestingModule } from './createTestingModule';

export class ServiceIntTestHelper {
	private constructor(
		private readonly testModule: TestingModule,
		private readonly orm: MikroORM,
	) {}

	static async of(imports: ModuleMetadata['imports'] = []) {
		const testModule = await createTestingModule(imports as any[], {
			schema: getWorkerSchema(),
		}).compile();
		const orm = testModule.get(MikroORM);

		return new ServiceIntTestHelper(testModule, orm);
	}

	getService<T>(service: Type<T>): T {
		return this.testModule.get(service);
	}

	async runInTransaction(fn: () => Promise<void>): Promise<void> {
		await this.startTransaction();
		try {
			await fn();
		} finally {
			await this.rollbackTransaction();
		}
	}

	async startTransaction(): Promise<void> {
		RequestContext.enter(this.orm.em);
		const em = RequestContext.getEntityManager() as EntityManager;
		await em.begin();
	}

	async rollbackTransaction(): Promise<void> {
		const em = RequestContext.getEntityManager() as EntityManager;
		await em.rollback();
	}

	async moduleClose(): Promise<void> {
		await this.orm.close();
		await this.testModule.close();
	}
}
```

- [x] **Step 3: 헬퍼 자체를 검증하는 테스트 작성(Task 7의 축소판, 헬퍼 전용)**

```ts
import { EntityManager } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { User } from '@app/entity/domain/User.entity';
import { ServiceIntTestHelper } from './ServiceIntTestHelper';

describe('ServiceIntTestHelper', () => {
	let helper: ServiceIntTestHelper;

	beforeEach(async () => {
		helper = await ServiceIntTestHelper.of([MikroOrmModule.forFeature([User])]);
	});

	afterEach(async () => {
		await helper.moduleClose();
	});

	it('트랜잭션 롤백 후에는 저장한 엔티티가 남지 않는다', async () => {
		// given & when: 트랜잭션 안에서 저장 후 종료(runInTransaction이 자동 롤백)
		await helper.runInTransaction(async () => {
			const em = helper.getService(EntityManager);
			const user = User.create('helper-user', 'helper@example.com', 'helper-github-id');
			em.persist(user);
			await em.flush();
		});

		// then: 새 트랜잭션에서 조회하면 남아있지 않다
		await helper.runInTransaction(async () => {
			const em = helper.getService(EntityManager);
			const found = await em.findOne(User, { githubId: 'helper-github-id' });
			expect(found).toBeNull();
		});
	});
});
```

- [x] **Step 4: 실행해서 확인**

Run: `cd backend && pnpm test:int`
Expected: PASS.

- [x] **Step 5: 커밋**

```bash
git add backend/libs/common/test-helper/createTestingModule.ts backend/libs/common/test-helper/ServiceIntTestHelper.ts backend/libs/common/test-helper/ServiceIntTestHelper.int-spec.ts
git commit -m "test: ServiceIntTestHelper(트랜잭션 start/rollback) 추가"
```

---

## Task 6: BaseFactory / FactoryManager / UserFactory

**Files:**

- Create: `backend/libs/common/test-helper/factory/BaseFactory.ts`
- Create: `backend/libs/common/test-helper/factory/FactoryManager.ts`
- Create: `backend/libs/common/test-helper/factory/UserFactory.ts`
- Create: `backend/libs/common/test-helper/factory/UserFactory.spec.ts`(unit — DB 없이 EntityManager mock으로 `makeOne`/`save` 로직만 검증)

**Interfaces:**

- Consumes: `EntityManager`(`@mikro-orm/core`), `User` 엔티티.
- Produces: `FactoryManager.userFactory.save(overrides?: Partial<User>): Promise<User>` — Task 7이 사용.

- [x] **Step 1: `BaseFactory.ts` 작성**

not-null 스칼라 컬럼만 메타데이터로 기본값 채우고, relation(FK)과 primary key는 자동 채움 대상에서 제외한다(각 Factory가 명시적으로 채우거나, DB 기본값에 맡긴다).

> `em.persistAndFlush()`는 MikroORM 7에서 제거됨 — `em.persist()` + `await em.flush()`로 대체.

```ts
import { EntityManager, ReferenceKind, type EntityProperty } from '@mikro-orm/core';

export abstract class BaseFactory<T extends object> {
	protected abstract entity: new (...args: any[]) => T;

	constructor(protected readonly em: EntityManager) {}

	protected abstract makeOne(overrides?: Partial<T>): T;

	async save(overrides?: Partial<T>): Promise<T> {
		const instance = this.makeOne(overrides);
		this.em.persist(instance);
		await this.em.flush();
		return instance;
	}

	async saveMany(count: number, overrides?: Partial<T>): Promise<T[]> {
		const instances = Array.from({ length: count }, () => this.makeOne(overrides));
		this.em.persist(instances);
		await this.em.flush();
		return instances;
	}

	protected fakeColumns(): Partial<T> {
		const meta = this.em.getMetadata().get(this.entity);
		const values: Record<string, unknown> = {};

		for (const prop of meta.props) {
			if (prop.primary || prop.kind !== ReferenceKind.SCALAR || prop.nullable) {
				continue;
			}
			values[prop.name as string] = this.defaultValueFor(prop);
		}

		return values as Partial<T>;
	}

	private defaultValueFor(prop: EntityProperty): unknown {
		switch (prop.type) {
			case 'uuid':
				return crypto.randomUUID();
			case 'int':
			case 'smallint':
			case 'bigint':
				return 0;
			case 'boolean':
				return false;
			case 'datetime':
			case 'date':
			case 'time':
				return new Date();
			case 'text':
			case 'varchar':
			default:
				return `${prop.name}-fake-value`;
		}
	}
}
```

- [x] **Step 2: `UserFactory.ts` 작성**

```ts
import { User } from '@app/entity/domain/User.entity';
import { BaseFactory } from './BaseFactory';

export class UserFactory extends BaseFactory<User> {
	protected entity = User;

	protected makeOne(overrides?: Partial<User>): User {
		const user = User.create(
			overrides?.userName ?? 'test-user',
			overrides?.email ?? 'test-user@example.com',
			overrides?.githubId ?? `github-${crypto.randomUUID()}`,
		);
		return Object.assign(user, overrides);
	}
}
```

- [x] **Step 3: `FactoryManager.ts` 작성**

```ts
import type { EntityManager } from '@mikro-orm/core';
import { UserFactory } from './UserFactory';

export class FactoryManager {
	readonly userFactory: UserFactory;

	constructor(em: EntityManager) {
		this.userFactory = new UserFactory(em);
	}
}
```

- [x] **Step 4: `backend/libs/common/test-helper/factory/UserFactory.spec.ts` 작성**

> **방향 변경**: DB 붙는 integration 대신, `EntityManager`를 mock해서 `makeOne`/`save`의 순수 로직(기본값 채움, override 반영)만 검증하는 unit test로 작성 — Factory 자체는 실제 DB 저장 여부보다 "무엇을 persist에 넘기는지"가 검증 대상이라 mock으로 충분하고, DB 왕복 없이 더 빠르다. 실제 DB 연동은 `auth.service.int-spec.ts`가 `FactoryManager`를 통해 간접적으로 커버한다.

```ts
import type { EntityManager } from '@mikro-orm/core';
import { describe, expect, it, vi } from 'vitest';
import { UserFactory } from './UserFactory';

describe('UserFactory', () => {
	function createFactory() {
		const em = {
			persist: vi.fn(),
			flush: vi.fn().mockResolvedValue(undefined),
		} as unknown as EntityManager;

		return { em, factory: new UserFactory(em) };
	}

	it('override 없이 저장하면 기본값으로 채워진 유저가 저장된다', async () => {
		// given
		const { em, factory } = createFactory();

		// when
		const user = await factory.save();

		// then
		expect(user.userName).toBe('test-user');
		expect(user.email).toBe('test-user@example.com');
		expect(em.persist).toHaveBeenCalledWith(user);
		expect(em.flush).toHaveBeenCalledTimes(1);
	});

	it('githubId를 override하면 그 값으로 저장된다', async () => {
		// given
		const { factory } = createFactory();

		// when
		const user = await factory.save({ githubId: 'override-github-id' });

		// then
		expect(user.githubId).toBe('override-github-id');
	});
});
```

- [x] **Step 5: 실행해서 확인**

Run: `cd backend && pnpm test`
Expected: PASS.

- [x] **Step 6: 커밋**

```bash
git add backend/libs/common/test-helper/factory
git commit
```

---

## Task 7: 파일럿 — AuthService integration 테스트

**Files:**

- Create: `backend/apps/api/src/auth/auth.service.int-spec.ts`

**Interfaces:**

- Consumes: `ServiceIntTestHelper`(Task 5), `FactoryManager`/`UserFactory`(Task 6), `AuthModule`(기존, `backend/apps/api/src/auth/auth.module.ts`), `AuthService`(기존).

- [x] **Step 1: 실패하는 테스트 작성**

```ts
import { EntityManager } from '@mikro-orm/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FactoryManager } from 'libs/common/test-helper/factory/FactoryManager';
import { ServiceIntTestHelper } from 'libs/common/test-helper/ServiceIntTestHelper';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';

describe('AuthService.oauthLogin', () => {
	let helper: ServiceIntTestHelper;

	beforeEach(async () => {
		helper = await ServiceIntTestHelper.of([AuthModule]);
	});

	afterEach(async () => {
		await helper.moduleClose();
	});

	it('기존 유저가 없으면 새 유저를 생성해서 반환한다', async () => {
		await helper.runInTransaction(async () => {
			// given
			const authService = helper.getService(AuthService);
			// (githubId '1000'에 해당하는 유저 없음)

			// when
			const user = await authService.oauthLogin('1000', 'new-user', 'new-user@example.com');

			// then
			expect(user.githubId).toBe('1000');
			expect(user.userName).toBe('new-user');
		});
	});

	it('기존 유저가 있으면 새로 만들지 않고 그대로 반환한다', async () => {
		await helper.runInTransaction(async () => {
			// given
			const authService = helper.getService(AuthService);
			const factoryManager = new FactoryManager(helper.getService(EntityManager));
			const existing = await factoryManager.userFactory.save({ githubId: '2000' });

			// when
			const user = await authService.oauthLogin('2000', 'ignored-name', 'ignored@example.com');

			// then
			expect(user.id).toBe(existing.id);
			expect(user.userName).toBe(existing.userName);
		});
	});
});
```

- [x] **Step 2: 실행해서 실패 확인(작성 전 상태 재현용 — 이미 구현된 서비스라 사실상 통과해야 정상)**

Run: `cd backend && pnpm test:int -- auth.service.int-spec`
Expected: 만약 실패한다면 `ServiceIntTestHelper`/`FactoryManager` 배선 문제 — `libs/common/test-helper/...`는 `@app/common/*`(→ `libs/common/src/*`) 별칭 범위 밖이라 bare-path(baseUrl 기준)로 임포트해야 한다. 기존 `Auth.controller.e2e.spec.ts`가 `'libs/common/test-helper/createTestingModule'`을 같은 방식으로 쓰고 있으니 그 스타일을 그대로 따른다.

- [x] **Step 3: (구현은 이미 존재하므로 생략) — 필요 시 `AuthService`는 수정하지 않는다**

이 태스크는 기존 `AuthService`를 검증하는 통합 테스트만 추가한다. 서비스 코드 변경 없음.

- [x] **Step 4: 통과 확인**

Run: `cd backend && pnpm test:int`
Expected: 전체 integration 스위트 PASS(스파이크, 헬퍼 자체 테스트, Factory 테스트, 파일럿 테스트 전부).

- [x] **Step 5: 다중 worker 병렬 실행에서도 격리가 깨지지 않는지 확인**

Run: `cd backend && pnpm test:int` (vitest가 `maxWorkers: '50%'`로 자동 병렬 실행 — 로컬 코어 수에 따라 worker 2개 이상)
Expected: PASS. 실패(특히 유니크 제약 위반 `idx_github_id`)가 간헐적으로 나면 worker schema 격리가 새고 있다는 뜻 — Task 3의 `getWorkerSchema()`/`schema` 옵션 배선을 재점검한다.

> **실측된 별도 이슈(데이터 격리 아님)**: 연속 실행 중 `could not open relation with OID ...` / `TableExistsException`이 간헐 발생. 원인은 MikroORM `SqlSchemaGenerator`의 `getAllTables()`가 스키마 필터 없이 DB 전체를 introspect하는 라이브러리 동작 — 여러 worker가 동시에 자기 스키마를 create/drop 하는 동안, 한 worker의 introspection이 다른 worker가 그 순간 drop한 테이블의 stale OID를 잡는 레이스. unique 제약 위반은 없었음(실제 데이터 격리는 안 샘). `worker-setup.ts`의 `beforeAll`/`afterAll`에 재시도(`withRetry`, 최대 3회)를 넣어 완화 — 5연속 실행 안정 확인. worker 수가 늘어 레이스가 잦아지면 `pg_advisory_lock`으로 프로비저닝 구간을 직렬화하는 걸 고려.

- [x] **Step 6: 커밋**

```bash
git add backend/apps/api/src/auth/auth.service.int-spec.ts
git commit -m "test: AuthService.oauthLogin 파일럿 integration 테스트 추가"
```

---

## 완료 후 확인 (readme.md 완료 기준 재확인)

- [x] `pnpm test`(unit), `pnpm test:int`(integration) 로컬 통과
- [x] `pnpm test:int` 다중 worker 병렬 실행 시 데이터 격리 유지(Task 7 Step 5)
- [x] 같은 프로세스 반복 실행에도 이전 데이터 안 남음(Task 5/6/7의 각 `rollbackTransaction` 테스트로 확인됨)
- [x] MikroORM 트랜잭션 컨텍스트 공유 스파이크 통과(Task 4)
- [x] 파일럿 서비스(Auth) integration 테스트 1개 이상, Factory 픽스처 기반(Task 7)
