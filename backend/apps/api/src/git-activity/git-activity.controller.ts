import { Controller, Get } from '@nestjs/common';
import { SessionDto } from '../auth/dto/SessionDto';
import { Auth } from '../decorators/Auth.decorator';
import { LoginSession } from '../decorators/LoginSession.decorator';
import { GitActivityGroupDto } from './dto/GitActivityGroupDto';
import { GitActivityService } from './git-activity.service';

@Controller('git-activities')
export class GitActivityController {
	constructor(private readonly gitActivityService: GitActivityService) {}

	@Get('today')
	@Auth()
	async getToday(
		@LoginSession() sessionDto: SessionDto,
	): Promise<GitActivityGroupDto[]> {
		return this.gitActivityService.getToday(sessionDto.accessToken);
	}
}
