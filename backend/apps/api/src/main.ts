import 'reflect-metadata';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import {
	BadRequestException,
	type ValidationError,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino/Logger';
import { ApiModule } from './api.module';

const DEFAULT_PORT = 3000;

async function bootstrap() {
	const environment = EnviromentUtil.getEnv();

	const app = await NestFactory.create(ApiModule);

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			validationError: {
				value: true,
			},
			// TODO: 공통 API 응답 DTO 만들고 교체하기
			exceptionFactory: (_validationErrors: ValidationError[] = []) =>
				new BadRequestException(),
		}),
	);

	app.setGlobalPrefix('api');
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: '1',
	});

	await app.listen(environment.server.port || DEFAULT_PORT);

	const logger = app.get(Logger);
	logger.log(
		`API 서버 작동: ${environment.isLocalDevelopment ? `http://localhost:${environment.server.port}` : ''}`,
	);
}

bootstrap();
