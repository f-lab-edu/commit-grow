import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthModule } from 'apps/api/src/auth/auth.module';
import { Logger } from 'nestjs-pino/Logger';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	vi,
} from 'vitest';

describe('AuthController E2E Test', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					load: [() => EnviromentUtil.getEnv()],
				}),
				AuthModule,
			],
			providers: [
				{
					provide: Logger,
					useValue: {
						log: vi.fn(),
						debug: vi.fn(),
						warn: vi.fn(),
						error: vi.fn(),
						fatal: vi.fn(),
						verbose: vi.fn(),
					},
				},
			],
		}).compile();

		app = moduleRef.createNestApplication();
		app.setGlobalPrefix('api');
		app.enableVersioning({
			type: VersioningType.URI,
			defaultVersion: '1',
		});
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
