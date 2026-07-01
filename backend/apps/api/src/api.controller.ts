import { Controller, Get } from "@nestjs/common";

@Controller()
export class ApiController {
	@Get()
	getHello(): string {
		return "Hello World!";
	}
}
