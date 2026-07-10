import { BaseCusomException } from './BaseCusomException';

export class SystemException extends BaseCusomException {
	constructor(
		message: string,
		readonly cause?: object | object[],
	) {
		super(message);
	}
}
