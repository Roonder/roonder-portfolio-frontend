import { Outlet } from "react-router";
import type { Route } from "./+types/_public";

import { i18next, resolveLocaleFromPath } from "~/shared/i18n";
import { useLocaleStore } from "~/shared/stores/locale";

/**
 * Public surface layout.
 *
 * Responsibilities:
 * - Detect locale from URL pathname (en at root, es at /es/...).
 * - Seed i18next + useLocaleStore on every navigation so child
 *   loaders and components read the active locale synchronously
 *   (REQ-I18N-9).
 * - Render the matched child route.
 *
 * The `data-lang` attribute lets the subtree read the current
 * locale without re-parsing the URL.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const lang = resolveLocaleFromPath(url.pathname);
	// Seed the i18next singleton + the zustand mirror. These calls
	// are idempotent: i18next.changeLanguage is a no-op if the
	// language is already the active one, and the store mirror is
	// safe to set repeatedly.
	void i18next.changeLanguage(lang);
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
