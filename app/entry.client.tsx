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

// Declare the global variable set by the server-rendered script tag
declare global {
	interface Window {
		__I18N_LOCALE__?: Locale;
	}
}

/**
 * Hydrate i18next on the client. All translations are already bundled
 * statically in `~/shared/i18n`'s `initI18n()` (same module, same
 * resources on server and client), so this only needs to switch to the
 * locale the server rendered with — matching it exactly avoids a flash
 * of the wrong language between hydration and the first client render.
 */
async function hydrateI18n(): Promise<void> {
	const locale = window.__I18N_LOCALE__;
	await initI18n(locale);
	if (locale) {
		await i18next.changeLanguage(locale);
	}
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
