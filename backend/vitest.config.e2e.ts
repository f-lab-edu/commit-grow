import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths(), swc.vite()],
	test: {
		root: '.',
		environment: 'node',
		include: ['apps/api/e2e-test/**/*.e2e.spec.ts'],
		setupFiles: ['./vitest.setup.ts'],
		testTimeout: 5_000,
		env: {
			NODE_ENV: 'local',
		},
	},
});
