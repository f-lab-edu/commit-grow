import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { GithubClientService } from './github-client.service';

@Module({
	providers: [GithubClientService, ConfigService, Logger],
	exports: [GithubClientService],
})
export class GithubClientModule {}
