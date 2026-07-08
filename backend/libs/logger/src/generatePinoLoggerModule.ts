import { url as inspectorUrl } from 'node:inspector';
import { Environment } from '@app/environment/schema/Environment';
import { RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Options } from 'pino-http';
import pretty from 'pino-pretty';

function isDebuggerEnabled(): boolean {
	return (
		Boolean(inspectorUrl()) ||
		process.execArgv.some((arg) => /--inspect(-brk)?(=|$)/.test(arg)) ||
		Boolean(process.env.NODE_OPTIONS?.match(/--inspect(-brk)?(=|$)/))
	);
}

export function generatePinoLoggerModule(environment: Environment) {
	const isDevelop =
		environment.isEnvironment('local') || environment.isEnvironment('test');
	const useSyncPretty =
		environment.isEnvironment('test') && isDebuggerEnabled();

	const commonOptions: Options = {
		level: isDevelop ? 'debug' : 'info',
		redact: [
			'req.headers',
			'req.remoteAddress',
			'req.remotePort',
			'res.headers',
		],
		genReqId: (req) => req.headers['x-request-id'] ?? crypto.randomUUID(),
	};

	// transport(worker)의 sync는 효과가 없음.
	// 디버그(inspect)로 돌리는 test에서만 sync stream으로 flush를 보장한다.
	const pinoHttp: Options | [Options, NodeJS.WritableStream] = useSyncPretty
		? [
				commonOptions,
				pretty({
					colorize: true,
					colorizeObjects: true,
					singleLine: false,
					sync: true,
					destination: 1, // stdout
				}),
			]
		: {
				...commonOptions,
				transport: isDevelop
					? {
							target: 'pino-pretty',
							options: {
								colorize: true,
								colorizeObjects: true,
								singleLine: false,
							},
						}
					: undefined,
			};

	return LoggerModule.forRoot({
		forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
		pinoHttp,
	});
}
