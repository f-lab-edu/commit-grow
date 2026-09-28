import type { Environment } from '@app/environment/schema/Environment';
import { Temporal } from '@js-temporal/polyfill';
import type { ConfigService } from '@nestjs/config';
import type { Logger } from 'nestjs-pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFn } from 'vitest-mock-extended';
import { GithubClientService } from './github-client.service';

// octokit 모듈은 목킹하지 않는다. new Octokit({ request: { headers } })가
// 실제로는 헤더를 반영하지 못하는 버그가 있었는데, octokit 자체를 목킹하면
// 이런 문제를 테스트가 잡아내지 못한다. 대신 최하단 fetch만 목킹해
// Octokit의 실제 요청 조립 로직(헤더 병합 포함)을 그대로 태운다.
describe('GithubClientService', () => {
	const oauthGithubConfig = {
		clientId: 'client-id',
		clientSecret: 'client-secret',
		callbackURL: 'http://localhost/callback',
	};
	const expectedAuthorizationHeader = `Basic ${Buffer.from(
		`${oauthGithubConfig.clientId}:${oauthGithubConfig.clientSecret}`,
	).toString('base64')}`;

	let service: GithubClientService;
	let logger: {
		log: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};
	let fetchMock: ReturnType<typeof mockFn<typeof fetch>>;

	beforeEach(() => {
		logger = { log: vi.fn(), error: vi.fn() };
		fetchMock = mockFn<typeof fetch>();
		vi.stubGlobal('fetch', fetchMock);
		service = createService(oauthGithubConfig, logger);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('constructor', () => {
		it('should be defined', () => {
			//then
			expect(service).toBeDefined();
		});
	});

	describe('revokeAccessToken', () => {
		it('client_id:client_secret Basic 인증 헤더를 담아 토큰 무효화 요청을 보낸다', async () => {
			// given
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

			// when
			await service.revokeAccessToken('access-token');

			// then
			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, requestInit] = fetchMock.mock.calls[0];
			expect(url).toBe('https://api.github.com/applications/client-id/token');
			expect(requestInit?.method).toBe('DELETE');
			expect(new Headers(requestInit?.headers).get('authorization')).toBe(
				expectedAuthorizationHeader,
			);
		});

		it('이미 무효화된 토큰(404)이면 에러 없이 종료하고 로그만 남긴다', async () => {
			// given
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Not Found' }), {
					status: 404,
					headers: { 'content-type': 'application/json' },
				}),
			);

			// when
			await service.revokeAccessToken('access-token');

			// then
			expect(logger.log).toHaveBeenCalledWith(
				'이미 무효화된 토큰을 무효화 시도했습니다.',
				{ accessToken: 'access-token' },
			);
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('404가 아닌 에러는 그대로 던지고 에러 로그를 남긴다', async () => {
			// given
			// 401처럼 @octokit/plugin-retry의 doNotRetry 목록에 있는 상태 코드를 써야
			// 재시도 없이 즉시 실패한다 (500 등은 최대 3회, 최대 14초가량 재시도되어
			// 테스트가 느려지고 mockResolvedValueOnce 한 번만으로는 커버되지 않는다).
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Requires authentication' }), {
					status: 401,
					headers: { 'content-type': 'application/json' },
				}),
			);

			// when & then
			await expect(
				service.revokeAccessToken('access-token'),
			).rejects.toMatchObject({ status: 401 });
			expect(logger.error).toHaveBeenCalledWith('토큰 무효화를 실패했습니다.', {
				error: expect.objectContaining({ status: 401 }),
			});
		});
	});

	describe('getActivities', () => {
		const startedAt = Temporal.Instant.from('2026-09-28T00:00:00.000Z');
		const endedAt = Temporal.Instant.from('2026-09-29T00:00:00.000Z');

		function jsonResponse(events: unknown[]) {
			return new Response(JSON.stringify(events), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}

		// window(3페이지 동시 요청) 첫 페이지에만 이벤트를 주고, 나머지 두 페이지는
		// 빈 배열로 채워 "더 이상 데이터 없음"으로 즉시 종료되게 한다.
		function mockEventsResponse(firstPageEvents: unknown[]) {
			fetchMock.mockResolvedValueOnce(jsonResponse(firstPageEvents));
			fetchMock.mockResolvedValueOnce(jsonResponse([]));
			fetchMock.mockResolvedValueOnce(jsonResponse([]));
		}

		const OCTOCAT_REPO = { id: 1, name: 'octocat/repo', url: '' };

		function pushEvent(
			id: string,
			createdAt: string,
			commits: { sha: string; message: string }[],
		) {
			return {
				id,
				type: 'PushEvent',
				repo: OCTOCAT_REPO,
				payload: { commits },
				public: true,
				created_at: createdAt,
			};
		}

		function issuesEvent(
			id: string,
			createdAt: string | null,
			nodeId: string,
			title: string,
			action = 'opened',
		) {
			return {
				id,
				type: 'IssuesEvent',
				repo: OCTOCAT_REPO,
				payload: { action, issue: { node_id: nodeId, title } },
				public: true,
				created_at: createdAt,
			};
		}

		function pullRequestEvent(
			id: string,
			createdAt: string,
			nodeId: string,
			title: string,
			action = 'opened',
		) {
			return {
				id,
				type: 'PullRequestEvent',
				repo: OCTOCAT_REPO,
				payload: { action, pull_request: { node_id: nodeId, title } },
				public: true,
				created_at: createdAt,
			};
		}

		function pullRequestReviewEvent(
			id: string,
			createdAt: string,
			prNodeId: string,
			prTitle: string,
			reviewNodeId: string,
			action = 'created',
		) {
			return {
				id,
				type: 'PullRequestReviewEvent',
				repo: OCTOCAT_REPO,
				payload: {
					action,
					pull_request: { node_id: prNodeId, title: prTitle },
					review: { node_id: reviewNodeId },
				},
				public: true,
				created_at: createdAt,
			};
		}

		it('PushEvent의 커밋들을 커밋별 개별 COMMIT 활동으로 반환한다', async () => {
			// given
			mockEventsResponse([
				pushEvent('1', '2026-09-28T10:00:00Z', [
					{ sha: 'sha-1', message: 'feat: 커밋1' },
					{ sha: 'sha-2', message: 'fix: 커밋2' },
				]),
			]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual(
				expect.objectContaining({
					commits: [
						expect.objectContaining({
							summary: 'feat: 커밋1',
							repoName: 'octocat/repo',
							githubNodeId: 'sha-1',
							activityAt: Temporal.Instant.from('2026-09-28T10:00:00Z'),
						}),
						expect.objectContaining({
							summary: 'fix: 커밋2',
							repoName: 'octocat/repo',
							githubNodeId: 'sha-2',
							activityAt: Temporal.Instant.from('2026-09-28T10:00:00Z'),
						}),
					],
					issues: [],
					pullRequests: [],
					codeReviews: [],
				}),
			);
		});

		it('IssuesEvent(opened)를 ISSUE 활동으로 반환한다', async () => {
			// given
			mockEventsResponse([
				issuesEvent('2', '2026-09-28T11:00:00Z', 'issue-node-id', '이슈 제목'),
			]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual(
				expect.objectContaining({
					commits: [],
					issues: [
						expect.objectContaining({
							summary: '이슈 제목',
							repoName: 'octocat/repo',
							githubNodeId: 'issue-node-id',
							activityAt: Temporal.Instant.from('2026-09-28T11:00:00Z'),
						}),
					],
					pullRequests: [],
					codeReviews: [],
				}),
			);
		});

		it('PullRequestEvent(opened)를 PULL_REQUEST 활동으로 반환한다', async () => {
			// given
			mockEventsResponse([
				pullRequestEvent('3', '2026-09-28T12:00:00Z', 'pr-node-id', 'PR 제목'),
			]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual(
				expect.objectContaining({
					commits: [],
					issues: [],
					pullRequests: [
						expect.objectContaining({
							summary: 'PR 제목',
							repoName: 'octocat/repo',
							githubNodeId: 'pr-node-id',
							activityAt: Temporal.Instant.from('2026-09-28T12:00:00Z'),
						}),
					],
					codeReviews: [],
				}),
			);
		});

		it('PullRequestReviewEvent(created)를 CODE_REVIEW 활동으로 반환한다', async () => {
			// given
			mockEventsResponse([
				pullRequestReviewEvent(
					'4',
					'2026-09-28T13:00:00Z',
					'pr-node-id',
					'PR 제목',
					'review-node-id',
				),
			]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual(
				expect.objectContaining({
					commits: [],
					issues: [],
					pullRequests: [],
					codeReviews: [
						expect.objectContaining({
							summary: 'PR 제목',
							repoName: 'octocat/repo',
							githubNodeId: 'review-node-id',
							activityAt: Temporal.Instant.from('2026-09-28T13:00:00Z'),
						}),
					],
				}),
			);
		});

		it('[startedAt, endedAt) 범위 밖 이벤트와 관심 없는 이벤트 타입은 제외한다', async () => {
			// given
			mockEventsResponse([
				issuesEvent('5', '2026-09-27T23:59:59Z', 'before-range', '범위 이전'),
				issuesEvent('6', '2026-09-29T00:00:00Z', 'after-range', '범위 이후'),
				{
					id: '7',
					type: 'WatchEvent',
					repo: OCTOCAT_REPO,
					payload: {},
					public: true,
					created_at: '2026-09-28T10:00:00Z',
				},
			]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual({
				commits: [],
				issues: [],
				pullRequests: [],
				codeReviews: [],
			});
		});

		it('이벤트 최상위 필드(created_at 등)가 누락되면 검증 실패로 로그 남기고 skip한다', async () => {
			// given
			mockEventsResponse([issuesEvent('12', null, 'issue-1', '제목')]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual({
				commits: [],
				issues: [],
				pullRequests: [],
				codeReviews: [],
			});
			expect(logger.error).toHaveBeenCalledTimes(1);
		});

		it('created_at이 파싱 불가능한 형식이면 로그 남기고 skip한다', async () => {
			// given
			mockEventsResponse([
				issuesEvent('13', 'not-a-valid-date', 'issue-1', '제목'),
			]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual({
				commits: [],
				issues: [],
				pullRequests: [],
				codeReviews: [],
			});
			expect(logger.error).toHaveBeenCalledTimes(1);
		});

		it('payload 필수 필드가 누락된 이벤트는 검증 실패로 로그 남기고 skip한다', async () => {
			// given
			mockEventsResponse([
				pushEvent('8', '2026-09-28T10:00:00Z', [
					{ sha: '', message: 'no sha' },
				]),
				issuesEvent('9', '2026-09-28T10:00:00Z', 'issue-1', ''),
				pullRequestEvent('10', '2026-09-28T10:00:00Z', '', 'PR'),
				pullRequestReviewEvent('11', '2026-09-28T10:00:00Z', 'pr-1', 'PR', ''),
			]);

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result).toEqual({
				commits: [],
				issues: [],
				pullRequests: [],
				codeReviews: [],
			});
			expect(logger.error).toHaveBeenCalledTimes(4);
		});

		it('window(3페이지) 중 마지막 페이지가 비어있으면 다음 window를 요청하지 않는다', async () => {
			// given
			fetchMock.mockResolvedValueOnce(
				jsonResponse([
					issuesEvent('20', '2026-09-28T10:00:00Z', 'page1-issue', '1페이지'),
				]),
			);
			fetchMock.mockResolvedValueOnce(
				jsonResponse([
					issuesEvent('21', '2026-09-28T11:00:00Z', 'page2-issue', '2페이지'),
				]),
			);
			fetchMock.mockResolvedValueOnce(jsonResponse([])); // page 3: 데이터 소진

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(fetchMock).toHaveBeenCalledTimes(3);
			expect(result.issues).toEqual([
				expect.objectContaining({ githubNodeId: 'page1-issue' }),
				expect.objectContaining({ githubNodeId: 'page2-issue' }),
			]);
			const pageParams = fetchMock.mock.calls.map(([url]) =>
				new URL(url as string).searchParams.get('page'),
			);
			expect(pageParams).toEqual(['1', '2', '3']);
		});

		it('window(3페이지) 전부 데이터가 있고 아직 range 경계 전이면 다음 window를 요청한다', async () => {
			// given: window 1(page 1~3)은 전부 range 안, window 2의 page 4에서 range
			// 밖(오래된) 이벤트를 만나 그 즉시 종료 — window 3(page 7~9)은 요청되지 않는다.
			const validEvent = (id: string, nodeId: string) =>
				issuesEvent(id, '2026-09-28T10:00:00Z', nodeId, '제목');
			fetchMock.mockResolvedValueOnce(jsonResponse([validEvent('30', 'p1')]));
			fetchMock.mockResolvedValueOnce(jsonResponse([validEvent('31', 'p2')]));
			fetchMock.mockResolvedValueOnce(jsonResponse([validEvent('32', 'p3')]));
			fetchMock.mockResolvedValueOnce(
				jsonResponse([
					issuesEvent('33', '2026-09-27T00:00:00Z', 'before-range', '제목'),
				]),
			);
			fetchMock.mockResolvedValueOnce(jsonResponse([]));
			fetchMock.mockResolvedValueOnce(jsonResponse([]));

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(fetchMock).toHaveBeenCalledTimes(6);
			expect(result.issues).toEqual([
				expect.objectContaining({ githubNodeId: 'p1' }),
				expect.objectContaining({ githubNodeId: 'p2' }),
				expect.objectContaining({ githubNodeId: 'p3' }),
			]);
		});

		it('window 내 일부 페이지만 실패하면 로그만 남기고 성공한 페이지로 계속 진행한다', async () => {
			// given
			// 401처럼 재시도 없이 즉시 실패하는 상태코드를 써서 테스트를 빠르게 유지한다.
			fetchMock.mockResolvedValueOnce(
				jsonResponse([
					issuesEvent('40', '2026-09-28T10:00:00Z', 'ok-page', '제목'),
				]),
			);
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Requires authentication' }), {
					status: 401,
					headers: { 'content-type': 'application/json' },
				}),
			);
			fetchMock.mockResolvedValueOnce(jsonResponse([])); // page 3: 데이터 소진

			// when
			const result = await service.getActivities(
				'access-token',
				'octocat',
				startedAt,
				endedAt,
			);

			// then
			expect(result.issues).toEqual([
				expect.objectContaining({ githubNodeId: 'ok-page' }),
			]);
			expect(logger.error).toHaveBeenCalledWith(
				'GitHub 활동 페이지 조회에 실패했습니다.',
				expect.objectContaining({
					page: 2,
					error: expect.objectContaining({ status: 401 }),
				}),
			);
		});

		it('GitHub API 실패 시 에러를 그대로 전파한다', async () => {
			// given
			// window(3페이지)를 동시에 요청하므로 셋 다 실패 응답을 준비해야
			// mock되지 않은 호출로 인한 불안정성이 생기지 않는다.
			const unauthorizedResponse = () =>
				new Response(JSON.stringify({ message: 'Requires authentication' }), {
					status: 401,
					headers: { 'content-type': 'application/json' },
				});
			fetchMock.mockResolvedValueOnce(unauthorizedResponse());
			fetchMock.mockResolvedValueOnce(unauthorizedResponse());
			fetchMock.mockResolvedValueOnce(unauthorizedResponse());

			// when & then
			await expect(
				service.getActivities('access-token', 'octocat', startedAt, endedAt),
			).rejects.toMatchObject({ status: 401 });
		});
	});
});

function createService(
	oauthGithubConfig: {
		clientId: string;
		clientSecret: string;
		callbackURL: string;
	},
	logger,
) {
	const configService = {
		getOrThrow: vi.fn().mockReturnValue(oauthGithubConfig),
	} as unknown as ConfigService<Environment>;

	return new GithubClientService(configService, logger as unknown as Logger);
}
