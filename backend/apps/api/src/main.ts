import 'reflect-metadata';
import { setWebBootstrap } from '@app/common/web-bootstrap/setWebBootstrap';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import Redis from 'ioredis';
import { Logger } from 'nestjs-pino/Logger';
import { ApiModule } from './api.module';

const DEFAULT_PORT = 3000;

const redisClient = new Redis({
	host: EnviromentUtil.getEnv().redis.host,
	port: EnviromentUtil.getEnv().redis.port,
});

async function bootstrap() {
	const environment = EnviromentUtil.getEnv();

	const app = await NestFactory.create(ApiModule);

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

	const logger = app.get(Logger);
	logger.log(
		`API 서버 작동: ${environment.isEnvironment('local') ? `http://localhost:${environment.server.port}` : ''}`,
	);
}

bootstrap();
