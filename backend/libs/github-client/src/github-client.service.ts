import { SystemException } from '@app/common/exception/SystemException';
import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { Temporal } from '@js-temporal/polyfill';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';
import { Logger } from 'nestjs-pino';
import { Octokit } from 'octokit';
import { GitActivityDto } from './dto/activity/GitActivity.dto';
import { GithubEventResponseDto } from './dto/activity/GithubEventResponseDto';
import { GithubIssuesEventPayloadDto } from './dto/activity/GithubIssuesEventPayload.dto';
import { GithubPullRequestEventPayloadDto } from './dto/activity/GithubPullRequestEventPayload.dto';
import { GithubPullRequestReviewEventPayloadDto } from './dto/activity/GithubPullRequestReviewEventPayload.dto';
import { GithubPushEventPayloadDto } from './dto/activity/GithubPushEventPayload.dto';
import { GithubEventType } from './enum/GithubEventType';

const WINDOW_SIZE = 3;
// ponytail: 부분 실패를 허용하면 "마지막 페이지가 비었는지" 종료 신호를
// 계속 못 얻어 무한정 다음 window로 넘어갈 수 있어 반복 상한을 둔다.
const MAX_WINDOW_COUNT = 10;

type EventsPageResponse = Awaited<
	ReturnType<
		InstanceType<typeof Octokit>['rest']['activity']['listPublicEventsForUser']
	>
>;
type RawGithubEvent = EventsPageResponse['data'][number];

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

	@IsNumber()
	private readonly maxRetries: number;

	@IsNumber()
	private readonly eventsPerPage: number;

	@IsNumber()
	private readonly requestTimeoutMs: number;

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
		this.maxRetries = oauthGithubConfig.maxRetries;
		this.eventsPerPage = oauthGithubConfig.eventsPerPage;
		this.requestTimeoutMs = oauthGithubConfig.requestTimeoutMs;
		this.basicAuthorizationHeader = `Basic ${Buffer.from(
			`${this.clientId}:${this.clientSecret}`,
		).toString('base64')}`;

		this.otokit = new Octokit({ retry: { retries: this.maxRetries } });

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
		const eventDtos = await this.fetchEventDtosInRange(
			accessToken,
			username,
			startedAt,
			endedAt,
		);

		for (const eventDto of eventDtos) {
			// fetchEventDtosInRange가 type 없는 이벤트를 이미 걸러내므로 항상 존재한다.
			const eventTypeName = eventDto.type!.name;
			if (!this.isPlainObject(eventDto.payload)) {
				this.logger.error(`${eventTypeName} payload 검증에 실패했습니다.`);
				continue;
			}
			const rawPayload = eventDto.payload as GithubActivityEventPayload;

			switch (eventDto.type) {
				case GithubEventType.PUSH:
					this.handlePush(resultDto, eventDto, eventTypeName, rawPayload);
					break;

				case GithubEventType.ISSUES:
					this.handleIssues(resultDto, eventDto, eventTypeName, rawPayload);
					break;

				case GithubEventType.PULL_REQUEST:
					this.handlePullRequest(
						resultDto,
						eventDto,
						eventTypeName,
						rawPayload,
					);
					break;

				case GithubEventType.PULL_REQUEST_REVIEW:
					this.handlePullRequestReview(
						resultDto,
						eventDto,
						eventTypeName,
						rawPayload,
					);
					break;
			}
		}

		return resultDto;
	}

	private isPlainObject(value: unknown): boolean {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	private handlePush(
		resultDto: GitActivityDto,
		eventDto: GithubEventResponseDto,
		eventTypeName: string,
		payload: GithubActivityEventPayload,
	) {
		const pushPayload = GithubPushEventPayloadDto.of(payload);
		if (this.hasValidationError(pushPayload, eventTypeName)) {
			return;
		}
		resultDto.addByPushPayload(pushPayload, eventDto);
	}

	private handleIssues(
		resultDto: GitActivityDto,
		eventDto: GithubEventResponseDto,
		eventTypeName: string,
		payload: GithubActivityEventPayload,
	) {
		if (payload.action !== 'opened') {
			return;
		}
		const issuesPayload = GithubIssuesEventPayloadDto.of(payload);
		if (this.hasValidationError(issuesPayload, eventTypeName)) {
			return;
		}
		resultDto.addByIssuesPayload(issuesPayload, eventDto);
	}

	private handlePullRequest(
		resultDto: GitActivityDto,
		eventDto: GithubEventResponseDto,
		eventTypeName: string,
		payload: GithubActivityEventPayload,
	) {
		if (payload.action !== 'opened') {
			return;
		}
		const pullRequestPayload = GithubPullRequestEventPayloadDto.of(payload);
		if (this.hasValidationError(pullRequestPayload, eventTypeName)) {
			return;
		}
		resultDto.addByPullRequestPayload(pullRequestPayload, eventDto);
	}

	private handlePullRequestReview(
		resultDto: GitActivityDto,
		eventDto: GithubEventResponseDto,
		eventTypeName: string,
		payload: GithubActivityEventPayload,
	) {
		if (payload.action !== 'created') {
			return;
		}
		const reviewPayload = GithubPullRequestReviewEventPayloadDto.of(payload);
		if (this.hasValidationError(reviewPayload, eventTypeName)) {
			return;
		}
		resultDto.addByPullRequestReviewPayload(reviewPayload, eventDto);
	}

	private async fetchEventDtosInRange(
		accessToken: string,
		username: string,
		startedAt: Temporal.Instant,
		endedAt: Temporal.Instant,
	): Promise<GithubEventResponseDto[]> {
		const eventDtos: GithubEventResponseDto[] = [];

		const fetchPage = (pageNumber: number) =>
			this.otokit.rest.activity.listPublicEventsForUser({
				username,
				page: pageNumber,
				per_page: this.eventsPerPage,
				headers: { authorization: `token ${accessToken}` },
				request: { signal: AbortSignal.timeout(this.requestTimeoutMs) },
			});

		let page = 1;
		let reachedBoundary = false;

		for (
			let windowCount = 0;
			windowCount < MAX_WINDOW_COUNT && !reachedBoundary;
			windowCount++
		) {
			const pageNumbers = Array.from(
				{ length: WINDOW_SIZE },
				(_, i) => page + i,
			);
			const settledResponses = await Promise.allSettled(
				pageNumbers.map((pageNumber) => fetchPage(pageNumber)),
			);

			const fulfilledResponses = this.extractFulfilledResponses(
				settledResponses,
				pageNumbers,
			);
			const windowResult = this.collectEventsInWindow(
				fulfilledResponses,
				startedAt,
				endedAt,
			);

			eventDtos.push(...windowResult.eventDtos);
			reachedBoundary =
				windowResult.reachedBoundary || this.isLastPageEmpty(settledResponses);

			page += WINDOW_SIZE;
		}

		return eventDtos;
	}

	private extractFulfilledResponses(
		settledResponses: PromiseSettledResult<EventsPageResponse>[],
		pageNumbers: number[],
	): EventsPageResponse[] {
		const fulfilledResponses: EventsPageResponse[] = [];
		settledResponses.forEach((settled, index) => {
			if (settled.status === 'fulfilled') {
				fulfilledResponses.push(settled.value);
				return;
			}
			this.logger.error('GitHub 활동 페이지 조회에 실패했습니다.', {
				page: pageNumbers[index],
				error: settled.reason,
			});
		});

		if (fulfilledResponses.length === 0) {
			throw (settledResponses[0] as PromiseRejectedResult).reason;
		}

		return fulfilledResponses;
	}

	private isLastPageEmpty(
		settledResponses: PromiseSettledResult<EventsPageResponse>[],
	): boolean {
		const lastResult = settledResponses.at(-1);
		return (
			lastResult?.status === 'fulfilled' && lastResult.value.data.length === 0
		);
	}

	private collectEventsInWindow(
		fulfilledResponses: EventsPageResponse[],
		startedAt: Temporal.Instant,
		endedAt: Temporal.Instant,
	): { eventDtos: GithubEventResponseDto[]; reachedBoundary: boolean } {
		const eventDtos: GithubEventResponseDto[] = [];
		let reachedBoundary = false;

		for (const { data: events } of fulfilledResponses) {
			for (const rawEvent of events) {
				const parsed = this.parseEventInRange(rawEvent, startedAt, endedAt);
				if (parsed === 'boundary') {
					reachedBoundary = true;
					continue;
				}
				if (parsed) {
					eventDtos.push(parsed);
				}
			}
		}

		return { eventDtos, reachedBoundary };
	}

	private parseEventInRange(
		rawEvent: RawGithubEvent,
		startedAt: Temporal.Instant,
		endedAt: Temporal.Instant,
	): GithubEventResponseDto | 'boundary' | null {
		const eventDto = GithubEventResponseDto.of(rawEvent);
		if (!eventDto.type) {
			return null;
		}
		if (this.hasValidationError(eventDto, eventDto.type.name)) {
			return null;
		}

		let activityAt: Temporal.Instant;
		try {
			activityAt = Temporal.Instant.from(eventDto.createdAt);
		} catch (error) {
			this.logger.error('GithubEvent createdAt 파싱에 실패했습니다.', {
				createdAt: eventDto.createdAt,
				error,
			});
			return null;
		}

		if (Temporal.Instant.compare(activityAt, endedAt) >= 0) {
			return null;
		}
		if (Temporal.Instant.compare(activityAt, startedAt) < 0) {
			return 'boundary';
		}

		return eventDto;
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
