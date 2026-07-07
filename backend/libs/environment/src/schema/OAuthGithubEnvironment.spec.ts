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

	describe('clientId', () => {
		it('clientId가 빈 문자열이면 에러가 발생한다.', () => {
			// given
			const githubEnv = createTestGithubEnv();
			githubEnv.clientId = '';

			// when
			const oauthGithubEnvironment = plainToClass(
				OAuthGithubEnvironment,
				githubEnv,
			);
			const validateErrors = validateSync(oauthGithubEnvironment);

			// then
			expect(validateErrors).toHaveLength(1);
			expect(validateErrors[0].property).toBe('clientId');
			expect(validateErrors[0].constraints).toBeDefined();
			expect(validateErrors[0].constraints?.isNotEmpty).toMatchInlineSnapshot(
				`"clientId should not be empty"`,
			);
		});
	});

	describe('clientSecret', () => {
		it('clientSecret이 빈 문자열이면 에러가 발생한다.', () => {
			// given
			const githubEnv = createTestGithubEnv();
			githubEnv.clientSecret = '';

			// when
			const oauthGithubEnvironment = plainToClass(
				OAuthGithubEnvironment,
				githubEnv,
			);
			const validateErrors = validateSync(oauthGithubEnvironment);

			// then
			expect(validateErrors).toHaveLength(1);
			expect(validateErrors[0].property).toBe('clientSecret');
			expect(validateErrors[0].constraints).toBeDefined();
			expect(validateErrors[0].constraints?.isNotEmpty).toMatchInlineSnapshot(
				`"clientSecret should not be empty"`,
			);
		});
	});
});

function createTestGithubEnv() {
	return {
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
	};
}
