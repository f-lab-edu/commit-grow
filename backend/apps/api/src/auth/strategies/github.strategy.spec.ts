import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { Logger } from 'nestjs-pino/Logger';
import { beforeAll, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { SessionDto } from '../dto/SessionDto';
import { GithubStrategy } from './github.strategy';

describe('GithubStrategy Unit Test', () => {
	describe('constructor', () => {
		it('유효한 OAuth 설정이면 생성에 성공한다.', () => {
			// given
			const config = createMockConfigService(createValidGithubConfig());
			const authService = {} as AuthService;
			const logger = createMockLogger();

			// then
			expect(
				() => new GithubStrategy(config, authService, logger),
			).not.toThrow();
		});

		it('잘못된 OAuth 설정이면 생성 시 에러가 발생한다.', () => {
			// given
			const config = createMockConfigService(
				createValidGithubConfig({ clientId: '' }),
			);
			const authService = {} as AuthService;
			const logger = createMockLogger();

			// then
			expect(
				() => new GithubStrategy(config, authService, logger),
			).toThrow();
		});
	});

	describe('validate', () => {
		let strategy: GithubStrategy;
		let done: Mock<(err: any, user: any) => void>;

		beforeAll(() => {
			strategy = new GithubStrategy(
				createMockConfigService(createValidGithubConfig()),
				{
					oauthLogin: vi.fn().mockResolvedValue({ id: 1 }),
				} as unknown as AuthService,
				createMockLogger(),
			);
			done = vi.fn();
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('callback 응답에 문제가 없는 경우, 인증을 통과한다.', async () => {
			// given
			const validateResponse = createValidateGithubResponse();

			// when
			await strategy.validate(
				validateResponse.accessToken,
				validateResponse.refreshToken,
				validateResponse.profile,
				done,
			);

			// then
			expect(done).toBeCalledWith(null, expect.any(SessionDto));
			expect(done.mock.calls[0][1].accessToken).toBe(
				validateResponse.accessToken,
			);
		});

		it('callback 응답에 문제가 있는 경우, Exception이 발생한다.', async () => {
			// given
			const response = createValidateGithubResponse();
			const unValidatedToken = '';
			response.accessToken = unValidatedToken;

			// when & then
			await expect(
				strategy.validate(
					response.accessToken,
					response.refreshToken,
					response.profile,
					done,
				),
			).rejects.toBeInstanceOf(InternalServerErrorException);
		});
	});
});

function createValidateGithubResponse() {
	const accessToken = 'test-access-token';
	const refreshToken = 'test-refresh-token';
	const profile = {
		id: 'test-id',
		username: 'test-username',
		emails: [{ value: 'test@example.com' }],
		profileUrl: 'http://github.com/test-username',
		provider: 'github',
		displayName: 'test-username',
	};

	return {
		accessToken,
		refreshToken,
		profile,
	};
}

function createValidGithubConfig(
	overrides: Partial<OAuthGithubEnvironment> = {},
): OAuthGithubEnvironment {
	return plainToInstance(OAuthGithubEnvironment, {
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		callbackURL: 'http://callbackURL',
		...overrides,
	});
}

function createMockConfigService(
	oauthGithub: OAuthGithubEnvironment,
): ConfigService<Environment> {
	return {
		getOrThrow: vi.fn().mockReturnValue(oauthGithub),
	} as unknown as ConfigService<Environment>;
}

function createMockLogger(): Logger {
	return {
		error: vi.fn(),
	} as unknown as Logger;
}
