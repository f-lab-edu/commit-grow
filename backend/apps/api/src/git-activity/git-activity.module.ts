import { GithubClientModule } from '@app/github-client';
import { Module } from '@nestjs/common';
import { GitActivityController } from './git-activity.controller';
import { GitActivityService } from './git-activity.service';

@Module({
	imports: [GithubClientModule],
	controllers: [GitActivityController],
	providers: [GitActivityService],
})
export class GitActivityModule {}
