import { BaseEnum } from './BaseEnum';

export class GitActivityTypeEnum extends BaseEnum<GitActivityTypeEnum> {
	static readonly COMMIT = new GitActivityTypeEnum('COMMIT', '커밋');
	static readonly ISSUE = new GitActivityTypeEnum('ISSUE', '이슈');
	static readonly PULL_REQUEST = new GitActivityTypeEnum(
		'PULL_REQUEST',
		'PR',
	);
	static readonly CODE_REVIEW = new GitActivityTypeEnum(
		'CODE_REVIEW',
		'코드리뷰',
	);

	private constructor(name: string, label: string) {
		super(name, label);
	}
}
