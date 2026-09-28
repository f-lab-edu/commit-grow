import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class GithubIssueItem {
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
		return new GithubIssueItem(raw.node_id ?? '', raw.title ?? '');
	}
}

export class GithubIssuesEventPayloadDto {
	@IsString()
	@IsNotEmpty()
	readonly action: string;

	@ValidateNested()
	@Type(() => GithubIssueItem)
	readonly issue: GithubIssueItem;

	constructor(action: string, issue: GithubIssueItem) {
		this.action = action;
		this.issue = issue;
	}

	static of(raw: { action?: string; issue?: { node_id?: string; title?: string } }) {
		return new GithubIssuesEventPayloadDto(
			raw.action ?? '',
			GithubIssueItem.of(raw.issue ?? {}),
		);
	}
}
