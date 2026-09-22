import { User } from '@app/entity/domain/User.entity';
import { EntityManager } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from 'apps/api/src/auth/auth.module';
import { AuthService } from 'apps/api/src/auth/auth.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ServiceIntTestHelper } from './ServiceIntTestHelper';

/**
 * DI로 주입되는 EntityManager(orm.em.fork(), useContext: false)가 beforeEach/it()/afterEach에
 * 걸쳐 동일 트랜잭션을 공유하는지 검증하는 스파이크. ServiceIntTestHelper의 구현 근거.
 */
describe('ServiceIntTestHelper 트랜잭션 컨텍스트 공유 스파이크', () => {
	let helper: ServiceIntTestHelper;

	beforeEach(async () => {
		helper = await ServiceIntTestHelper.of([
			MikroOrmModule.forFeature([User]),
			AuthModule,
		]);
		await helper.startTransaction();
	});

	afterEach(async () => {
		await helper.rollbackTransaction();
		await helper.moduleClose();
	});

	it('beforeEach에서 시작한 트랜잭션 안에서 만든 유저를, it()에서 다른 EntityManager 참조로도 조회된다', async () => {
		// given
		const em = helper.getService(EntityManager);
		const user = User.create(
			'spike-user',
			'spike@example.com',
			'spike-github-id',
		);
		em.persist(user);
		await em.flush();

		// when: "주입받은 EntityManager"를 흉내내기 위해 다시 getService로 조회
		const emFromServiceAgain = helper.getService(EntityManager);
		const found = await emFromServiceAgain.findOne(User, {
			githubId: 'spike-github-id',
		});

		// then
		expect(found?.id).toBe(user.id);
	});

	it('생성자로 EntityManager를 주입받는 실제 서비스(AuthService)도 beforeEach의 트랜잭션을 그대로 본다', async () => {
		// given & when
		const authService = helper.getService(AuthService);
		const user = await authService.oauthLogin(
			'spike-github-id-2',
			'spike-user-2',
			'spike2@example.com',
		);

		// then: helper의 em으로 바로 조회되면 같은 트랜잭션 공유 확정
		const em = helper.getService(EntityManager);
		const found = await em.findOne(User, { githubId: 'spike-github-id-2' });
		expect(found?.id).toBe(user.id);
	});

	it('afterEach의 rollback 이후에는 같은 worker schema 안에서도 데이터가 남지 않는다', async () => {
		// 이전 두 it()이 각각 beforeEach/afterEach로 감싸져 있으므로,
		// 이 시점에는 이전 테스트들이 만든 유저가 이미 롤백되어 사라져 있어야 한다
		const em = helper.getService(EntityManager);
		const found = await em.findOne(User, { githubId: 'spike-github-id' });
		expect(found).toBeNull();
	});
});
