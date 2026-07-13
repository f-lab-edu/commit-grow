import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { validateSync } from 'class-validator';
import { Profile, Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';
import { GithubOauthCallbackResponseDto } from '../dto/GithubOauthCallbackResponseDto';
import { SessionDto } from '../dto/SessionDto';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
	constructor(
		config: ConfigService<Environment>,
		private readonly authService: AuthService,
	) {
		const githubConfig =
			config.getOrThrow<OAuthGithubEnvironment>('oauthGithub');

		const validationErrors = validateSync(githubConfig);
		if (validationErrors.length > 0) {
			throw new Error(
				`Invalid OAuth Github Configuration validateErrors=${JSON.stringify(validationErrors)}`,
			);
		}

		super({
			clientID: githubConfig.clientId,
			clientSecret: githubConfig.clientSecret,
			callbackURL: githubConfig.callbackURL,
			scope: ['user:email', 'read:user'],
		});
	}

	async validate(
		accessToken: string,
		refreshToken: string,
		profile: Profile,
		done: (err: any, user: any) => void,
	): Promise<void> {
		const resposneDto = GithubOauthCallbackResponseDto.of(accessToken, profile);

		const validationErrors = validateSync(resposneDto);
		if (validationErrors.length > 0) {
			throw new InternalServerErrorException(
				validationErrors,
				'oauth 로그인 중 에러가 발생하였습니다. 고객센터에 문의 주세요.',
			);
		}

		const user = await this.authService.oauthLogin(
			profile.id,
			profile.username || '',
			profile.emails?.[0]?.value || '',
		);

		done(null, new SessionDto(user.id, accessToken));
	}
}
