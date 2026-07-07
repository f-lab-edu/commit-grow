import { IsNotEmpty, IsString } from 'class-validator';

export class SessionDto {
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


	static fromJson(payload: { userId: string; accessToken: string }): SessionDto {
		return new SessionDto(payload.userId, payload.accessToken);	
	}

	toJson(): Record<string, unknown> {
		return {
			userId: this.userId,
			accessToken: this.accessToken,
		};
	}
}
