import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

interface EnvConfig {
	api: {
		baseUrl: string;
	};
}

// next dev/build가 NODE_ENV를 development/production으로 강제 설정해버려서
// backend와 같은 local/test/production 네이밍으로는 못 씀. dev는 항상 local,
// build/start는 APP_ENV로 override (CI/배포에서 지정, 기본값 local).
export default function nextConfig(phase: string): NextConfig {
	const appEnv =
		phase === PHASE_DEVELOPMENT_SERVER
			? "local"
			: (process.env.APP_ENV ?? "local");
	const config = load(
		readFileSync(`env/env.${appEnv}.yml`, "utf8"),
	) as EnvConfig;

	return {
		env: {
			NEXT_PUBLIC_API_URL: config.api.baseUrl,
		},
	};
}
