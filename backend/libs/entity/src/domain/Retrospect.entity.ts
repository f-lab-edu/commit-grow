import {
	Entity,
	Enum,
	ManyToOne,
	Property,
	Unique,
} from '@mikro-orm/decorators/legacy';
import { BaseTimeEntity } from '../base/BaseTime.entity';
import { RetrospectSummaryStatus } from '../enums/RetrospectSummaryStatus.enum';
import { User } from './User.entity';

@Entity({ tableName: 'retrospects' })
@Unique({
	properties: ['user', 'retrospectDate'],
	name: 'idx_retrospect_user_date',
})
export class Retrospect extends BaseTimeEntity {
	@Property({ type: 'date' })
	retrospectDate: string;

	@Enum({
		items: () => RetrospectSummaryStatus,
		default: RetrospectSummaryStatus.ANALYZING,
	})
	summaryStatus: RetrospectSummaryStatus;

	@Property({ type: 'varchar', length: 100, nullable: true })
	title?: string;

	@Property({ type: 'text', nullable: true })
	summaryText?: string;

	@Property({ type: 'text', nullable: true })
	insightText?: string;

	@Property({ type: 'datetime', nullable: true })
	analyzedAt?: Date;

	@ManyToOne(() => User, {
		nullable: false,
		fieldName: 'user_id',
	})
	user: User;

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
