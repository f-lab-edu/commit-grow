import { EntityManager, MikroORM } from '@mikro-orm/core';
import {
	type ModuleMetadata,
	Logger as NestLogger,
	type Type,
} from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { getWorkerSchema } from 'test/setup/workerContext';
import { createTestingModule } from './createTestingModule';

export class ServiceIntTestHelper {
	private constructor(
		private readonly testModule: TestingModule,
		private readonly orm: MikroORM<any, any, any>,
		private readonly em: EntityManager,
		private readonly logger: Logger,
	) {}

	/**
	 * DI 컨테이너의 EntityManager 프로바이더를 `orm.em.fork()`(useContext: false)로 오버라이드한다.
	 * 이 fork는 AsyncLocalStorage를 안 거치고 자기 자신의 상태(#transactionContext)를 직접 갖고 있어서,
	 * beforeEach에서 begin()한 트랜잭션을 it()/afterEach가 그대로(별도 wrapper 없이) 이어받는다 —
	 * RequestContext.enter() 기반 방식은 AsyncLocalStorage.enterWith가 Vitest의 beforeEach→it() 훅
	 * 경계를 못 넘어서 이 패턴이 안 됐었음(실측 확인).
	 */
	static async of(imports: ModuleMetadata['imports'] = []) {
		const testModule = await createTestingModule(imports as any[], {
			schema: getWorkerSchema(),
		})
			.overrideProvider(EntityManager)
			.useFactory({ factory: (orm) => orm.em.fork(), inject: [MikroORM] })
			.compile();
		const orm = testModule.get(MikroORM);
		const em = testModule.get(EntityManager);
		const logger = testModule.get(Logger);
		NestLogger.overrideLogger(logger);

		return new ServiceIntTestHelper(testModule, orm, em, logger);
	}

	getService<T>(service: Type<T>): T {
		return this.testModule.get(service);
	}

	async startTransaction(): Promise<void> {
		await this.em.begin();
	}

	async rollbackTransaction(): Promise<void> {
		if (!this.em.isInTransaction()) {
			const message =
				'테스트 대상 서비스가 트랜잭션을 직접 commit/rollback한 것으로 보입니다. ' +
				'ServiceIntTestHelper로 감싼 서비스는 em.begin()/commit()/rollback()을 직접 호출하면 안 됩니다 — ' +
				'raw begin/commit/rollback은 MikroORM이 중첩(SAVEPOINT) 처리를 안 해서 helper의 바깥 트랜잭션을 깨버립니다. ' +
				'서비스에서 트랜잭션이 필요하면 em.transactional(cb)를 쓰세요(기본 propagation이 NESTED라 이미 열린 트랜잭션 안에서 ' +
				'자동으로 SAVEPOINT로 중첩되어 helper의 rollback이 그대로 유지됩니다). ' +
				'@Transactional() 데코레이터는 기본 propagation이 REQUIRED라 SAVEPOINT 없이 그냥 join하므로 이 목적엔 안 맞습니다 — ' +
				'꼭 써야 한다면 @Transactional({ propagation: TransactionPropagation.NESTED })로 명시하세요.';
			this.logger.error(message);
			throw new Error(message);
		}
		await this.em.rollback();
		this.em.clear();
	}

	async moduleClose(): Promise<void> {
		await this.orm.close();
		await this.testModule.close();
	}
}
