import 'reflect-metadata';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import {
	BadRequestException,
	type ValidationError,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino/Logger';
import { ApiModule } from './api.module';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import passport from 'passport';
import Redis from 'ioredis';

const DEFAULT_PORT = 3000;

const redisClient = new Redis({
	host: EnviromentUtil.getEnv().redis.host,
	port: EnviromentUtil.getEnv().redis.port,
});

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

	if (environment.isNotProduction) {
		const config = new DocumentBuilder()
			.setTitle('Commit Grow API')
			.setDescription('GitHub 활동 수집 및 AI 회고 플랫폼 API 문서')
			.setVersion('1.0')
			.build();
		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api-docs', app, document);
	}

	app.setGlobalPrefix('api');
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: '1',
	});

	app.use(
		session({
		  store: new RedisStore({ client: redisClient, prefix: 'session:' }),
		  secret: environment.session.secret,
		  resave: false,
		  saveUninitialized: false,
		  cookie: {
			httpOnly: true,
			secure: environment.isProduction,
			sameSite: 'lax',
			maxAge: 1000 * 60 * 60 * 24 * 7, // 1주일
		  },
		}),
	);
	app.use(passport.initialize());
	app.use(passport.session());

	await app.listen(environment.server.port || DEFAULT_PORT);

	const logger = app.get(Logger);
	logger.log(
		`API 서버 작동: ${environment.isLocalDevelopment ? `http://localhost:${environment.server.port}` : ''}`,
	);
}

bootstrap();
