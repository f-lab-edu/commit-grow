import 'reflect-metadata';
import { setWebBootstrap } from '@app/common/web-bootstrap/setWebBootstrap';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino/Logger';
import { createClient } from 'redis';
import { ApiModule } from './api.module';

const DEFAULT_PORT = 3000;

async function bootstrap() {
	const environment = EnviromentUtil.getEnv();

	const app = await NestFactory.create(ApiModule);
	const logger = app.get(Logger);

	const MAX_REDIS_CONNECT_RETRIES = 5;
	const redisClient = createClient({
		socket: {
			host: environment.redis.host,
			port: environment.redis.port,
			reconnectStrategy: (retries) =>
				retries > MAX_REDIS_CONNECT_RETRIES
					? new Error('Redis 연결 재시도 횟수를 초과했습니다')
					: Math.min(retries * 200, 2000),
		},
	});
	redisClient.on('error', (err) => logger.error(err, 'Redis client error'));
	await redisClient.connect();

	if (!environment.isEnvironment('production')) {
		const config = new DocumentBuilder()
			.setTitle('Commit Grow API')
			.setDescription('GitHub 활동 수집 및 AI 회고 플랫폼 API 문서')
			.setVersion('1.0')
			.build();
		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api-docs', app, document);
	}

	setWebBootstrap(app, environment, redisClient);

	await app.listen(environment.server.port || DEFAULT_PORT);

	logger.log(
		`API 서버 작동: ${environment.isEnvironment('local') ? `http://localhost:${environment.server.port}` : ''}`,
	);
}

bootstrap();
