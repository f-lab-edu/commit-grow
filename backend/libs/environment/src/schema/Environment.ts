import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { DataBaseEnvironment } from './DataBaseEnvironment';
import { ServerEnvironment } from './ServerEnvironment';

export class Environment {
	@ValidateNested()
	@IsNotEmpty()
	@Type(() => ServerEnvironment)
	public readonly server: ServerEnvironment;

	@ValidateNested()
	@IsNotEmpty()
	@Type(() => DataBaseEnvironment)
	public readonly database: DataBaseEnvironment;
}
