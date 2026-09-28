import { BaseEnum } from '@app/entity/enums/BaseEnum';

export class GithubEventType extends BaseEnum<GithubEventType> {
	static readonly PUSH = new GithubEventType('PushEvent', '커밋');

	static readonly ISSUES = new GithubEventType('IssuesEvent', '이슈');

	static readonly PULL_REQUEST = new GithubEventType('PullRequestEvent', 'PR');

	static readonly PULL_REQUEST_REVIEW = new GithubEventType(
		'PullRequestReviewEvent',
		'코드리뷰',
	);

	private constructor(name: string, label: string) {
		super(name, label);
	}
}
