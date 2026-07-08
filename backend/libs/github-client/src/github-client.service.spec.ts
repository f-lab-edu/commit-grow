import type { Environment } from '@app/environment/schema/Environment';
import type { ConfigService } from '@nestjs/config';
import type { Logger } from 'nestjs-pino';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubClientService } from './github-client.service';

const { mockDeleteAuthorization } = vi.hoisted(() => ({
	mockDeleteAuthorization: vi.fn(),
}));

vi.mock('octokit', () => ({
	Octokit: vi.fn().mockImplementation(() => ({
		rest: {
			apps: {
				deleteAuthorization: mockDeleteAuthorization,
			},
		},
	})),
}));

describe('GithubClientService', () => {
	let service: GithubClientService;
	let logger: {
		log: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};

	beforeAll(() => {
		logger = { log: vi.fn(), error: vi.fn() };
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should be defined', () => {
			//given
			service = createService(
				{
					clientId: 'client-id',
					clientSecret: 'client-secret',
					callbackURL: 'http://localhost/callback',
				},
				logger,
			);

			//then
			expect(service).toBeDefined();
		});
	});

	describe('revokeAccessToken', () => {
		beforeEach(() => {
			service = createService(
				{
					clientId: 'client-id',
					clientSecret: 'client-secret',
					callbackURL: 'http://localhost/callback',
				},
				logger,
			);
		});

		it('정상적으로 토큰을 무효화한다', async () => {
			// given
			mockDeleteAuthorization.mockResolvedValueOnce(undefined);

			// when
			await service.revokeAccessToken('access-token');

			// then
			expect(mockDeleteAuthorization).toHaveBeenCalledWith({
				client_id: 'client-id',
				access_token: 'access-token',
			});
		});

		it('이미 무효화된 토큰(404)이면 에러 없이 종료하고 로그만 남긴다', async () => {
			// given
			mockDeleteAuthorization.mockRejectedValueOnce({ status: 404 });

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
			const error = { status: 500 };
			mockDeleteAuthorization.mockRejectedValueOnce(error);

			// when & then
			await expect(service.revokeAccessToken('access-token')).rejects.toBe(
				error,
			);
			expect(logger.error).toHaveBeenCalledWith('토큰 무효화를 실패했습니다.', {
				error,
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
