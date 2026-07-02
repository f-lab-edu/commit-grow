import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiModule } from '../src/api.module';

describe('Api (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		app = await NestFactory.create(ApiModule, { logger: false });
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
