import { Profile, Strategy } from "passport-github2";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Environment } from "@app/environment/schema/Environment";
import { OAuthGithubEnvironment } from "@app/environment/schema/OAuthGithubEnvironment";
import { Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { SessionDto } from "../dto/SessionDto";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    
    constructor(config: ConfigService<Environment>, private readonly authService: AuthService) {
        const githubConfig = config.getOrThrow<OAuthGithubEnvironment>('oauthGithub');

        super({
            clientID: githubConfig.clientId,
            clientSecret: githubConfig.clientSecret,
            callbackURL: githubConfig.callbackURL,
            scope: ['user:email', 'read:user'],
        });
    }
    
    async validate(accessToken: string, refreshToken: string, profile: Profile, done: (err: any, user: any) => void): Promise<void> {
        const user = await this.authService.oauthLogin(profile.id, profile.username || '', profile.emails?.[0]?.value || '');

        done(null, new SessionDto(user.id, accessToken));
    }
}