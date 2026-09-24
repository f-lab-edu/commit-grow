import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';
import { GithubClientService, RawGitActivity } from '@app/github-client';
import { Injectable } from '@nestjs/common';
import {
	GitActivityGroupDto,
	GitActivityGroupType,
	GitActivityItemDto,
} from './dto/GitActivityGroupDto';

const DISPLAY_LIMIT = 5;

const GROUP_DEFS: {
	enumType: GitActivityTypeEnum;
	type: GitActivityGroupType;
	label: string;
	emptyLabel: string;
}[] = [
	{
		enumType: GitActivityTypeEnum.COMMIT,
		type: 'commit',
		label: 'Commit',
		emptyLabel: '오늘은 커밋이 없어요',
	},
	{
		enumType: GitActivityTypeEnum.ISSUE,
		type: 'issue',
		label: 'Issue',
		emptyLabel: '오늘은 이슈가 없어요',
	},
	{
		enumType: GitActivityTypeEnum.PULL_REQUEST,
		type: 'pr',
		label: 'PR',
		emptyLabel: '오늘은 PR이 없어요',
	},
	{
		enumType: GitActivityTypeEnum.CODE_REVIEW,
		type: 'review',
		label: '코드 리뷰',
		emptyLabel: '오늘은 남긴 리뷰가 없어요',
	},
];

@Injectable()
export class GitActivityService {
	constructor(private readonly githubClientService: GithubClientService) {}

	async getToday(accessToken: string): Promise<GitActivityGroupDto[]> {
		const activities =
			await this.githubClientService.fetchTodayGitActivities(accessToken);

		if (activities.length === 0) {
			return [];
		}

		return GROUP_DEFS.map(({ enumType, type, label, emptyLabel }) =>
			this.toGroupDto(activities, enumType, type, label, emptyLabel),
		);
	}

	private toGroupDto(
		activities: RawGitActivity[],
		enumType: GitActivityTypeEnum,
		type: GitActivityGroupType,
		label: string,
		emptyLabel: string,
	): GitActivityGroupDto {
		const groupActivities = activities.filter((a) => a.type === enumType);

		return new GitActivityGroupDto(
			type,
			label,
			groupActivities.length,
			groupActivities
				.slice(0, DISPLAY_LIMIT)
				.map((a) => new GitActivityItemDto(a.title, a.repoName)),
			Math.max(0, groupActivities.length - DISPLAY_LIMIT),
			groupActivities.length === 0 ? emptyLabel : undefined,
		);
	}
}
