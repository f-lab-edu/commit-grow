import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { DataBaseEnvironment } from './DataBaseEnvironment';

describe('DataBaseEnvironment Unit Test', () => {
	it('데이터 베이스 세팅이 전부 들어가면 에러가 발생하지 않는다.', () => {
		// given
		const dbEnv = createTestDBEnv();

		// when
		const dbEnvironment = plainToClass(DataBaseEnvironment, dbEnv);
		const validateErrors = validateSync(dbEnvironment);

		// then
		expect(validateErrors).toHaveLength(0);
	});

	describe('port', () => {
		it('port가 1 미만이면 에러가 발생한다.', () => {
			// given
			const dbEnv = createTestDBEnv();
			dbEnv.port = 0;

			// when
			const dbEnvironment = plainToClass(DataBaseEnvironment, dbEnv);
			const validateErrors = validateSync(dbEnvironment);

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
			const dbEnv = createTestDBEnv();
			dbEnv.port = 65536;

			// when
			const dbEnvironment = plainToClass(DataBaseEnvironment, dbEnv);
			const validateErrors = validateSync(dbEnvironment);

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

function createTestDBEnv() {
	return {
		host: 'localhost',
		user: 'user',
		port: 5432,
		username: 'postgres',
		password: 'postgres',
		database: 'test',
	};
}
