import { IsString, IsNotEmpty, IsNumber } from "class-validator";

export class RedisEnvironment {
	@IsString()
	@IsNotEmpty()
	host: string;

	@IsNumber()
	@IsNotEmpty()
	port: number;
}