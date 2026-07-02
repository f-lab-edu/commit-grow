import { readFileSync } from 'node:fs';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { load } from 'js-yaml';
import { Environment } from './schema/Environment';

export class EnviromentUtil {
	private static env: Environment;

	static getEnv(nodeEnv: string = process.env.NODE_ENV || 'test'): Environment {
		if (EnviromentUtil.env) {
			return EnviromentUtil.env;
		}

		const environment = EnviromentUtil.getEnvFrom(nodeEnv);
		EnviromentUtil.env = EnviromentUtil.validate(environment);

		return EnviromentUtil.env;
	}

	private static getEnvFrom(nodeEnv: string) {
		const environmentObject =
			load(readFileSync(`env/env.${nodeEnv}.yml`, 'utf8')) || {};
		environmentObject['environment'] = nodeEnv;

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
