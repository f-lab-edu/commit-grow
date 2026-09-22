export const REDIS_DATABASE_COUNT = 32; // worker 32개 넘으면 이 상수와 global-setup의 --databases 플래그를 같이 올릴 것

export function getWorkerId(): string {
	return process.env.VITEST_WORKER_ID ?? '0';
}

export function getWorkerSchema(): string {
	return `test_worker_${getWorkerId()}`;
}

export function getWorkerRedisDb(): number {
	return Number(getWorkerId()) % REDIS_DATABASE_COUNT;
}
