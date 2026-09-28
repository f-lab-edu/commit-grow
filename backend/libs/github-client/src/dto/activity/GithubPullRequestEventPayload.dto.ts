import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class GithubPullRequestItem {
	@IsString()
	@IsNotEmpty()
	readonly nodeId: string;

	@IsString()
	@IsNotEmpty()
	readonly title: string;

	constructor(nodeId: string, title: string) {
		this.nodeId = nodeId;
		this.title = title;
	}

	static of(raw: { node_id?: string; title?: string }) {
		return new GithubPullRequestItem(raw.node_id ?? '', raw.title ?? '');
	}
}

export class GithubPullRequestEventPayloadDto {
	@IsString()
	@IsNotEmpty()
	readonly action: string;

	@ValidateNested()
	@Type(() => GithubPullRequestItem)
	readonly pullRequest: GithubPullRequestItem;

	constructor(action: string, pullRequest: GithubPullRequestItem) {
		this.action = action;
		this.pullRequest = pullRequest;
	}

	static of(raw: {
		action?: string;
		pull_request?: { node_id?: string; title?: string };
	}) {
		return new GithubPullRequestEventPayloadDto(
			raw.action ?? '',
			GithubPullRequestItem.of(raw.pull_request ?? {}),
		);
	}
}
