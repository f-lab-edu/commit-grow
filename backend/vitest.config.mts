import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths(), swc.vite()],
	test: {
		root: '.',
		environment: 'node',
		setupFiles: ['./vitest.setup.ts'],
		maxWorkers: '50%',
		coverage: {
			provider: 'v8',
			reportsDirectory: './coverage',
			include: ['apps/**/*.{ts,js}', 'libs/**/*.{ts,js}'],
		},
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['apps/**/*.spec.ts', 'libs/**/*.spec.ts'],
					testTimeout: 5_000,
				},
			},
			{
				extends: true,
				test: {
					name: 'integration',
					include: ['apps/**/*.int-spec.ts', 'libs/**/*.int-spec.ts'],
					globalSetup: ['test/setup/global-setup.ts'],
					setupFiles: ['./vitest.setup.ts', 'test/setup/worker-setup.ts'],
					testTimeout: 5_000,
				},
			},
		],
	},
});
