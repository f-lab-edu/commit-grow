import { BaseCusomException } from './BaseCusomException';

export class SystemException extends BaseCusomException {
	constructor(
		message: string,
		readonly cause?: Error | Error[] | Record<string, unknown> | any,
	) {
		super(message);
	}
}
