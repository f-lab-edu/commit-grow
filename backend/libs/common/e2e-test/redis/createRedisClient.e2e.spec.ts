import { createRedisClient } from '@app/common/redis/createRedisClient';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import type { Logger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('createRedisClient E2E Test', () => {
	const environment = EnviromentUtil.getEnv();
	const logger = {
		error: vi.fn(),
	} as unknown as Logger;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redis 연결 성공한다', async () => {
		// when
		const client = await createRedisClient(environment.redis, logger);

		// then
		expect(client.isOpen).toBe(true);
		await client.quit();
	});

	it('redis 연결 재시도 횟수를 초과하면 에러가 발생하고 재시도마다 에러를 로깅한다', async () => {
		const unValidPort = 1;
		const maxConnectRetries = 5;

		// when
		const action = () =>
			createRedisClient(
				{
					...environment.redis,
					port: unValidPort,
					maxConnectRetries,
				},
				logger,
			);

		// then
		await expect(action()).rejects.toThrowErrorMatchingInlineSnapshot(
			`[Error: Redis 연결 최대 재시도 횟수 5 를 초과했습니다]`,
		);
		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining('Redis 접속 실패'),
			expect.any(Error),
		);
	});
});
