import { EntityManager } from '@mikro-orm/core';
import { FactoryManager } from 'libs/common/test-helper/factory/FactoryManager';
import { ServiceIntTestHelper } from 'libs/common/test-helper/ServiceIntTestHelper';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from 'vitest';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';

describe('AuthService.oauthLogin Int', () => {
	let helper: ServiceIntTestHelper;
	let authService: AuthService;
	let factoryManager: FactoryManager;

	beforeAll(async () => {
		helper = await ServiceIntTestHelper.of([AuthModule]);
		authService = helper.getService(AuthService);
		factoryManager = new FactoryManager(helper.getService(EntityManager));
	});

	afterAll(async () => {
		await helper.moduleClose();
	});

	beforeEach(async () => {
		await helper.startTransaction();
	});

	afterEach(async () => {
		await helper.rollbackTransaction();
	});

	describe('oauthLogin', () => {
		it('기존 유저가 없으면 새 유저를 생성해서 반환한다', async () => {
			// given & when
			const user = await authService.oauthLogin(
				'1000',
				'new-user',
				'new-user@example.com',
			);

			// then
			expect(user.githubId).toBe('1000');
			expect(user.userName).toBe('new-user');
		});

		it('기존 유저가 있으면 새로 만들지 않고 그대로 반환한다', async () => {
			// given
			const existing = await factoryManager.userFactory.save({
				githubId: '2000',
			});

			// when
			const user = await authService.oauthLogin(
				'2000',
				'ignored-name',
				'ignored@example.com',
			);

			// then
			expect(user.id).toBe(existing.id);
			expect(user.userName).toBe(existing.userName);
		});
	});
});
