import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths(), swc.vite()],
	test: {
		root: '.',
		environment: 'node',
		include: ['apps/**/*.spec.ts', 'libs/**/*.spec.ts'],
		setupFiles: ['./vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			reportsDirectory: './coverage',
			include: ['apps/**/*.{ts,js}', 'libs/**/*.{ts,js}'],
		},
	},
});
