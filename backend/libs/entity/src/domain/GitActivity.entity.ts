import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { BaseTimeEntity } from '../base/BaseTime.entity';
import { Retrospect } from './Retrospect.entity';
import { User } from './User.entity';

export type GitActivityType =
	| 'COMMIT'
	| 'ISSUE'
	| 'PULL_REQUEST'
	| 'CODE_REVIEW';

@Entity({ tableName: 'git_activities' })
export class GitActivity extends BaseTimeEntity {
	@Property({
		type: 'varchar',
		length: 255,
		fieldName: 'git_id',
		unique: true,
		comment: 'git 기준 id',
	})
	gitId: string;

	@Property({ type: 'varchar', length: 255, comment: '활동 요약' })
	summary: string;

	@Property({
		type: 'varchar',
		length: 20,
		comment: '활동 타입 PR, Commit, Issue, CodeReview 등등',
	})
	type: GitActivityType;

	@Property({ type: 'varchar', length: 255, comment: '레포명' })
	repoName: string;

	@Property({ type: 'datetime', comment: '활동 시간' })
	activityAt: Date;

	@Property({ type: 'uuid', fieldName: 'user_id', comment: '소유자 ID' })
	userId: string;

	@Property({
		type: 'uuid',
		fieldName: 'retrospect_id',
		comment: '회고 ID',
	})
	retrospectId: string;

	@ManyToOne(() => User, {
		nullable: false,
		fieldName: 'user_id',
	})
	user: User;

	@ManyToOne(() => Retrospect, {
		nullable: false,
		fieldName: 'retrospect_id',
	})
	retrospect: Retrospect;
}
