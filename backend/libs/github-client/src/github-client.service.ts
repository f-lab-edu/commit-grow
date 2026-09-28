import { SystemException } from '@app/common/exception/SystemException';
import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { Temporal } from '@js-temporal/polyfill';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString, validateSync } from 'class-validator';
import { Logger } from 'nestjs-pino';
import { Octokit } from 'octokit';
import { GitActivityDto } from './dto/activity/GitActivity.dto';
import { GithubEventResponseDto } from './dto/activity/GithubEventResponseDto';
import { GithubIssuesEventPayloadDto } from './dto/activity/GithubIssuesEventPayload.dto';
import { GithubPullRequestEventPayloadDto } from './dto/activity/GithubPullRequestEventPayload.dto';
import { GithubPullRequestReviewEventPayloadDto } from './dto/activity/GithubPullRequestReviewEventPayload.dto';
import { GithubPushEventPayloadDto } from './dto/activity/GithubPushEventPayload.dto';
import { GithubEventType } from './enum/GithubEventType';

interface GithubActivityEventPayload {
	action?: string;
	commits?: { sha?: string; message?: string }[];
	issue?: { node_id?: string; title?: string };
	pull_request?: { node_id?: string; title?: string };
	review?: { node_id?: string };
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
	): Promise<GitActivityDto> {
		const resultDto = new GitActivityDto();
		const { data: events } =
			await this.otokit.rest.activity.listPublicEventsForUser({
				username,
				headers: { authorization: `token ${accessToken}` },
			});

		const eventDtos: GithubEventResponseDto[] = events
			.map((rawEvent) => {
				const eventDto = GithubEventResponseDto.of(rawEvent);
				if (!eventDto.type) {
					return null;
				}
				if (this.hasValidationError(eventDto, eventDto.type.name)) {
					return null;
				}
				const activityAt = Temporal.Instant.from(eventDto.createdAt);
				if (
					Temporal.Instant.compare(activityAt, startedAt) < 0 ||
					Temporal.Instant.compare(activityAt, endedAt) >= 0
				) {
					return null;
				}

				return eventDto;
			})
			.filter(
				(v: GithubEventResponseDto | null): v is GithubEventResponseDto =>
					v !== null,
			);

		for (const eventDto of eventDtos) {
			const rawPayload =
				eventDto.payload as unknown as GithubActivityEventPayload;

			if (eventDto.type === GithubEventType.PUSH) {
				const pushPayload = GithubPushEventPayloadDto.of(rawPayload);
				if (this.hasValidationError(pushPayload, eventDto.type.name)) {
					continue;
				}
				resultDto.addByPushPayload(pushPayload, eventDto);
			}

			if (
				eventDto.type === GithubEventType.ISSUES &&
				rawPayload.action === 'opened'
			) {
				const issuesPayload = GithubIssuesEventPayloadDto.of(rawPayload);
				if (this.hasValidationError(issuesPayload, eventDto.type.name)) {
					continue;
				}
				resultDto.addByIssuesPayload(issuesPayload, eventDto);
			}

			if (
				eventDto.type === GithubEventType.PULL_REQUEST &&
				rawPayload.action === 'opened'
			) {
				const pullRequestPayload =
					GithubPullRequestEventPayloadDto.of(rawPayload);
				if (this.hasValidationError(pullRequestPayload, eventDto.type.name)) {
					continue;
				}
				resultDto.addByPullRequestPayload(pullRequestPayload, eventDto);
			}

			if (
				eventDto.type === GithubEventType.PULL_REQUEST_REVIEW &&
				rawPayload.action === 'created'
			) {
				const reviewPayload =
					GithubPullRequestReviewEventPayloadDto.of(rawPayload);
				if (this.hasValidationError(reviewPayload, eventDto.type.name)) {
					continue;
				}
				resultDto.addByPullRequestReviewPayload(reviewPayload, eventDto);
			}
		}

		return resultDto;
	}

	private hasValidationError(payload: object, eventType: string): boolean {
		const validationErrors = validateSync(payload);
		if (validationErrors.length > 0) {
			this.logger.error(`${eventType} payload 검증에 실패했습니다.`, {
				validationErrors,
			});
			return true;
		}
		return false;
	}

	private validate() {
		const validateErrors = validateSync(this);
		if (validateErrors.length > 0) {
			throw new SystemException(
				'github client 인스턴스 생성중 에러가 발생하였습니다.',
				'github client 인스턴스 생성중 에러가 발생하였습니다.',
				{ validateErrors },
			);
		}
	}
}
