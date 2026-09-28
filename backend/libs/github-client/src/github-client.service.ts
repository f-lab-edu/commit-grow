import { SystemException } from '@app/common/exception/SystemException';
import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';
import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { Temporal } from '@js-temporal/polyfill';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString, validateSync } from 'class-validator';
import { Logger } from 'nestjs-pino';
import { Octokit } from 'octokit';
import { GitActivityDto } from './GitActivity.dto';

interface GithubActivityEventPayload {
	action?: string;
	commits?: { sha: string; message: string }[];
	issue?: { node_id: string; title: string };
	pull_request?: { node_id: string; title: string };
	review?: { node_id: string };
}

@Injectable()
export class GithubClientService {
	@IsNotEmpty()
	@IsString()
	private readonly clientId: string;

	@IsNotEmpty()
	@IsString()
	private readonly clientSecret: string;

	private readonly otokit: Octokit;

	private readonly basicAuthorizationHeader: string;

	constructor(
		configService: ConfigService<Environment>,
		private readonly logger: Logger,
	) {
		const oauthGithubConfig =
			configService.getOrThrow<OAuthGithubEnvironment>('oauthGithub');
		this.clientId = oauthGithubConfig.clientId;
		this.clientSecret = oauthGithubConfig.clientSecret;
		this.basicAuthorizationHeader = `Basic ${Buffer.from(
			`${this.clientId}:${this.clientSecret}`,
		).toString('base64')}`;

		this.otokit = new Octokit();

		this.validate();
	}

	async revokeAccessToken(accessToken: string): Promise<void> {
		try {
			await this.otokit.rest.apps.deleteToken({
				client_id: this.clientId,
				access_token: accessToken,
				headers: {
					authorization: this.basicAuthorizationHeader,
				},
			});
		} catch (error) {
			if ('status' in error && error.status === 404) {
				this.logger.log('이미 무효화된 토큰을 무효화 시도했습니다.', {
					accessToken,
				});
				return;
			}

			this.logger.error('토큰 무효화를 실패했습니다.', { error });
			throw error;
		}
	}

	async getActivities(
		accessToken: string,
		username: string,
		startedAt: Temporal.Instant,
		endedAt: Temporal.Instant,
	): Promise<GitActivityDto[]> {
		const { data: events } = await this.otokit.rest.activity.listPublicEventsForUser(
			{
				username,
				headers: { authorization: `token ${accessToken}` },
			},
		);

		const activities: GitActivityDto[] = [];
		for (const event of events) {
			if (!event.created_at) {
				continue;
			}
			const activityAt = Temporal.Instant.from(event.created_at);
			if (
				Temporal.Instant.compare(activityAt, startedAt) < 0 ||
				Temporal.Instant.compare(activityAt, endedAt) >= 0
			) {
				continue;
			}

			const repoName = event.repo.name;
			const payload = event.payload as unknown as GithubActivityEventPayload;

			if (event.type === 'PushEvent') {
				for (const commit of payload.commits ?? []) {
					activities.push(
						new GitActivityDto(
							GitActivityTypeEnum.COMMIT,
							commit.message,
							repoName,
							activityAt,
							commit.sha,
						),
					);
				}
			} else if (
				event.type === 'IssuesEvent' &&
				payload.action === 'opened' &&
				payload.issue
			) {
				activities.push(
					new GitActivityDto(
						GitActivityTypeEnum.ISSUE,
						payload.issue.title,
						repoName,
						activityAt,
						payload.issue.node_id,
					),
				);
			} else if (
				event.type === 'PullRequestEvent' &&
				payload.action === 'opened' &&
				payload.pull_request
			) {
				activities.push(
					new GitActivityDto(
						GitActivityTypeEnum.PULL_REQUEST,
						payload.pull_request.title,
						repoName,
						activityAt,
						payload.pull_request.node_id,
					),
				);
			} else if (
				event.type === 'PullRequestReviewEvent' &&
				payload.action === 'created' &&
				payload.pull_request &&
				payload.review
			) {
				activities.push(
					new GitActivityDto(
						GitActivityTypeEnum.CODE_REVIEW,
						payload.pull_request.title,
						repoName,
						activityAt,
						payload.review.node_id,
					),
				);
			}
		}

		return activities;
	}

	private validate() {
		const validateErrors = validateSync(this);
		if (validateErrors.length > 0) {
			throw new SystemException(
				'github client 인스턴스 생성중 에러가 발생하였습니다.',
				validateErrors,
			);
		}
	}
}
