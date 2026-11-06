import type { Feature } from '../../shared/utils/features';

export const isFeatureEnabled = (name: Feature): boolean =>
	useRuntimeConfig().public.features[name] === true;

// A route behind a flag does not exist until the flag is on
export const requireFeature = (name: Feature) => {
	if (!isFeatureEnabled(name))
		throw createError({
			statusCode: 404,
			message: 'Page introuvable',
		});
};
