import { User } from '@app/entity/domain/User.entity';
import { EntityManager } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServiceIntTestHelper } from './ServiceIntTestHelper';

describe('ServiceIntTestHelper', () => {
	let helper: ServiceIntTestHelper;

	beforeAll(async () => {
		helper = await ServiceIntTestHelper.of([MikroOrmModule.forFeature([User])]);
	});

	afterAll(async () => {
		await helper.moduleClose();
	});

	it('트랜잭션 롤백 후에는 저장한 엔티티가 남지 않는다', async () => {
		// given
		await helper.startTransaction();
		const em = helper.getService(EntityManager);

		// when
		const user = User.create(
			'helper-user',
			'helper@example.com',
			'helper-github-id',
		);
		em.persist(user);
		await em.flush();

		// then
		await helper.rollbackTransaction();
		const found = await em.findOne(User, { githubId: 'helper-github-id' });
		expect(found).toBeNull();
	});

	it('em.transactional()로 감싼 서비스 로직은 SAVEPOINT로 중첩되어 헬퍼 롤백이 그대로 동작한다', async () => {
		// given
		await helper.startTransaction();
		const em = helper.getService(EntityManager);

		// when
		await em.transactional(async (trxEm) => {
			const user = User.create(
				'nested-user',
				'nested@example.com',
				'nested-github-id',
			);
			trxEm.persist(user);
		});

		// then
		await helper.rollbackTransaction();
		const found = await em.findOne(User, { githubId: 'nested-github-id' });
		expect(found).toBeNull();
	});

	it('em.transactional() 안에서 에러 나면 SAVEPOINT만 롤백되고 바깥 트랜잭션은 살아있다', async () => {
		// given
		await helper.startTransaction();
		const em = helper.getService(EntityManager);

		// when
		await expect(
			em.transactional(async (trxEm) => {
				const user = User.create(
					'nested-fail',
					'nested-fail@example.com',
					'nested-fail-github-id',
				);
				trxEm.persist(user);
				await trxEm.flush();
				throw new Error('business error inside nested transactional');
			}),
		).rejects.toThrow('business error inside nested transactional');

		// then
		expect(em.isInTransaction()).toBe(true);

		// and
		const found = await em.findOne(User, { githubId: 'nested-fail-github-id' });
		expect(found).toBeNull();

		// and
		const survivor = User.create(
			'after-nested-fail',
			'survivor@example.com',
			'survivor-github-id',
		);
		em.persist(survivor);
		await em.flush();

		await helper.rollbackTransaction();
	});

	it('테스트 대상 서비스가 em.commit()을 직접 호출하면 명확한 에러를 던진다', async () => {
		// given & when: 서비스 코드가 트랜잭션을 직접 commit해버리는 상황을 흉내
		await helper.startTransaction();
		const em = helper.getService(EntityManager);
		await em.commit();

		// then
		await expect(helper.rollbackTransaction()).rejects.toThrow(
			'트랜잭션을 직접 commit/rollback',
		);
	});
});
