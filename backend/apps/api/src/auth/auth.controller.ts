import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { GithubAuthGuard } from "./guards/github-auth.guard";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config/dist/config.service";
import { Environment } from "@app/environment/schema/Environment";
import { OAuthGithubEnvironment } from "@app/environment/schema/OAuthGithubEnvironment";

@Controller('auth')
export class AuthController {
    private readonly githubCallbackUrl: string;

    constructor(private readonly configService: ConfigService<Environment>) {
        this.githubCallbackUrl = this.configService.getOrThrow<OAuthGithubEnvironment>('oauthGithub').callbackURL;
    }
	
    @Get('github')
	@UseGuards(GithubAuthGuard)
	async githubLogin() {}

    @Get('github/callback')
    @UseGuards(GithubAuthGuard)
    async githubCallback(@Req() req: Request, @Res() res: Response) {
    //   const { githubId, username, email, accessToken } = req.user;
  
      // TODO 3단계: 세션 생성 로직으로 대체
      // - 유저 upsert (MikroORM)
      // - Redis에 세션 저장 (accessToken 포함, TTL 1주일)
      // - 세션ID를 httpOnly 쿠키로 res에 심기
      // - 프론트 리다이렉트
  
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