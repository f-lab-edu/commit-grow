import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';
import type { Temporal } from '@js-temporal/polyfill';

export class GitActivityDto {
	constructor(
		readonly type: GitActivityTypeEnum,
		readonly summary: string,
		readonly repoName: string,
		readonly activityAt: Temporal.Instant,
		readonly githubNodeId: string,
	) {}
}
