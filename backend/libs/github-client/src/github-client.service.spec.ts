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
