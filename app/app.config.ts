export default defineAppConfig({
	ui: {
		colors: {
			primary: 'green',
			secondary: 'blue',
			success: 'green',
			info: 'blue',
			warning: 'yellow',
			error: 'red',
			neutral: 'neutral',
		},
		page: {
			slots: {
				// One flexible center, capped at max-w-5xl (64rem). The page
				// max-width is the visible columns plus the gutter and padding,
				// so that cap is actually reached on a wide screen
				root: 'mx-auto grid w-full grid-cols-1 items-start gap-8 px-4 py-6 pb-28 sm:px-6 lg:gap-10 lg:px-8',
				left: 'order-2 w-full min-w-0 lg:sticky lg:top-20 lg:order-none',
				center: 'order-1 flex w-full min-w-0 max-w-5xl flex-col gap-6 lg:order-none',
				right: 'order-3 w-full min-w-0 lg:sticky lg:top-20 lg:order-none',
			},
			variants: {
				left: {
					true: {
						root: 'lg:max-w-[calc(20rem+64rem+2.5rem+4rem)] lg:grid-cols-[20rem_minmax(0,1fr)]',
					},
				},
				right: {
					true: {
						root: 'lg:max-w-[calc(64rem+18rem+2.5rem+4rem)] lg:grid-cols-[minmax(0,1fr)_18rem]',
					},
				},
			},
			compoundVariants: [
				{
					left: true,
					right: true,
					class: {
						root: 'lg:max-w-[calc(20rem+64rem+18rem+5rem+4rem)] lg:grid-cols-[20rem_minmax(0,1fr)_18rem]',
					},
				},
			],
		},
		pageAside: {
			slots: {
				root: '!block w-full',
			},
		},
		pageHeader: {
			slots: {
				root: 'border-0 py-0',
				container: 'flex flex-col gap-4',
				wrapper: 'flex flex-col gap-1',
				title: 'text-3xl font-bold text-pretty text-highlighted sm:text-4xl',
				description:
					'text-base text-pretty whitespace-pre-line text-muted',
			},
		},
		pageBody: {
			base: 'mt-0 flex flex-col gap-6',
		},
		formField: {
			slots: {
				error: 'mt-1.5 text-xs',
			},
		},
		input: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		select: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		textarea: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		selectMenu: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		inputMenu: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		inputNumber: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		inputTags: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		inputDate: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		inputTime: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
		pinInput: {
			defaultVariants: {
				variant: 'subtle',
			},
		},
	},
});
