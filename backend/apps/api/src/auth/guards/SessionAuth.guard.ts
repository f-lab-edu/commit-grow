import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SessionAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request: Request = context.switchToHttp().getRequest();

		if (request.isAuthenticated()) {
			return true;
		}

		const cookieHeader: string = request.headers.cookie ?? '';
		const hadSessionCookie = cookieHeader.includes('connect.sid=');

		if (hadSessionCookie) {
			throw new UnauthorizedException(
				'세션이 만료 되었습니다. 다시 로그인 후 이용해주세요.',
			);
		}

		throw new UnauthorizedException(
			'로그인이 필요한 서비스입니다. 로그인 후 이용해주세요.',
		);
	}
}
