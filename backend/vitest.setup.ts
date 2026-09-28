import 'reflect-metadata';
import { EnviromentUtil } from '@app/environment/EnviromentUtil';

// EnviromentUtil.getEnv()는 최초 호출에서만 override를 반영하고 이후엔 캐시된 값을 반환한다.
// 이 파일이 vitest.config.mts의 integration setupFiles 배열에서 가장 먼저 와야
// (다른 코드가 getEnv()를 먼저 부르기 전에) 아래 override가 실제로 먹는다.
if (process.env.DB_HOST) {
	EnviromentUtil.getEnv(undefined, {
		database: { host: process.env.DB_HOST, port: Number(process.env.DB_PORT) },
		redis: {
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
		},
	});
}
