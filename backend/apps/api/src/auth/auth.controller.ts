import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { GithubAuthGuard } from './guards/github-auth.guard';

@Controller('auth')
export class AuthController {
	private readonly githubCallbackUrl: string;

	constructor(
		private readonly configService: ConfigService<Environment>,
		private readonly authService: AuthService,
	) {
		this.githubCallbackUrl =
			this.configService.getOrThrow<OAuthGithubEnvironment>(
				'oauthGithub',
			).callbackURL;
	}

	@Get('github')
	@UseGuards(GithubAuthGuard)
	// biome-ignore lint/suspicious/noEmptyBlockStatements: passport 로직
	async githubLogin() {}

	@Get('github/callback')
	@UseGuards(GithubAuthGuard)
	async githubCallback(@Res() res: Response) {
		return res.redirect('/'); // 임시
	}

	// 임시 로그인 페이지 (추후 프론트로 대체)
	@Get('login')
	loginPage(@Res() res: Response) {
		res.type('html').send(`
      <!DOCTYPE html>
      <html>
        <head><title>Commit Grow - Login</title></head>
        <body style="font-family: sans-serif; text-align: center; margin-top: 100px;">
          <h1>Commit Grow</h1>
          <a href="${this.githubCallbackUrl}" style="
            display: inline-block;
            padding: 12px 24px;
            background: #24292e;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
          ">GitHub으로 로그인</a>
        </body>
      </html>
    `);
	}
}
