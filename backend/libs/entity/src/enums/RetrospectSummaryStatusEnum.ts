import { BaseEnum } from './BaseEnum';

export class RetrospectSummaryStatusEnum extends BaseEnum<RetrospectSummaryStatusEnum> {
	static readonly ANALYZING = new RetrospectSummaryStatusEnum(
		'ANALYZING',
		'분석중',
	);
	static readonly COMPLETED = new RetrospectSummaryStatusEnum(
		'COMPLETED',
		'분석완료',
	);
	static readonly FAILED = new RetrospectSummaryStatusEnum(
		'FAILED',
		'분석실패',
	);

	private constructor(value: string, label: string) {
		super(value, label);
	}
}
