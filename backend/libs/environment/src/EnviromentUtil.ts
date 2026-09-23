import { readFileSync } from 'node:fs';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { load } from 'js-yaml';
import { Environment } from './schema/Environment';

export interface EnvOverrides {
	database?: Partial<{ host: string; port: number }>;
	redis?: Partial<{ host: string; port: number }>;
}

export class EnviromentUtil {
	private static env: Environment;

	/**
	 * env는 최초 호출 시 한 번만 로드되어 캐시된다 — overrides는 그 최초 호출에서만 반영되고,
	 * 이후 호출은 override 유무와 상관없이 캐시된 값을 그대로 반환한다. integration 테스트에서
	 * testcontainer 포트를 override로 넣으려면(`vitest.setup.ts`) 다른 코드가 getEnv()를
	 * 먼저 호출하기 전에 실행되도록 setupFiles 순서를 보장해야 한다.
	 */
	static getEnv(
		nodeEnv: string = process.env.NODE_ENV || 'test',
		overrides?: EnvOverrides,
	): Environment {
		if (EnviromentUtil.env) {
			return EnviromentUtil.env;
		}

		const environment = EnviromentUtil.getEnvFrom(nodeEnv, overrides);
		EnviromentUtil.env = EnviromentUtil.validate(environment);

		return EnviromentUtil.env;
	}

	private static getEnvFrom(nodeEnv: string, overrides?: EnvOverrides) {
		const environmentObject: Record<string, any> =
			load(readFileSync(`env/env.${nodeEnv}.yml`, 'utf8')) || {};
		environmentObject['environment'] = nodeEnv;

		if (overrides?.database) {
			environmentObject.database = {
				...environmentObject.database,
				...overrides.database,
			};
		}
		if (overrides?.redis) {
			environmentObject.redis = {
				...environmentObject.redis,
				...overrides.redis,
			};
		}

		return plainToInstance(Environment, environmentObject, {
			enableImplicitConversion: false,
		});
	}

	private static validate(config: Environment) {
		const errors = validateSync(config, {
			skipMissingProperties: false,
		});

		if (errors.length > 0) {
			throw new Error(errors.toString());
		}

		return config;
	}
}
