import {
	EntityManager,
	type EntityProperty,
	ReferenceKind,
} from '@mikro-orm/core';

export abstract class BaseFactory<T extends object> {
	protected abstract entity: new (
		...args: any[]
	) => T;

	constructor(protected readonly em: EntityManager) {}

	protected abstract makeOne(overrides?: Partial<T>): T;

	async save(overrides?: Partial<T>): Promise<T> {
		const instance = this.makeOne(overrides);
		this.em.persist(instance);
		await this.em.flush();
		return instance;
	}

	async saveMany(count: number, overrides?: Partial<T>): Promise<T[]> {
		const instances = Array.from({ length: count }, () =>
			this.makeOne(overrides),
		);
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
