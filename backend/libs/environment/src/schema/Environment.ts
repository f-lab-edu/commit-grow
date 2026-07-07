import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { DataBaseEnvironment } from './DataBaseEnvironment';
import { ServerEnvironment } from './ServerEnvironment';
import { OAuthGithubEnvironment } from './OAuthGithubEnvironment';

export class Environment {
	@IsString()
	@IsNotEmpty()
	environment: string;

	@ValidateNested()
	@IsNotEmpty()
	@Type(() => ServerEnvironment)
	public readonly server: ServerEnvironment;

	@ValidateNested()
	@IsNotEmpty()
	@Type(() => DataBaseEnvironment)
	public readonly database: DataBaseEnvironment;

	@ValidateNested()
	@IsNotEmpty()
	@Type(() => OAuthGithubEnvironment)
	public readonly oauthGithub: OAuthGithubEnvironment;

	get isLocalDevelopment(): boolean {
		return this.environment === 'local';
	}

	get isNotProduction(): boolean {
		return this.environment !== 'production';
	}
}
