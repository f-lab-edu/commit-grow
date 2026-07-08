import { Environment } from '@app/environment/schema/Environment';
import {
	BadRequestException,
	INestApplication,
	type ValidationError,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import Redis from 'ioredis';
import passport from 'passport';

export function setWebBootstrap(
	app: INestApplication,
	environment: Environment,
	redisClient?: Redis,
) {
	app.setGlobalPrefix('api');
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: '1',
	});

	app.use(
		session({
			store: redisClient
				? new RedisStore({ client: redisClient, prefix: 'session:' })
				: undefined,
			secret: environment.session.secret,
			resave: false,
			saveUninitialized: false,
			cookie: {
				httpOnly: true,
				secure: environment.isEnvironment('production'),
				sameSite: 'lax',
				maxAge: 1000 * 60 * 60 * 24 * 7, // 1주일
			},
		}),
	);
	app.use(passport.initialize());
	app.use(passport.session());

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
}
