import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { generatePinoLoggerModule } from '@app/logger/generatePinoLoggerModule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import testMikroOrmConfig from 'test-mikro-orm.config';

export function createTestingModule(imports: any[]) {
	return Test.createTestingModule({
		imports: [
			ConfigModule.forRoot({
				load: [() => EnviromentUtil.getEnv()],
				isGlobal: true,
			}),
			generatePinoLoggerModule(),
			MikroOrmModule.forRoot({
				...testMikroOrmConfig,
				autoLoadEntities: true,
			}),
			...imports,
		],
	});
}
