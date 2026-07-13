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

	it('profile.id가 없으면 에러가 발생한다.', () => {
		// given
		const dto = createTestResponse();
		delete (dto.profile as { id?: string }).id;

		// when
		const responseDto = plainToClass(GithubOauthCallbackResponseDto, dto);
		const validateErrors = validateSync(responseDto);

		// then
		expect(validateErrors).not.toHaveLength(0);
		expect(validateErrors[0].property).toBe('profile');
	});
});

function createTestResponse(
	overrides: Partial<{ accessToken: string }> = {},
) {
	return {
		accessToken: 'test-access-token',
		profile: {
			id: 'test-id',
			username: 'test-username',
			email: 'test-email',
		},
		...overrides,
	};
}
