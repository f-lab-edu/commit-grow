import {
	Entity,
	ManyToOne,
	OneToMany,
	Property,
	Unique,
} from '@mikro-orm/decorators/legacy';
import { BaseTimeEntity } from '../base/BaseTime.entity';
import { createCustomType } from '../base/createCustomType';
import { RetrospectSummaryStatusEnum } from '../enums/RetrospectSummaryStatusEnum';
import { GitActivity } from './GitActivity.entity';
import { User } from './User.entity';

@Entity({ tableName: 'retrospects' })
@Unique({
	properties: ['user', 'retrospectDate'],
	name: 'idx_retrospect_user_date',
})
export class Retrospect extends BaseTimeEntity {
	@Property({ type: 'date', comment: '회고 대상 일자' })
	retrospectDate: string;

	@Property({
		type: createCustomType(RetrospectSummaryStatusEnum),
		nullable: true,
		comment:
			'회고 요약 상태 (ANALYZING: 분석중, COMPLETED: 분석완료, FAILED: 분석실패)',
	})
	summaryStatus?: RetrospectSummaryStatusEnum;

	@Property({
		type: 'varchar',
		length: 100,
		comment: 'AI 생성 제목 (분석 완료 시, FT-08)',
	})
	title: string;

	@Property({ type: 'text', comment: 'AI 요약 (분석 완료 시)' })
	summaryText: string;

	@Property({
		type: 'text',
		comment: 'AI 인사이트 (분석 완료 시)',
	})
	insightText: string;

	@Property({ type: 'datetime', nullable: true, comment: '분석 완료 시각' })
	analyzedAt?: Date;

	@ManyToOne(() => User, {
		nullable: false,
		fieldName: 'user_id',
	})
	user: User;

	@OneToMany(
		() => GitActivity,
		(gitActivity) => gitActivity.retrospect,
		{ lazy: true },
	)
	gitActivities: GitActivity[];

	private constructor(user: User, retrospectDate: string) {
		super();
		this.user = user;
		this.retrospectDate = retrospectDate;
	}
}
