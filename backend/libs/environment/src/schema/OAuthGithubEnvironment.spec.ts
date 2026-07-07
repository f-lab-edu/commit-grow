import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { OAuthGithubEnvironment } from './OAuthGithubEnvironment';

describe('OAuthGithubEnvironment Unit Test', () => {
	it('GitHub OAuth 세팅이 전부 들어가면 에러가 발생하지 않는다.', () => {
		// given
		const githubEnv = createTestGithubEnv();

		// when
		const oauthGithubEnvironment = plainToClass(
			OAuthGithubEnvironment,
			githubEnv,
		);
		const validateErrors = validateSync(oauthGithubEnvironment);

		// then
		expect(validateErrors).toHaveLength(0);
	});
});

function createTestGithubEnv() {
	return {
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		callbackURL: 'http://callbackURL',
	};
}
