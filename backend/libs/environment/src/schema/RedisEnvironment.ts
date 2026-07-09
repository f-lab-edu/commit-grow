import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class RedisEnvironment {
	@IsString()
	@IsNotEmpty()
	host: string;

	@IsNumber()
	@IsNotEmpty()
	port: number;

	@IsNumber()
	@IsNotEmpty()
	@Min(1)
	maxConnectRetries: number;
}
