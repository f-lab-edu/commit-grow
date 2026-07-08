import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { DataBaseEnvironment } from './DataBaseEnvironment';
import { OAuthGithubEnvironment } from './OAuthGithubEnvironment';
import { RedisEnvironment } from './RedisEnvironment';
import { ServerEnvironment } from './ServerEnvironment';
import { SessionEnvironment } from './SessionEnvironment';

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

	@ValidateNested()
	@IsNotEmpty()
	@Type(() => SessionEnvironment)
	public readonly session: SessionEnvironment;

	@ValidateNested()
	@IsNotEmpty()
	@Type(() => RedisEnvironment)
	public readonly redis: RedisEnvironment;

	isEnvironment(environment: 'local' | 'development' | 'production'): boolean {
		return this.environment === environment;
	}
}
