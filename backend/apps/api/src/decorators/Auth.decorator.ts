import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/SessionAuth.guard';

export function Auth() {
	return applyDecorators(
		UseGuards(SessionAuthGuard),
		ApiCookieAuth(EnviromentUtil.getEnv().session.cookieName),
		ApiUnauthorizedResponse({
			description: '세션 미인증 또는 만료',
			schema: {
				example: {
					statusCode: 401,
					errorCode: 'SESSION_EXPIRED',
					message: '...',
				},
			},
		}),
	);
}
