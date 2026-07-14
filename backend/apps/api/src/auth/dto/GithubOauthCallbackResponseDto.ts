import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Profile } from 'passport-github2';

class GithubOauthProfileDto {
	@IsString()
	@IsNotEmpty()
	public readonly id: string;

	@IsString()
	@IsNotEmpty()
	public readonly username: string;

	@IsEmail()
	@IsNotEmpty()
	public readonly email: string;

	constructor(id: string, username: string, email: string) {
		this.id = id;
		this.username = username;
		this.email = email;
	}
}

export class GithubOauthCallbackResponseDto {
	@IsString()
	@IsNotEmpty()
	accessToken: string;

	@ValidateNested()
	@Type(() => GithubOauthProfileDto)
	profile: GithubOauthProfileDto;

	constructor(accessToken: string, profile: GithubOauthProfileDto) {
		this.accessToken = accessToken;
		this.profile = profile;
	}

	static of(accessToken: string, profile: Profile) {
		return new GithubOauthCallbackResponseDto(
			accessToken,
			new GithubOauthProfileDto(
				profile.id,
				profile.username || '',
				profile?.emails?.[0]?.value || '',
			),
		);
	}
}
