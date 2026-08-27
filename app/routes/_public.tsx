import { Outlet } from "react-router";
import type { Route } from "./+types/_public";

import { i18next, initI18n, resolveLocaleFromPath } from "~/shared/i18n";
import { useLocaleStore } from "~/shared/stores/locale";

/**
 * Public surface layout.
 *
 * Responsibilities:
 * - Detect locale from URL pathname (en at root, es at /es/...).
 * - Initialize i18next with the correct locale and seed the
 *   useLocaleStore mirror so child loaders and components read
 *   the active locale synchronously (REQ-I18N-9).
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
	useLocaleStore.getState().setLocaleMirror(lang);
	if (typeof document !== 'undefined') {
		document.documentElement.lang = lang;
	}
	return { lang };
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
