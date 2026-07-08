import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/SessionAuth.guard';

export function Auth() {
	return applyDecorators(
		UseGuards(SessionAuthGuard),
		ApiCookieAuth('connect.sid'),
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
