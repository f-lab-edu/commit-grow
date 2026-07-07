import { Entity, Property } from "@mikro-orm/decorators/legacy";
import { BaseTimeEntity } from "../base/BaseTime.entity";

@Entity()
export class User extends BaseTimeEntity {
	@Property({ type: 'varchar', length: 100 })
	username: string;

	@Property({ type: 'varchar', length: 100 })
	email: string;

    private constructor(username: string, email: string) {
        super();
        this.username = username;
        this.email = email;
    }

    static create(username: string, email: string) {
        return new User(username, email);
    }
}