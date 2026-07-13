import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { GithubOauthCallbackResponseDto } from './GithubOauthCallbackResponseDto';

describe('GithubOauthCallbackResponseDto Unit Test', () => {
	it('accessToken과 profile 값이 전부 유효하면 에러가 발생하지 않는다.', () => {
		// given
		const dto = createTestResponse();

		// when
		const responseDto = plainToClass(GithubOauthCallbackResponseDto, dto);
		const validateErrors = validateSync(responseDto);

		// then
		expect(validateErrors).toHaveLength(0);
	});

	it('accessToken이 빈 문자열이면 에러가 발생한다.', () => {
		// given
		const dto = createTestResponse({ accessToken: '' });

		// when
		const responseDto = plainToClass(GithubOauthCallbackResponseDto, dto);
		const validateErrors = validateSync(responseDto);

		// then
		expect(validateErrors).not.toHaveLength(0);
		expect(validateErrors[0].property).toBe('accessToken');
	});

	it('profile.email이 유효하지 않으면 에러가 발생한다.', () => {
		// given
		const dto = createTestResponse();
		dto.profile.email = 'un-validated-email';

		// when
		const responseDto = plainToClass(GithubOauthCallbackResponseDto, dto);
		const validateErrors = validateSync(responseDto);

		// then
		expect(validateErrors).toHaveLength(1);
		expect(validateErrors![0].children![0].constraints).toMatchInlineSnapshot(`
			{
			  "isEmail": "email must be an email",
			}
		`);
	});
});

function createTestResponse(overrides: Partial<{ accessToken: string }> = {}) {
	return {
		accessToken: 'test-access-token',
		profile: {
			id: 'test-id',
			username: 'test-username',
			email: 'test@example.com',
		},
		...overrides,
	};
}
