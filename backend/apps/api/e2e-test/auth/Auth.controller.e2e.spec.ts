import { setWebBootstrap } from '@app/common/web-bootstrap/setWebBootstrap';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { AuthModule } from 'apps/api/src/auth/auth.module';
import { SessionDto } from 'apps/api/src/auth/dto/SessionDto';
import { GithubAuthGuard } from 'apps/api/src/auth/guards/github-auth.guard';
import { createTestingModule } from 'libs/common/test-helper/createTestingModule';
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

	beforeAll(async () => {
		const builder = await createTestingModule([AuthModule])
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

		setWebBootstrap(app, EnviromentUtil.getEnv());

		await app.init();
	});

	afterAll(async () => {
		await app?.close();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /api/v1/signout', () => {
		it('인증된 사용자가 로그아웃 성공시 리다이렉트 302 반환된다.', async () => {
			//given
			const agent = request.agent(app.getHttpServer());
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
	});
});
