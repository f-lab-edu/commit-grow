import { IsNotEmpty, IsString } from 'class-validator';

export class SessionDto {
	static fromJson(payload: { userId: string; accessToken: string }): unknown {
		return new SessionDto(payload.userId, payload.accessToken);
	}
	@IsString()
	@IsNotEmpty()
	readonly userId: string;

	@IsString()
	@IsNotEmpty()
	readonly accessToken: string;

	constructor(userId: string, accessToken: string) {
		this.userId = userId;
		this.accessToken = accessToken;
	}

	toJson(): Record<string, unknown> {
		return {
			userId: this.userId,
			accessToken: this.accessToken,
		};
	}
}
