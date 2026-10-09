import { defineConfig } from 'vitest/config';
import { defineVitestProject } from '@nuxt/test-utils/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'server',
					environment: 'node',
					include: [
						'server/**/*.{test,spec}.ts',
						'tests/server/**/*.{test,spec}.ts',
					],
					setupFiles: ['./tests/server/setup.ts'],
					restoreMocks: true,
				},
			},
			await defineVitestProject({
				test: {
					name: 'app',
					environment: 'nuxt',
					include: [
						'app/**/*.{test,spec}.ts',
						'tests/app/**/*.{test,spec}.ts',
					],
					setupFiles: ['./tests/app/setup.ts'],
					restoreMocks: true,
				},
			}),
		],
	},
});
