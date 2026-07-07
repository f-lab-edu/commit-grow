import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { GithubStrategy } from './strategies/github.strategy';
import { AuthService } from './auth.service';

@Module({
    controllers: [AuthController],
    providers: [GithubStrategy, AuthService],
})
export class AuthModule {}
