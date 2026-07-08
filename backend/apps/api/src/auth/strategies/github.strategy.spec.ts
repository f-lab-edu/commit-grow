import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { GithubStrategy } from './github.strategy';

describe('GithubStrategy Unit Test', () => {
	describe('constructor', () => {
		it('유효한 OAuth 설정이면 생성에 성공한다.', () => {
			// given
			const config = createMockConfigService(createValidGithubConfig());
			const authService = {} as AuthService;

			// then
			expect(() => new GithubStrategy(config, authService)).not.toThrow();
		});

		it('잘못된 OAuth 설정이면 생성 시 에러가 발생한다.', () => {
			// given
			const config = createMockConfigService(
				createValidGithubConfig({ clientId: '' }),
			);
			const authService = {} as AuthService;

			// then
			expect(() => new GithubStrategy(config, authService)).toThrow();
		});
	});
});

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
