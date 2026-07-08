import { User } from '@app/entity/domain/User.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionSerializer } from './session.serializer';
import { GithubStrategy } from './strategies/github.strategy';

@Module({
	imports: [MikroOrmModule.forFeature([User])],
	controllers: [AuthController],
	providers: [GithubStrategy, AuthService, SessionSerializer],
})
export class AuthModule {}
