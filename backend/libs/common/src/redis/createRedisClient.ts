import { createClient, type RedisClientType } from 'redis';

const MAX_REDIS_CONNECT_RETRIES = 5;

export function createRedisClient(options: {
	host: string;
	port: number;
}): RedisClientType {
	return createClient({
		socket: {
			host: options.host,
			port: options.port,
			reconnectStrategy: (retries) =>
				retries > MAX_REDIS_CONNECT_RETRIES
					? new Error('Redis 연결 재시도 횟수를 초과했습니다')
					: Math.min(retries * 200, 2000),
		},
	});
}
