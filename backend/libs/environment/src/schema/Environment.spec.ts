import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { Environment } from './Environment';

function createTestEnv() {
	return {
		environment: 'local',
		frontendUrl: 'http://localhost:3001',
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
