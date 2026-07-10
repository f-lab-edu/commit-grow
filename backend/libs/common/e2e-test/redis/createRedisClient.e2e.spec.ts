import { createRedisClient } from '@app/common/redis/createRedisClient';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import type { Logger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('createRedisClient E2E Test', () => {
	const environment = EnviromentUtil.getEnv();
	const logger = {
		log: vi.fn(),
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
		expect(logger.log).toHaveBeenCalledWith(
			expect.stringMatching(/Redis 연결 성공 \(약 [\d.]+초 소요\)/),
		);
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
		// 실제 소요 시간(약 N초)은 실행마다 달라지므로 스냅샷 대신 정규식으로 검증한다
		await expect(action()).rejects.toThrow(
			/^Redis 연결에 실패했습니다\. 5회 재시도\(약 [\d.]+초 소요\) 후 연결을 중단합니다$/,
		);
		// 초기 연결 1회 + 재시도 maxConnectRetries회마다 error 이벤트가 발생한다
		expect(logger.error).toHaveBeenCalledTimes(maxConnectRetries + 1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.any(Error),
			expect.stringContaining('Redis 접속 실패'),
		);
	});
});
