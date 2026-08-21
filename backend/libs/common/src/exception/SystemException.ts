import { BaseCusomException } from './BaseCusomException';

export class SystemException extends BaseCusomException {
	constructor(
		message: string,
		loggingMessage: string,
		readonly cause?: object | object[],
	) {
		super(message, loggingMessage);
	}

	static SystemError(logMessage: string, cause?: object | object[]) {
		return new SystemException(
			'시스템에 문제가 발생하였습니다. 잠시 후 다시 시도해주세요.',
			logMessage,
			cause,
		);
	}
}
