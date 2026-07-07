import { Entity, PrimaryKey } from '@mikro-orm/decorators/legacy';

@Entity({ abstract: true })
export class BaseEntity {
	@PrimaryKey({ type: 'uuid', defaultRaw: 'uuidv7()' })
	id: string;
}
