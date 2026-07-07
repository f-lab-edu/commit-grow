import { Profile, Strategy } from "passport-github2";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Environment } from "@app/environment/schema/Environment";
import { OAuthGithubEnvironment } from "@app/environment/schema/OAuthGithubEnvironment";
import { Injectable } from "@nestjs/common";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    
    constructor(config: ConfigService<Environment>) {
        const githubConfig = config.getOrThrow<OAuthGithubEnvironment>('oauthGithub');

        super({
            clientID: githubConfig.clientId,
            clientSecret: githubConfig.clientSecret,
            callbackURL: githubConfig.callbackURL,
        });
    }
    
    validate(accessToken: string, refreshToken: string, profile: Profile, done: (err: any, user: any) => void): void {
        const { id, username, emails } = profile;

        const user = {
            id,
            username,
            emails,
            accessToken,
        };

        done(null, user);
    }
}