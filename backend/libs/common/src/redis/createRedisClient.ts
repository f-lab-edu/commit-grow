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

	const connectStartedAt = Date.now();
	const redisClient = createClient({
		socket: {
			host: options.host,
			port: options.port,
			reconnectStrategy: (retries: number) => {
				const retryCount = retries + 1;

				if (retryCount > maxConnectRetries) {
					return new SystemException(
						`Redis 연결에 실패했습니다. ${maxConnectRetries}회 재시도(약 ${getElapsedSeconds(connectStartedAt)}초 소요) 후 연결을 중단합니다`,
					);
				}

				return Math.min(retryCount * reconnectStepMs, maxReconnectStepMs);
			},
		},
	});

	redisClient.on('error', (err) =>
		logger.error(
			err,
			`Redis 접속 실패 (약 ${getElapsedSeconds(connectStartedAt)}초 소요)`,
		),
	);
	await redisClient.connect();

	logger.log(
		`Redis 연결 성공 (약 ${getElapsedSeconds(connectStartedAt)}초 소요)`,
	);

	return redisClient;
}

function getElapsedSeconds(startTime: number): string {
	return ((Date.now() - startTime) / 1000).toFixed(1);
}
