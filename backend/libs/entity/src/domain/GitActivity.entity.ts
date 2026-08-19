import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { BaseTimeEntity } from '../base/BaseTime.entity';
import { createCustomType } from '../base/createCustomType';
import { GitActivityTypeEnum } from '../enums/GitActivityTypeEnum';
import { Retrospect } from './Retrospect.entity';
import { User } from './User.entity';

@Entity({ tableName: 'git_activities' })
export class GitActivity extends BaseTimeEntity {
	@Property({
		type: 'varchar',
		length: 255,
		unique: true,
		comment: 'git 기준 id',
	})
	gitId: string;

	@Property({ type: 'varchar', length: 255, comment: '활동 요약' })
	summary: string;

	@Property({
		type: createCustomType(GitActivityTypeEnum),
		comment: '활동 타입 PR, COMMIT, ISSUE, CODE_REVIEW 등등',
	})
	type: GitActivityTypeEnum;

	@Property({ type: 'varchar', length: 255, comment: '레포명' })
	repoName: string;

	@Property({ type: 'datetime', comment: '활동 시간' })
	activityAt: Date;

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
