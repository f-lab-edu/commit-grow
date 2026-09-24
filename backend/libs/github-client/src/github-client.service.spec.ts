import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';
import type { Environment } from '@app/environment/schema/Environment';
import type { ConfigService } from '@nestjs/config';
import type { Logger } from 'nestjs-pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		logger = { log: vi.fn(), error: vi.fn() };
		fetchMock = vi.fn();
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
			expect(requestInit.method).toBe('DELETE');
			expect(requestInit.headers.authorization).toBe(
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

	describe('fetchTodayGitActivities', () => {
		// search API 4개 호출은 throttling 플러그인이 GitHub search 레이트리밋(분당 30회)에 맞춰
		// 순차적으로 spacing을 두기 때문에 기본 5000ms 타임아웃을 넘길 수 있어 늘려둠
		it('로그인 사용자의 오늘 커밋/이슈/PR/리뷰를 조회해 타입별 RawGitActivity로 변환한다', async () => {
			// given
			fetchMock.mockImplementation((url: string) => {
				const decoded = decodeURIComponent(url.toString());

				if (decoded.endsWith('/user')) {
					return jsonResponse({ login: 'octocat' });
				}
				if (decoded.includes('/search/commits')) {
					return jsonResponse({
						items: [
							{
								commit: {
									message: '커밋 메시지\n본문 설명',
									author: { date: '2026-08-29T01:00:00Z' },
								},
								repository: { full_name: 'octocat/repo' },
								node_id: 'commit-node-1',
							},
						],
					});
				}
				if (decoded.includes('/search/issues')) {
					if (decoded.includes('type:issue')) {
						return jsonResponse({
							items: [
								{
									title: '이슈 제목',
									repository_url: 'https://api.github.com/repos/octocat/repo',
									node_id: 'issue-node-1',
									created_at: '2026-08-29T02:00:00Z',
								},
							],
						});
					}
					if (decoded.includes('reviewed-by:octocat')) {
						return jsonResponse({
							items: [
								{
									title: 'PR 리뷰 대상',
									repository_url: 'https://api.github.com/repos/octocat/repo',
									node_id: 'review-node-1',
									updated_at: '2026-08-29T04:00:00Z',
								},
							],
						});
					}
					if (decoded.includes('type:pr')) {
						return jsonResponse({
							items: [
								{
									title: 'PR 제목',
									repository_url: 'https://api.github.com/repos/octocat/repo',
									node_id: 'pr-node-1',
									created_at: '2026-08-29T03:00:00Z',
								},
							],
						});
					}
				}

				throw new Error(`예상하지 못한 요청입니다: ${url}`);
			});

			// when
			const result = await service.fetchTodayGitActivities('access-token');

			// then
			expect(result).toEqual([
				{
					type: GitActivityTypeEnum.COMMIT,
					title: '커밋 메시지',
					repoName: 'octocat/repo',
					githubNodeId: 'commit-node-1',
					activityAt: new Date('2026-08-29T01:00:00Z'),
				},
				{
					type: GitActivityTypeEnum.ISSUE,
					title: '이슈 제목',
					repoName: 'octocat/repo',
					githubNodeId: 'issue-node-1',
					activityAt: new Date('2026-08-29T02:00:00Z'),
				},
				{
					type: GitActivityTypeEnum.PULL_REQUEST,
					title: 'PR 제목',
					repoName: 'octocat/repo',
					githubNodeId: 'pr-node-1',
					activityAt: new Date('2026-08-29T03:00:00Z'),
				},
				{
					type: GitActivityTypeEnum.CODE_REVIEW,
					title: 'PR 리뷰 대상',
					repoName: 'octocat/repo',
					githubNodeId: 'review-node-1',
					activityAt: new Date('2026-08-29T04:00:00Z'),
				},
			]);
		}, 10000);
	});
});

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

function createService(
	oauthGithubConfig: {
		clientId: string;
		clientSecret: string;
		callbackURL: string;
	},
	logger: { log: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> },
) {
	const configService = {
		getOrThrow: vi.fn().mockReturnValue(oauthGithubConfig),
	} as unknown as ConfigService<Environment>;

	return new GithubClientService(configService, logger as unknown as Logger);
}
