import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class OAuthGithubEnvironment {
	@IsString()
	@IsNotEmpty()
	public readonly clientId: string;

	@IsString()
	@IsNotEmpty()
	public readonly clientSecret: string;

	@IsString()
	@IsNotEmpty()
	public readonly callbackURL: string;

	@IsNumber()
	@IsNotEmpty()
	@Min(0)
	public readonly maxRetries: number;

	@IsNumber()
	@IsNotEmpty()
	@Min(1)
	public readonly eventsPerPage: number;

	@IsNumber()
	@IsNotEmpty()
	@Min(1)
	public readonly requestTimeoutMs: number;
}
