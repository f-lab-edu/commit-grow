import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import mikroOrmConfig from "../../../mikro-orm.config";
import { ApiController } from "./api.controller";

@Module({
	imports: [MikroOrmModule.forRoot(mikroOrmConfig)],
	controllers: [ApiController],
	providers: [],
})
export class ApiModule {}
