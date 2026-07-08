// auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionDto } from '../auth/dto/SessionDto';

export const LoginSession = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): SessionDto => {
		const req = ctx.switchToHttp().getRequest();
		return req.user;
	},
);
