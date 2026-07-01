import { defineConfig } from '@mikro-orm/postgresql';

// TODO: DB 접속 정보는 추후 별도 설정 파일(yml)로 분리 예정. 지금은 로컬 개발 기준값으로 하드코딩.
export default defineConfig({
	host: 'localhost',
	port: 5432,
	user: 'commit_grow',
	password: 'commit_grow',
	dbName: 'commit_grow',
	entities: ['./dist/libs/entity/src/domain/**/*.entity.js'],
	entitiesTs: ['./libs/entity/src/domain/**/*.entity.ts'],
	migrations: {
		path: './script/migration',
	},
});
