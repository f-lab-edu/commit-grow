import { url as inspectorUrl } from 'node:inspector';
import { RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Options } from 'pino-http';
import pretty from 'pino-pretty';

const PRETTY_OPTIONS = {
	colorize: true,
	colorizeObjects: true,
	singleLine: false,
} as const;

const commonOptions: Options = {
	level: 'debug',
	redact: ['req.headers', 'req.remoteAddress', 'req.remotePort', 'res.headers'],
	genReqId: (req) => req.headers['x-request-id'] ?? crypto.randomUUID(),
};

export function generatePinoLoggerModule() {
	return LoggerModule.forRoot({
		forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
		pinoHttp: isDebuggerEnabled() ? debugPinoHttp() : developPinoHttp(),
	});
}

/**
 * 디버깅용. transport은 비동기로 테스트 종료 전, 로거가 종료되서 로그가 찍히지 않는다.
 * 따라서, sync stream을 직접 물려 동기로 로그 표시.
 */
function debugPinoHttp(): [Options, NodeJS.WritableStream] {
	const syncStream = pretty({ ...PRETTY_OPTIONS, sync: true, destination: 1 });
	return [commonOptions, syncStream];
}

/** 개발용. transport로 비동기 출력. */
function developPinoHttp(): Options {
	return {
		...commonOptions,
		transport: { target: 'pino-pretty', options: { ...PRETTY_OPTIONS } },
	};
}

/** --inspect / --inspect-brk 로 디버거가 붙어 있는지 확인. */
function isDebuggerEnabled(): boolean {
	const inspectFlag = /--inspect(-brk)?(=|$)/;
	return (
		Boolean(inspectorUrl()) ||
		process.execArgv.some((arg) => inspectFlag.test(arg)) ||
		Boolean(process.env.NODE_OPTIONS?.match(inspectFlag))
	);
}
