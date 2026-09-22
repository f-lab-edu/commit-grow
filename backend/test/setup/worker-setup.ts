import { EnviromentUtil } from '@app/environment/EnviromentUtil';
import { MikroORM } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Logger } from '@nestjs/common';
import { createClient } from 'redis';
import testMikroOrmConfig from 'test-mikro-orm.config';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { getWorkerRedisDb, getWorkerSchema } from './workerContext';

const MikKRO_ORM_DEBUG = false;

let schemaOrm: MikroORM<PostgreSqlDriver>;
const logger = new Logger('vitest-woker-setup');

async function withRetry(
	fn: () => Promise<void>,
	retries = 3,
	delayMs = 300,
): Promise<void> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await fn();
			return;
		} catch (err) {
			if (attempt === retries) {
				throw err;
			}
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
}

beforeAll(async () => {
	const WORKER_NAME = 'worker beforeAll';
	loggingStart(WORKER_NAME);

	schemaOrm = await MikroORM.init({
		...testMikroOrmConfig,
		schema: getWorkerSchema(),
		debug: MikKRO_ORM_DEBUG,
		entities: ['./libs/entity/src/domain/**/*.entity.ts'],
		entitiesTs: ['./libs/entity/src/domain/**/*.entity.ts'],
	});
	await schemaOrm.schema.createNamespace(getWorkerSchema());
	await withRetry(async () => {
		await schemaOrm.schema.drop();
		await schemaOrm.schema.create();
	});

	loggingEnd(WORKER_NAME);
});

afterAll(async () => {
	const WORKER_NAME = 'worker afterAll';
	loggingStart(WORKER_NAME);

	try {
		await withRetry(() => schemaOrm.schema.drop());
		await schemaOrm.schema.dropNamespace(getWorkerSchema());
	} finally {
		await schemaOrm.close();
	}
	loggingEnd(WORKER_NAME);
});

afterEach(async () => {
	const WORKER_NAME = 'worker afterEach';
	loggingStart(WORKER_NAME);

	const redisEnv = EnviromentUtil.getEnv().redis;
	const client = createClient({
		socket: { host: redisEnv.host, port: redisEnv.port },
		database: getWorkerRedisDb(),
	});
	await client.connect();
	await client.flushDb();
	await client.quit();
	loggingEnd(WORKER_NAME);
});

function loggingStart(task: string) {
	logger.log(`🛠️🛠️🛠️ ${task} 시작 🛠️🛠️🛠️`);
}

function loggingEnd(task: string) {
	logger.log(`🛠️🛠️🛠️ ${task} 종료 🛠️🛠️🛠️\n\n`);
}
