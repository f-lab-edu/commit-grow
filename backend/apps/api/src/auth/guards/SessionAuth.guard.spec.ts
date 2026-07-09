import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { Environment } from '@app/environment/schema/Environment';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionAuthGuard } from './SessionAuth.guard';

describe('SessionAuthGuard Unit Test', () => {
	let guard: SessionAuthGuard;
	const sessionCookieName: string = EnviromentUtil.getEnv().session.cookieName;

	beforeEach(() => {
		guard = new SessionAuthGuard(
			new ConfigService<Environment>(EnviromentUtil.getEnv()),
		);
	});

	function createMockContext(reqOverrides: any) {
		return {
			switchToHttp: () => ({ getRequest: () => reqOverrides }),
		} as any;
	}

	it('인증된 요청은 통과시킨다', () => {
		// given: 세션 인증이 완료된 요청
		const context = createMockContext({
			isAuthenticated: () => true,
			headers: {},
		});

		// when: Guard를 통과시킨다
		const result = guard.canActivate(context);

		// then: true를 반환하며 요청이 통과된다
		expect(result).toBe(true);
	});

	it('세션 만료시 UnauthorizedException 발생', () => {
		// given
		const context = createMockContext({
			isAuthenticated: () => false,
			headers: {
				cookie: `${sessionCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; httpOnly; SameSite=Lax`,
			},
		});

		// then
		expect(() => guard.canActivate(context)).toThrowErrorMatchingInlineSnapshot(
			`[UnauthorizedException: 세션이 만료 되었습니다. 다시 로그인 후 이용해주세요.]`,
		);
	});

	it('미인증 요청은 UnauthorizedException 발생', () => {
		// given
		const context = createMockContext({
			isAuthenticated: () => false,
			headers: {},
		});

		// then
		expect(() => guard.canActivate(context)).toThrowErrorMatchingInlineSnapshot(
			`[UnauthorizedException: 로그인이 필요한 서비스입니다. 로그인 후 이용해주세요.]`,
		);
	});
});
