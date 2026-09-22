import type { EntityManager } from '@mikro-orm/core';
import { UserFactory } from './UserFactory';

export class FactoryManager {
	readonly userFactory: UserFactory;

	constructor(em: EntityManager) {
		this.userFactory = new UserFactory(em);
	}
}
