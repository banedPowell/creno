// Features merged before they are finished. Each one stays off until an
// environment switches it on with NUXT_PUBLIC_FEATURES_<NAME>=true, read at
// startup so no rebuild is needed. Remove a flag once its feature has shipped
export const FEATURES = {
	// Lists the Crenos created from this browser (#28)
	myPolls: false,
	// Adds the chosen slot to a calendar (#29)
	calendarExport: false,
	// Gets a lost admin link back (#31)
	adminRecovery: false,
};

export type Feature = keyof typeof FEATURES;
