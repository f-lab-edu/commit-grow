import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';

export type RawGitActivity = {
	type: GitActivityTypeEnum;
	title: string;
	repoName: string;
	githubNodeId: string;
	activityAt: Date;
};
