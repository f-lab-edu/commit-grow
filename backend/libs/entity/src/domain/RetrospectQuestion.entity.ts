import {
	Entity,
	ManyToOne,
	Property,
	Unique,
} from '@mikro-orm/decorators/legacy';
import { BaseTimeEntity } from '../base/BaseTime.entity';
import { Retrospect } from './Retrospect.entity';

@Entity({ tableName: 'retrospect_questions' })
@Unique({
	name: 'uk_retrospect_question_retrospect_question_order',
	properties: ['retrospect', 'questionOrder'],
})
export class RetrospectQuestion extends BaseTimeEntity {
	@Property({ type: 'text', comment: 'AI가 생성한 질문' })
	questionText: string;

	@Property({ type: 'text', comment: '사용자 답변 원문' })
	answerText: string;

	@Property({ type: 'int', comment: '질문 순서 (1~3)' })
	questionOrder: number;

	@ManyToOne(() => Retrospect, {
		fieldName: 'retrospect_id',
	})
	retrospect: Retrospect;
}
