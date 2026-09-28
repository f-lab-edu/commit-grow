import { Temporal } from '@js-temporal/polyfill';
import { GithubEventResponseDto } from './GithubEventResponseDto';
import { GithubIssuesEventPayloadDto } from './GithubIssuesEventPayload.dto';
import { GithubPullRequestEventPayloadDto } from './GithubPullRequestEventPayload.dto';
import { GithubPullRequestReviewEventPayloadDto } from './GithubPullRequestReviewEventPayload.dto';
import { GithubPushEventPayloadDto } from './GithubPushEventPayload.dto';

class GitActivityDtoItem {
	constructor(
		readonly summary: string,
		readonly repoName: string,
		readonly activityAt: Temporal.Instant,
		readonly githubNodeId: string,
	) {}
}

export class GitActivityDto {
	constructor(
		readonly commits: GitActivityDtoItem[] = [],
		readonly issues: GitActivityDtoItem[] = [],
		readonly pullRequests: GitActivityDtoItem[] = [],
		readonly codeReviews: GitActivityDtoItem[] = [],
	) {}

	addByIssuesPayload(
		issuePayload: GithubIssuesEventPayloadDto,
		eventDto: GithubEventResponseDto,
	) {
		this.issues.push(
			new GitActivityDtoItem(
				issuePayload.issue.title,
				eventDto.repoName,
				Temporal.Instant.from(eventDto.createdAt),
				issuePayload.issue.nodeId,
			),
		);
	}

	addByPullRequestPayload(
		pullRequestPayload: GithubPullRequestEventPayloadDto,
		eventDto: GithubEventResponseDto,
	) {
		this.pullRequests.push(
			new GitActivityDtoItem(
				pullRequestPayload.pullRequest.title,
				eventDto.repoName,
				Temporal.Instant.from(eventDto.createdAt),
				pullRequestPayload.pullRequest.nodeId,
			),
		);
	}

	addByPullRequestReviewPayload(
		pullRequestReviewPayload: GithubPullRequestReviewEventPayloadDto,
		eventDto: GithubEventResponseDto,
	) {
		this.codeReviews.push(
			new GitActivityDtoItem(
				pullRequestReviewPayload.pullRequest.title,
				eventDto.repoName,
				Temporal.Instant.from(eventDto.createdAt),
				pullRequestReviewPayload.review.nodeId,
			),
		);
	}

	addByPushPayload(
		pushPayload: GithubPushEventPayloadDto,
		eventDto: GithubEventResponseDto,
	) {
		pushPayload.commits.forEach((commit) => {
			this.commits.push(
				new GitActivityDtoItem(
					commit.message,
					eventDto.repoName,
					Temporal.Instant.from(eventDto.createdAt),
					commit.sha,
				),
			);
		});
	}
}
