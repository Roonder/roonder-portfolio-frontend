import { Outlet } from "react-router";
import type { Route } from "./+types/_public";

import {
	i18next,
	initI18n,
	NAMESPACES,
	resolveLocaleFromPath,
} from "~/shared/i18n";
import { useLocaleStore } from "~/shared/stores/locale";

// Import all locale resources to serialize them for the client
import enCommon from "~/shared/i18n/locales/en/common.json";
import enHome from "~/shared/i18n/locales/en/home.json";
import enWorks from "~/shared/i18n/locales/en/works.json";
import enContact from "~/shared/i18n/locales/en/contact.json";
import enAdmin from "~/shared/i18n/locales/en/admin.json";

import esCommon from "~/shared/i18n/locales/es/common.json";
import esHome from "~/shared/i18n/locales/es/home.json";
import esWorks from "~/shared/i18n/locales/es/works.json";
import esContact from "~/shared/i18n/locales/es/contact.json";

/**
 * Public surface layout.
 *
 * Responsibilities:
 * - Detect locale from URL pathname (en at root, es at /es/...).
 * - Initialize i18next with the correct locale and seed the
 *   useLocaleStore mirror so child loaders and components read
 *   the active locale synchronously (REQ-I18N-9).
 * - Serialize i18n resources for client hydration.
 * - Render the matched child route.
 *
 * The `data-lang` attribute lets the subtree read the current
 * locale without re-parsing the URL.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const lang = resolveLocaleFromPath(url.pathname);
	// Await initI18n to ensure i18next is fully initialized before
	// changing the language. The side-effect import in root.tsx
	// starts initialization with 'en'; we await it here and then
	// switch to the correct locale. Without this, components may
	// render with raw translation keys (e.g. "common.brand.name")
	// because the language change hasn't completed yet.
	await initI18n();
	await i18next.changeLanguage(lang);
	// Ensure all namespaces are loaded before rendering. Without this,
	// components that use keys from non-default namespaces (e.g.
	// "home.hero.subhead") may render raw keys if the namespace hasn't
	// been loaded yet.
	await i18next.loadNamespaces([...NAMESPACES]);
	useLocaleStore.getState().setLocaleMirror(lang);
	if (typeof document !== 'undefined') {
		document.documentElement.lang = lang;
	}
	// Serialize i18n resources for client hydration. The client needs
	// these resources to avoid re-fetching them and to ensure i18next
	// is initialized with the correct translations before React hydrates.
	const resources = {
		en: {
			common: enCommon,
			home: enHome,
			works: enWorks,
			contact: enContact,
			admin: enAdmin,
		},
		es: {
			common: esCommon,
			home: esHome,
			works: esWorks,
			contact: esContact,
		},
	};
	return { lang, resources };
}

export function meta() {
	return [
		{ title: "Roonder Portfolio" },
		{ name: "description", content: "Juliam Aponte portfolio" },
	];
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
	return (
		<div data-lang={loaderData.lang}>
			{/* Serialize i18n resources for client hydration */}
			<script
				dangerouslySetInnerHTML={{
					__html: `window.__I18N_RESOURCES__ = ${JSON.stringify(loaderData.resources)}; window.__I18N_LOCALE__ = ${JSON.stringify(loaderData.lang)};`,
				}}
			/>
			<Outlet />
		</div>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<section>
			<h1>Public layout error</h1>
			<p>{error instanceof Error ? error.message : "Unknown error"}</p>
		</section>
	);
}
