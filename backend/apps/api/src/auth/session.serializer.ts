import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { SessionDto } from './dto/SessionDto';

@Injectable()
export class SessionSerializer extends PassportSerializer {
	serializeUser(sessionDto: SessionDto, done: (err: Error | null, data: unknown) => void) {
		done(null, sessionDto.toJson());
	}

	deserializeUser(payload: { userId: string; accessToken: string }, done: (err: Error | null, user: unknown) => void) {
		done(null, SessionDto.fromJson(payload));
	}
}