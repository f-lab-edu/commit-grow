import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class DataBaseEnvironment {
	@IsString()
	@IsNotEmpty()
	public readonly host: string;

	@IsNumber()
	@Min(1)
	@Max(65_535)
	public readonly port: number;

	@IsString()
	@IsNotEmpty()
	public readonly user: string;

	@IsString()
	@IsNotEmpty()
	public readonly password: string;

	@IsString()
	@IsNotEmpty()
	public readonly database: string;
}
