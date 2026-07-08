import { IsNotEmpty, IsString } from 'class-validator';

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
}
