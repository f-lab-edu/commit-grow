import {
	Entity,
	Index,
	OneToMany,
	Property,
} from '@mikro-orm/decorators/legacy';
import { BaseTimeEntity } from '../base/BaseTime.entity';
import { Retrospect } from './Retrospect.entity';

@Entity({ tableName: 'users' })
@Index({
	properties: ['githubId'],
	name: 'idx_github_id',
	options: { unique: true },
})
export class User extends BaseTimeEntity {
	@Property({ type: 'varchar', length: 100 })
	userName: string;

	@Property({ type: 'varchar', length: 100 })
	email: string;

	@Property({ type: 'varchar', length: 255 })
	githubId: string;

	@OneToMany(
		() => Retrospect,
		(retrospect) => retrospect.user,
		{ lazy: true },
	)
	retrospects: Retrospect[];

	private constructor(username: string, email: string, githubId: string) {
		super();
		this.userName = username;
		this.email = email;
		this.githubId = githubId;
	}

	static create(username: string, email: string, githubId: string) {
		return new User(username, email, githubId);
	}
}
