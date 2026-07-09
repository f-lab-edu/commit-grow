import { createClient, type RedisClientType } from 'redis';
import { SystemException } from '../exception/SystemException';

const DEFAULT_MAX_REDIS_CONNECT_RETRIES = 5;

export function createRedisClient(options: {
	host: string;
	port: number;
	maxConnectRetries: number;
}): RedisClientType {
	const maxConnectRetries =
		options.maxConnectRetries || DEFAULT_MAX_REDIS_CONNECT_RETRIES;

	return createClient({
		socket: {
			host: options.host,
			port: options.port,
			reconnectStrategy: (retries) =>
				retries > maxConnectRetries
					? new SystemException(
							`Redis 연결 최대 재시도 횟수 ${maxConnectRetries} 를 초과했습니다`,
						)
					: Math.min(retries * 200, 2000),
		},
	});
}
