import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ServerEnvironment } from './ServerEnvironment';

describe('ServerEnvironment Unit Test', () => {
	it('서버 세팅이 전부 들어가면 에러가 발생하지 않는다.', () => {
		// given
		const serverEnv = createTestServerEnv();

		// when
		const serverEnvironment = plainToClass(ServerEnvironment, serverEnv);
		const validateErrors = validateSync(serverEnvironment);

		// then
		expect(validateErrors).toHaveLength(0);
	});

	describe('port', () => {
		it('port가 1 미만이면 에러가 발생한다.', () => {
			// given
			const serverEnv = createTestServerEnv();
			serverEnv.port = 0;

			// when
			const serverEnvironment = plainToClass(ServerEnvironment, serverEnv);
			const validateErrors = validateSync(serverEnvironment);

			// then
			expect(validateErrors).toHaveLength(1);
			expect(validateErrors[0].property).toBe('port');
			expect(validateErrors[0].constraints).toBeDefined();
			expect(validateErrors[0].constraints?.min).toMatchInlineSnapshot(
				`"port must not be less than 1"`,
			);
		});

		it('port가 65535 초과이면 에러가 발생한다.', () => {
			// given
			const serverEnv = createTestServerEnv();
			serverEnv.port = 65536;

			// when
			const serverEnvironment = plainToClass(ServerEnvironment, serverEnv);
			const validateErrors = validateSync(serverEnvironment);

			// then
			expect(validateErrors).toHaveLength(1);
			expect(validateErrors[0].property).toBe('port');
			expect(validateErrors[0].constraints).toBeDefined();
			expect(validateErrors[0].constraints?.max).toMatchInlineSnapshot(
				`"port must not be greater than 65535"`,
			);
		});
	});
});

function createTestServerEnv() {
	return {
		port: 3000,
	};
}
