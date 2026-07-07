import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { generatePinoLoggerModule } from '@app/logger/generatePinoLoggerModule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiController } from './api.controller';
import { AuthModule } from './auth/auth.module';
import { mikroOrmConfig } from 'mikro-orm.config';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [() => EnviromentUtil.getEnv()],
		}),
		generatePinoLoggerModule(EnviromentUtil.getEnv()),
		MikroOrmModule.forRoot({ ...mikroOrmConfig, autoLoadEntities: true }),
		AuthModule,
	],
	controllers: [ApiController],
	providers: [],
})
export class ApiModule {}
