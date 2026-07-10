import { SystemException } from '@app/common/exception/SystemException';
import { createRedisClient } from '@app/common/redis/createRedisClient';
import { setWebBootstrap } from '@app/common/web-bootstrap/setWebBootstrap';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { GithubClientModule, GithubClientService } from '@app/github-client';
import { type ExecutionContext, type INestApplication } from '@nestjs/common';
import { AuthModule } from 'apps/api/src/auth/auth.module';
import { SessionDto } from 'apps/api/src/auth/dto/SessionDto';
import { GithubAuthGuard } from 'apps/api/src/auth/guards/github-auth.guard';
import { createTestingModule } from 'libs/common/test-helper/createTestingModule';
import { Logger } from 'nestjs-pino';
import { RedisClientType } from 'redis';
import request from 'supertest';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

describe('AuthController E2E Test', () => {
	let app: INestApplication;
	const mockRevokeAccessToken = vi.fn();
	let redisClient: RedisClientType;

	beforeAll(async () => {
		const builder = await createTestingModule([AuthModule])
			.overrideModule(GithubClientModule)
			.useModule({
				module: class MockGithubClientModule {},
				providers: [
					{
						provide: GithubClientService,
						useValue: {
							revokeAccessToken: mockRevokeAccessToken,
						},
					},
				],
				exports: [GithubClientService],
			})
			.overrideGuard(GithubAuthGuard)
			.useValue({
				canActivate: (context: ExecutionContext) => {
					const req = context.switchToHttp().getRequest();
					return new Promise<boolean>((resolve, reject) => {
						req.login(
							SessionDto.fromJson({
								userId: 'test-user-id',
								accessToken: 'mock-access-token',
							}),
							(err: Error | null) => {
								if (err) {
									reject(err);
									return;
								}
								resolve(true);
							},
						);
					});
				},
			})
			.compile();

		app = builder.createNestApplication();

		const environment = EnviromentUtil.getEnv();
		redisClient = await createRedisClient(environment.redis, app.get(Logger));

		setWebBootstrap(app, environment, redisClient);

		await app.init();
	});

	afterAll(async () => {
		await app?.close();
		await redisClient.quit();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /api/v1/auth/github/callback', () => {
		it('로그인 성공시 / 로 302 리다이렉트되고 세션 쿠키가 발급된다.', async () => {
			//given
			const agent = request.agent(app.getHttpServer());

			//when
			const result = await agent.get('/api/v1/auth/github/callback');

			//then
			expect(result.status).toBe(302);
			expect(result.headers.location).toBe('/');
			expect(result.headers['set-cookie']).toEqual(
				expect.arrayContaining([expect.stringContaining('connect.sid')]),
			);
		});

		it('콜백 로그인 후 인증이 필요한 엔드포인트에 접근할 수 있다.', async () => {
			//given
			const agent = request.agent(app.getHttpServer());
			mockRevokeAccessToken.mockResolvedValue(undefined);
			await agent.get('/api/v1/auth/github/callback');

			//when
			const result = await agent.get('/api/v1/auth/signout');

			//then
			expect(result.status).toBe(302);
		});
	});

	describe('GET /api/v1/signout', () => {
		it('인증된 사용자가 로그아웃 성공시 리다이렉트 302 반환된다.', async () => {
			//given
			const agent = request.agent(app.getHttpServer());
			mockRevokeAccessToken.mockResolvedValue(undefined);
			await agent.get('/api/v1/auth/github/callback');

			//when
			const logOutResult = await agent.get('/api/v1/auth/signout');
			const reTryResult = await agent.get('/api/v1/auth/signout');

			//then
			expect(logOutResult.status).toBe(302);
			expect(reTryResult.status).toBe(401);
		});

		it('인증되지 않은 사용자는 401 에러가 반환된다.', async () => {
			//given
			const agent = request.agent(app.getHttpServer());
			const result = await agent.get('/api/v1/auth/signout');

			//then
			expect(result.status).toBe(401);
		});

		it('로그아웃 처리 중 오류가 발생하면 500 에러가 반환된다.', async () => {
			//given
			const agent = request.agent(app.getHttpServer());
			mockRevokeAccessToken.mockRejectedValue(
				new SystemException('테스트용 에러'),
			);
			await agent.get('/api/v1/auth/github/callback');

			//when
			const result = await agent.get('/api/v1/auth/signout');

			//then
			expect(result.status).toBe(500);
		});
	});
});
