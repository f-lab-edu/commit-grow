import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import mikroOrmConfig from '../../../mikro-orm.config';
import { ApiController } from './api.controller';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [() => EnviromentUtil.getEnv(process.env.NODE_ENV)],
		}),
		MikroOrmModule.forRoot(mikroOrmConfig),
	],
	controllers: [ApiController],
	providers: [],
})
export class ApiModule {}
