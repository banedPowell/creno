import type { Feature } from '../../shared/utils/features';

// Whether a feature still behind its flag is on in this environment
export const useFeature = (name: Feature): boolean =>
	useRuntimeConfig().public.features[name] === true;
