import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from './Base.entity';

@Entity({ abstract: true })
export class BaseTimeEntity extends BaseEntity {
	@Property({ type: 'datetime', onCreate: () => new Date() })
	createdAt: Date;

	@Property({
		type: 'datetime',
		onCreate: () => new Date(),
		onUpdate: () => new Date(),
	})
	updatedAt: Date;

	@Property({ type: 'boolean', default: false })
	isDeleted: boolean;

	@Property({ type: 'datetime', nullable: true })
	deletedAt?: Date;
}
