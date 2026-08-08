import {
	Entity,
	Enum,
	ManyToOne,
	OneToMany,
	Property,
	Unique,
} from '@mikro-orm/decorators/legacy';
import { BaseTimeEntity } from '../base/BaseTime.entity';
import { RetrospectSummaryStatus } from '../enums/RetrospectSummaryStatus.enum';
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

	@Enum({
		items: () => RetrospectSummaryStatus,
		default: RetrospectSummaryStatus.ANALYZING,
	})
	summaryStatus: RetrospectSummaryStatus;

	@Property({
		type: 'varchar',
		length: 100,
		nullable: true,
		comment: 'AI 생성 제목 (분석 완료 시, FT-08)',
	})
	title?: string;

	@Property({ type: 'text', nullable: true, comment: 'AI 요약 (분석 완료 시)' })
	summaryText?: string;

	@Property({
		type: 'text',
		nullable: true,
		comment: 'AI 인사이트 (분석 완료 시)',
	})
	insightText?: string;

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
	)
	gitActivities: GitActivity[];

	private constructor(user: User, retrospectDate: string) {
		super();
		this.user = user;
		this.retrospectDate = retrospectDate;
		this.summaryStatus = RetrospectSummaryStatus.ANALYZING;
	}

	static create(user: User, retrospectDate: string) {
		return new Retrospect(user, retrospectDate);
	}
}
