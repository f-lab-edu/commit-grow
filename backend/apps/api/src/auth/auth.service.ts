import { User } from '@app/entity/domain/User.entity';
import { GithubClientService } from '@app/github-client';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { SessionDto } from './dto/SessionDto';

@Injectable()
export class AuthService {
	constructor(
		private readonly em: EntityManager,
		@InjectRepository(User)
		private readonly userRepository: EntityRepository<User>,
		private readonly githubClientService: GithubClientService,
	) {}

	async signout(sessionDto: SessionDto) {
		await this.githubClientService.revokeAccessToken(sessionDto.accessToken);
	}

	async oauthLogin(
		githubId: string,
		username: string,
		email: string,
	): Promise<User> {
		const user = await this.userRepository.findOne({
			githubId,
			deletedAt: null,
		});

		// exception handling
		if (!user) {
			return this.signUp(username, email, githubId);
		}

		return user;
	}

	private async signUp(username: string, email: string, githubId: string) {
		const user = User.create(username, email, githubId);
		this.em.persist(user);
		await this.em.flush();
		return user;
	}
}
