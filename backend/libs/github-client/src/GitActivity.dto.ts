import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';

export class GitActivityDto {
	constructor(
		readonly type: GitActivityTypeEnum,
		readonly summary: string,
		readonly repoName: string,
		readonly activityAt: Date,
		readonly githubNodeId: string,
	) {}
}
