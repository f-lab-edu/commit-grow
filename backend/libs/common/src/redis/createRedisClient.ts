import { Logger } from 'nestjs-pino';
import { createClient, type RedisClientType } from 'redis';
import { SystemException } from '../exception/SystemException';

const DEFAULT_MAX_REDIS_CONNECT_RETRIES = 5;
const DEFAULT_RECONNECT_STEP_MS = 200;
const DEFAULT_MAX_RECONNECT_STEP_MS = 2000;

export async function createRedisClient(
	options: {
		host: string;
		port: number;
		maxConnectRetries: number;
		reconnectStepMs: number;
		maxReconnectStepMs: number;
	},
	logger: Logger,
): Promise<RedisClientType> {
	const maxConnectRetries =
		options.maxConnectRetries || DEFAULT_MAX_REDIS_CONNECT_RETRIES;
	const reconnectStepMs = options.reconnectStepMs || DEFAULT_RECONNECT_STEP_MS;
	const maxReconnectStepMs =
		options.maxReconnectStepMs || DEFAULT_MAX_RECONNECT_STEP_MS;

	const redisClient = createClient({
		socket: {
			host: options.host,
			port: options.port,
			reconnectStrategy: (retries) =>
				retries > maxConnectRetries
					? new SystemException(
							`Redis 연결 최대 재시도 횟수 ${maxConnectRetries} 를 초과했습니다`,
						)
					: Math.min(retries * reconnectStepMs, maxReconnectStepMs),
		},
	});

	redisClient.on('error', (err) =>
		logger.error(`Redis 접속 실패 ${new Date().toISOString()}`, err),
	);
	await redisClient.connect();

	return redisClient;
}
