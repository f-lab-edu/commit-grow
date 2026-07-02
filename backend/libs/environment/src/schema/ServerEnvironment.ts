import { IsNumber, Max, Min } from 'class-validator';

export class ServerEnvironment {
	@IsNumber()
	@Min(1)
	@Max(65_535)
	public readonly port: number;
}
