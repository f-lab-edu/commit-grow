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
