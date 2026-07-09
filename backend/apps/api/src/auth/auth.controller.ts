import {
	Controller,
	Get,
	InternalServerErrorException,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino/Logger';
import { Auth } from '../decorators/Auth.decorator';
import { LoginSession } from '../decorators/LoginSession.decorator';
import { AuthService } from './auth.service';
import { SessionDto } from './dto/SessionDto';
import { GithubAuthGuard } from './guards/github-auth.guard';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
	) {}

	@Get('github')
	@UseGuards(GithubAuthGuard)
	// biome-ignore lint/suspicious/noEmptyBlockStatements: passport 로직
	async githubLogin() {}

	@Get('github/callback')
	@UseGuards(GithubAuthGuard)
	async githubCallback(
		@Req() req: Request,
		@Res() res: Response,
		@LoginSession() sessionDto: SessionDto,
	) {
		try {
			await runCallback((callback) => req.login(sessionDto, callback));
		} catch (error) {
			this.logger.error('GitHub 로그인 처리 중 오류가 발생했습니다.', error);
			throw new InternalServerErrorException(
				'로그인 처리 중 오류가 발생했습니다.',
			);
		}
		return res.redirect('/'); // 임시
	}

	@Get('signout')
	@Auth()
	async signout(
		@Req() req: Request,
		@Res() res: Response,
		@LoginSession() sessionDto: SessionDto,
	) {
		try {
			await this.deauthenticate(req);
			await this.destroySession(req);
			await this.authService.signout(sessionDto);
		} catch (error) {
			this.logger.error('로그아웃 처리 중 오류가 발생했습니다.', error);
			throw new InternalServerErrorException(
				'로그아웃 처리 중 오류가 발생했습니다.',
			);
		}

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
          <a href="/api/v1/auth/github" style="
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

	private async deauthenticate(req: Request) {
		await runCallback((callback) => req.logout(callback));
	}
	private async destroySession(req: Request) {
		await runCallback((callback) => req.session.destroy(callback));
	}
}

function runCallback(
	fn: (callback: (err?: Error | null) => void) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		fn((err) => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}
