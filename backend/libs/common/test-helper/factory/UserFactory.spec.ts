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
