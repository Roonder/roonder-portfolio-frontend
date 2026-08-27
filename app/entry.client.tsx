/**
 * Client entry point. React Router calls this after the server-rendered
 * HTML loads. We hydrate i18next with the resources serialized by the
 * `_public.tsx` loader so components can call `t(...)` immediately
 * without waiting for a network fetch.
 */

import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { startTransition } from "react";

import { initI18n, i18next, type Locale } from "~/shared/i18n";

// Declare the global variables set by the server-rendered script tag
declare global {
	interface Window {
		__I18N_RESOURCES__?: Record<string, Record<string, unknown>>;
		__I18N_LOCALE__?: Locale;
	}
}

/**
 * Hydrate i18next with the resources serialized by the server. This
 * avoids the flash of raw translation keys that happens when the client
 * renders before i18next has loaded the translations.
 */
async function hydrateI18n(): Promise<void> {
	const resources = window.__I18N_RESOURCES__;
	const locale = window.__I18N_LOCALE__;

	if (!resources || !locale) {
		// Fallback: initialize with default locale if no resources were
		// serialized (e.g. on admin routes that don't use i18n).
		await initI18n();
		return;
	}

	// Initialize i18next with the pre-loaded resources
	await initI18n(locale);

	// Add the resources to i18next's resource store. This is faster
	// than re-fetching them and ensures the client has the exact same
	// translations as the server.
	for (const [lng, ns] of Object.entries(resources)) {
		for (const [nsName, nsData] of Object.entries(ns)) {
			i18next.addResourceBundle(lng, nsName, nsData, true, true);
		}
	}

	// Set the language to the serialized locale
	await i18next.changeLanguage(locale);
}

startTransition(() => {
	hydrateRoot(
		document,
		<HydratedRouter />,
	);
});

// Hydrate i18next before React hydrates. This ensures that when React
// calls `t(...)` during hydration, the translations are already available.
hydrateI18n().catch((err) => {
	console.error("Failed to hydrate i18n:", err);
});
