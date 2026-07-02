import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino/Logger';
import request from 'supertest';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';
import { ApiController } from '../src/api.controller';

describe('ApiController E2E Test', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [ApiController],
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

	it('GET /api/v1 는 "Hello World!"를 반환한다', async () => {
		await request(app.getHttpServer())
			.get('/api/v1')
			.expect(200)
			.expect('Hello World!');
	});
});
