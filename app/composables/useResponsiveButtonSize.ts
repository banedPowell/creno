const BREAKPOINT = '(min-width: 768px)';
const SSR_WIDTH = 768;

export const useResponsiveButtonSize = () => {
	const isDesktop = useMediaQuery(BREAKPOINT, { ssrWidth: SSR_WIDTH });

	const sizeMd = computed(() => (isDesktop.value ? 'xs' : 'md'));
	const sizeLg = computed(() => (isDesktop.value ? 'xs' : 'lg'));
	const sizeXl = computed(() => (isDesktop.value ? 'sm' : 'xl'));
	const size2xl = computed(() => (isDesktop.value ? 'sm' : '2xl'));

	return {
		isDesktop,
		sizeMd,
		sizeLg,
		sizeXl,
		size2xl,
	};
};
