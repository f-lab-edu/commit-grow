import { User } from "@app/entity/domain/User.entity";
import { EntityManager, EntityRepository } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthService {
    
    constructor(
        private readonly em: EntityManager,
        @InjectRepository(User) 
        private readonly userRepository: EntityRepository<User>) {}

    async oauthLogin(githubId: string, username: string, email: string): Promise<User> {
        const user = await this.userRepository.findOne( { githubId, $not: { deletedAt: null } });

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