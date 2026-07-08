import { Environment } from '@app/environment/schema/Environment';
import { RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

export function generatePinoLoggerModule(environment: Environment) {
	const isLocal = environment.isEnvironment('local');

	return LoggerModule.forRoot({
		forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
		pinoHttp: {
			level: isLocal ? 'debug' : 'info',
			transport: isLocal
				? {
						target: 'pino-pretty',
						options: {
							colorize: true,
							colorizeObjects: true,
							singleLine: false,
							ignore: 'req,res',
						},
					}
				: undefined,
			redact: [
				'req.headers',
				'req.remoteAddress',
				'req.remotePort',
				'res.headers',
			],
			genReqId: (req) => req.headers['x-request-id'] ?? crypto.randomUUID(),
		},
	});
}
