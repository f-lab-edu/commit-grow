import { GithubEventType } from '@app/github-client/enum/GithubEventType';
import { IsNotEmpty, IsString } from 'class-validator';

export class GithubEventResponseDto {
	readonly type: GithubEventType | undefined;

	@IsString()
	@IsNotEmpty()
	readonly repoName: string;

	@IsString()
	@IsNotEmpty()
	readonly createdAt: string;

	readonly payload: unknown;

	constructor(
		type: GithubEventType | undefined,
		repoName: string,
		createdAt: string,
		payload: unknown,
	) {
		this.type = type;
		this.repoName = repoName;
		this.createdAt = createdAt;
		this.payload = payload;
	}

	static of(raw: {
		type?: string | null;
		repo?: { name?: string };
		created_at?: string | null;
		payload?: unknown;
	}) {
		return new GithubEventResponseDto(
			GithubEventType.valueOfOrUndefined(raw.type ?? ''),
			raw.repo?.name ?? '',
			raw.created_at ?? '',
			raw.payload,
		);
	}
}
