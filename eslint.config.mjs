// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default withNuxt(
	{
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'prefer-const': 'error',
			'no-undef': 'off',
		},
	},
	{
		files: ['**/*.ts', '**/*.vue'],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
	{
		rules: {
			'vue/multi-word-component-names': 'off',
			'vue/require-default-prop': 'off',
			'vue/no-multiple-template-root': 'off',
			'vue/html-self-closing': 'off',
		},
	},
	eslintPluginPrettier,
);
