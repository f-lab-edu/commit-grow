import 'reflect-metadata';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

export default async function setup(): Promise<void> {
	const env = EnviromentUtil.getEnv();

	// 고정 호스트 포트(15433/16380) + withReuse() 조합 — 이 머신에서 pnpm test:int를 동시에 두 번
	// 돌리면 포트 바인딩이 레이스할 수 있다. 로컬/CI 모두 한 번에 한 잡만 돈다는 전제.
	const [postgresContainer, redisContainer] = await Promise.all([
		new PostgreSqlContainer('postgres:18.4')
			.withName('local-test-commit-grow-pg')
			.withUsername(env.database.user)
			.withPassword(env.database.password)
			.withDatabase(env.database.database)
			.withExposedPorts({ container: 5432, host: 15433 })
			.withReuse()
			.start(),
		new RedisContainer('redis:7.4')
			.withName('local-test-commit-grow-redis')
			.withCommand(['redis-server', '--databases', '32'])
			.withExposedPorts({ container: 6379, host: 16380 })
			.withReuse()
			.start(),
	]);

	process.env.DB_HOST = postgresContainer.getHost();
	process.env.DB_PORT = String(postgresContainer.getMappedPort(5432));
	process.env.REDIS_HOST = redisContainer.getHost();
	process.env.REDIS_PORT = String(redisContainer.getMappedPort(6379));
}
