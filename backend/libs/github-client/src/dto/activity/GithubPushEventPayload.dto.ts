import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class GithubCommitItem {
	@IsString()
	@IsNotEmpty()
	readonly sha: string;

	@IsString()
	@IsNotEmpty()
	readonly message: string;

	constructor(sha: string, message: string) {
		this.sha = sha;
		this.message = message;
	}

	static of(raw: { sha?: string; message?: string }) {
		return new GithubCommitItem(raw.sha ?? '', raw.message ?? '');
	}
}

export class GithubPushEventPayloadDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => GithubCommitItem)
	readonly commits: GithubCommitItem[];

	constructor(commits: GithubCommitItem[]) {
		this.commits = commits;
	}

	static of(raw: {
		commits?: { sha?: string; message?: string }[] | null | undefined;
	}) {
		const commits = raw.commits;
		return new GithubPushEventPayloadDto(
			Array.isArray(commits)
				? commits.map((commit) => GithubCommitItem.of(commit))
				: ((commits ?? []) as GithubCommitItem[]),
		);
	}
}
