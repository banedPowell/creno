// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	css: ['~/assets/css/main.css'],
	modules: ['@nuxt/ui', '@compodium/nuxt', '@nuxt/test-utils/module'],

	runtimeConfig: {
		tursoUrl: process.env.TURSO_DATABASE_URL,
		tursoToken: process.env.TURSO_AUTH_TOKEN,
	},
});
