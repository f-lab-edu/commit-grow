import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { generatePinoLoggerModule } from '@app/logger/generatePinoLoggerModule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import mikroOrmConfig from '../../../mikro-orm.config';
import { ApiController } from './api.controller';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [() => EnviromentUtil.getEnv()],
		}),
		generatePinoLoggerModule(EnviromentUtil.getEnv()),
		MikroOrmModule.forRoot(mikroOrmConfig),
	],
	controllers: [ApiController],
	providers: [],
})
export class ApiModule {}
