import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { GithubStrategy } from './strategies/github.strategy';
import { AuthService } from './auth.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '@app/entity/domain/User.entity';
import { SessionSerializer } from './session.serializer';

@Module({
    imports: [
        MikroOrmModule.forFeature([User]),
    ],
    controllers: [AuthController],
    providers: [GithubStrategy, AuthService, SessionSerializer],
})
export class AuthModule {}
