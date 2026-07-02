import { Controller, Get } from '@nestjs/common';
import { Logger } from 'nestjs-pino/Logger';

@Controller()
export class ApiController {
	constructor(private readonly logger: Logger) {}
	@Get()
	getHello(): string {
		this.logger.log('Hello World!');
		this.logger.debug('Hello World!');
		this.logger.warn('Hello World!');
		this.logger.error(new Error());
		this.logger.fatal('Hello World!');
		this.logger.verbose('Hello World!');

		return 'Hello World!';
	}
}
