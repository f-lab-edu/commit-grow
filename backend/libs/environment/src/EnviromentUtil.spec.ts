import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnviromentUtil as EnviromentUtilClass } from './EnviromentUtil';

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return {
		...actual,
		readFileSync: vi.fn(actual.readFileSync),
	};
});

let EnviromentUtil: typeof EnviromentUtilClass;

describe('EnviromentUtil', () => {
	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		EnviromentUtil = (await import('./EnviromentUtil.js')).EnviromentUtil;
	});

	describe('getEnv', () => {
		it('환경설정파일을 읽고 Environment 인스턴스를 반환한다.', () => {
			// given
			const environment = EnviromentUtil.getEnv('test');

			// then
			expect(environment.environment).toBe('test');
		});

		it('이미 환경설정을 헀다면 nodeEnv가 달라도 이미 설정된 환경 설정을 반환한다.', () => {
			// given
			EnviromentUtil.getEnv('test');
			const changeNodeEnd = 'local';

			// when
			const environment = EnviromentUtil.getEnv(changeNodeEnd);

			// then
			expect(environment.environment).toBe('test');
		});

		it('환경설정 파일이 존재하지 않는 경우 에러가 발생한다.', () => {
			// given
			const invaildNodeEnv = 'not-exits';

			// then
			expect(() =>
				EnviromentUtil.getEnv(invaildNodeEnv),
			).toThrowErrorMatchingInlineSnapshot(
				`[Error: ENOENT: no such file or directory, open 'env/env.not-exits.yml']`,
			);
		});

		it('환경설정이 잘못된 형식으로 작성되어 있는 경우 에러가 발생한다.', () => {
			// given
			const invaildNodeEnv = 'un-valid';
			const invalidContent = 'server:\n port: not-a-number';

			// when
			vi.mocked(readFileSync).mockReturnValueOnce(invalidContent);

			// then
			expect(() => EnviromentUtil.getEnv(invaildNodeEnv)).toThrowError();
		});

		it('환경설정 파일이 존재하지 않는 경우 에러가 발생한다.', () => {
			// given
			const invaildNodeEnv = 'not-exits';

			// then
			expect(() =>
				EnviromentUtil.getEnv(invaildNodeEnv),
			).toThrowErrorMatchingInlineSnapshot(
				`[Error: ENOENT: no such file or directory, open 'env/env.not-exits.yml']`,
			);
		});
	});
});
