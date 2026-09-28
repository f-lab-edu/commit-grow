import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { GithubPullRequestItem } from './GithubPullRequestEventPayload.dto';

class GithubReviewItem {
	@IsString()
	@IsNotEmpty()
	readonly nodeId: string;

	constructor(nodeId: string) {
		this.nodeId = nodeId;
	}

	static of(raw: { node_id?: string }) {
		return new GithubReviewItem(raw.node_id ?? '');
	}
}

export class GithubPullRequestReviewEventPayloadDto {
	@IsString()
	@IsNotEmpty()
	readonly action: string;

	@ValidateNested()
	@Type(() => GithubPullRequestItem)
	readonly pullRequest: GithubPullRequestItem;

	@ValidateNested()
	@Type(() => GithubReviewItem)
	readonly review: GithubReviewItem;

	constructor(action: string, pullRequest: GithubPullRequestItem, review: GithubReviewItem) {
		this.action = action;
		this.pullRequest = pullRequest;
		this.review = review;
	}

	static of(raw: {
		action?: string;
		pull_request?: { node_id?: string; title?: string };
		review?: { node_id?: string };
	}) {
		return new GithubPullRequestReviewEventPayloadDto(
			raw.action ?? '',
			GithubPullRequestItem.of(raw.pull_request ?? {}),
			GithubReviewItem.of(raw.review ?? {}),
		);
	}
}
