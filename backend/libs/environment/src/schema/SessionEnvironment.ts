import { IsNotEmpty, IsString } from 'class-validator';

export class SessionEnvironment {
	@IsString()
	@IsNotEmpty()
	secret: string;

	@IsString()
	@IsNotEmpty()
	cookieName: string;
}
