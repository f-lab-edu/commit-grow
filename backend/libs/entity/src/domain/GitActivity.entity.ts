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
		comment: 'github 기준 nodeId',
	})
	githubNodeId: string;

	@Property({ type: 'varchar', length: 255, comment: '활동 요약' })
	summary: string = '';

	@Property({
		type: createCustomType(GitActivityTypeEnum),
		comment: '활동 타입 PR, COMMIT, ISSUE, CODE_REVIEW 등등',
	})
	type: GitActivityTypeEnum;

	@Property({ type: 'varchar', length: 255, comment: '레포명' })
	repoName: string = '';

	@Property({ type: 'datetime', comment: '활동 시간' })
	activityAt: Date;

	@ManyToOne(() => User, {
		fieldName: 'user_id',
	})
	user: User;

	@ManyToOne(() => Retrospect, {
		fieldName: 'retrospect_id',
	})
	retrospect: Retrospect;
}
