import 'reflect-metadata';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { defineConfig } from '@mikro-orm/postgresql';

const dbEnv = EnviromentUtil.getEnv().database;

export default defineConfig({
	host: dbEnv.host,
	port: dbEnv.port,
	user: dbEnv.user,
	password: dbEnv.password,
	dbName: dbEnv.database,
	entities: ['./dist/libs/entity/src/domain/**/*.entity.js'],
	entitiesTs: ['./libs/entity/src/domain/**/*.entity.ts'],
	migrations: {
		path: './script/migration',
	},

	pool: {
		min: 10, // 최소 유지 커넥션 수. 0으로 두면 요청마다 새로 만들어 콜드스타트 지연 발생
		max: 20, // 최대 커넥션 수. DB의 max_connections를 인스턴스 개수로 나눈 값 이하로 설정할 것
		idleTimeoutMillis: 30_000, // 유휴 커넥션을 pool에서 반환(정리)하기까지 대기 시간
	},

	slowQueryThreshold: 1_000, // ms 넘는 쿼리를 slow-query로 로깅 (warning, 실패 시 error 레벨)

	driverOptions: {
		statement_timeout: 5_000, // 서버(DB) 사이드: 5초 넘는 쿼리는 Postgres가 직접 강제 종료
		query_timeout: 7_000, // 클라이언트(Node) 사이드: DB가 응답 안 해도 7초면 클라이언트가 포기하고 에러 던짐
		lock_timeout: 3_000, // 락 대기가 3초 넘으면 포기 (데드락/장시간 락 대기 방지)
	},

	// TODO: Entitiy 추가 후 제거 (Entitiy0개 시 에러)
	discovery: {
		warnWhenNoEntities: false,
	},
});
