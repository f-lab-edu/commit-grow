import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { Environment } from './Environment';

describe('Environment Unit Test', () => {
	it('환경 설정이 전부 들어가면 에러가 발생하지 않는다.', () => {
		// given
		const env = createTestEnv();

		// when
		const environment = plainToClass(Environment, env);
		const validateErrors = validateSync(environment);

		// then
		expect(validateErrors).toHaveLength(0);
	});

	describe('environment', () => {
		it('environment가 빈 문자열이면 에러가 발생한다.', () => {
			// given
			const env = createTestEnv();
			env.environment = '';

			// when
			const environment = plainToClass(Environment, env);
			const validateErrors = validateSync(environment);

			// then
			expect(validateErrors).toHaveLength(1);
			expect(validateErrors[0].property).toBe('environment');
			expect(validateErrors[0].constraints).toBeDefined();
			expect(validateErrors[0].constraints?.isNotEmpty).toMatchInlineSnapshot(
				`"environment should not be empty"`,
			);
		});
	});

	describe('server', () => {
		it('server의 하위 값이 유효하지 않으면 에러가 발생한다.', () => {
			// given
			const env = createTestEnv();
			env.server.port = 0;

			// when
			const environment = plainToClass(Environment, env);
			const validateErrors = validateSync(environment);

			// then
			expect(validateErrors).toHaveLength(1);
			expect(validateErrors[0].property).toBe('server');
			expect(
				validateErrors[0].children?.[0]?.constraints?.min,
			).toMatchInlineSnapshot(`"port must not be less than 1"`);
		});
	});

	describe('database', () => {
		it('database의 하위 값이 유효하지 않으면 에러가 발생한다.', () => {
			// given
			const env = createTestEnv();
			env.database.host = '';

			// when
			const environment = plainToClass(Environment, env);
			const validateErrors = validateSync(environment);

			// then
			expect(validateErrors).toHaveLength(1);
			expect(validateErrors[0].property).toBe('database');
			expect(
				validateErrors[0].children?.[0]?.constraints?.isNotEmpty,
			).toMatchInlineSnapshot(`"host should not be empty"`);
		});
	});
});

function createTestEnv() {
	return {
		environment: 'local',
		server: {
			port: 3000,
		},
		database: {
			host: 'localhost',
			port: 5432,
			user: 'postgres',
			password: 'postgres',
			database: 'test',
		},
		oauthGithub: {
			clientId: 'clientId',
			clientSecret: 'clientSecret',
			callbackURL: 'callbackURL',
		},
		redis: {
			host: 'localhost',
			port: 6379,
			maxConnectRetries: 5,
			reconnectStepMs: 200,
			maxReconnectStepMs: 2000,
		},
		session: {
			secret: 'secret',
			cookieName: 'test-session',
		},
	};
}
