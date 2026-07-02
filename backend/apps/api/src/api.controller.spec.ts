import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino/Logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiController } from './api.controller';

describe('ApiController', () => {
	let controller: ApiController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
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

		controller = module.get(ApiController);
	});

	it('getHello()는 "Hello World!"를 반환한다', () => {
		expect(controller.getHello()).toBe('Hello World!');
	});
});
