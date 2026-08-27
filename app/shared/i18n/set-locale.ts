/**
 * `setLocale(next)` — the single mutation entry for the active locale.
 *
 * Per ADR-4 + REQ-I18N-4, in ONE call we:
 *   1. i18next.changeLanguage(next)
 *   2. useLocaleStore.getState().setLocaleMirror(next)
 *   3. write the `lang` cookie (Path=/; SameSite=Lax; Max-Age=31536000)
 *   4. set document.documentElement.lang = next
 *   5. compute the equivalent path and navigate via the caller's
 *      `navigate` function (the LocaleSwitcher is a client component,
 *      so it owns `useNavigate()`)
 *
 * The URL is the source of truth (REQ-I18N-8); the cookie is a side
 * effect for the very first visit when no URL prefix is present.
 */

import type { NavigateFunction } from 'react-router';

import { i18next, type Locale } from '~/shared/i18n';
import { useLocaleStore } from '~/shared/stores/locale';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Compute the equivalent path for the target locale. Strips `/es`
 * for English; prepends `/es` for Spanish. Preserves the deep
 * path: `/works/the-monolith-pavilion` ↔
 * `/es/works/the-monolith-pavilion`.
 *
 * Special cases:
 *   - `/es` (root with prefix) ↔ `/` (root without prefix)
 *   - `/es/...` (deep with prefix) ↔ `/...` (deep without prefix)
 *   - `/...` (deep without prefix) ↔ `/es/...` (deep with prefix)
 */
export function computeEquivalentPath(
	currentPathname: string,
	next: Locale,
): string {
	const hadPrefix =
		currentPathname === '/es' || currentPathname.startsWith('/es/');
	if (next === 'es') {
		if (hadPrefix) return currentPathname;
		// Empty path case: `/` becomes `/es`.
		return currentPathname === '/' ? '/es' : `/es${currentPathname}`;
	}
	// next === 'en'
	if (!hadPrefix) return currentPathname;
	// Strip `/es` prefix; empty becomes `/`.
	const stripped = currentPathname.slice(3); // removes `/es`
	return stripped === '' ? '/' : stripped;
}

/**
 * The single mutation entry for switching the active locale. The
 * caller is responsible for being a client component (we read
 * `document` synchronously after the side effects) and for passing
 * the React Router `navigate` function from `useNavigate()`.
 */
export function setLocale(
	next: Locale,
	currentPathname: string,
	navigate: NavigateFunction,
): void {
	if (typeof window === 'undefined') return;

	// 1. i18next
	void i18next.changeLanguage(next);
	// 2. store mirror
	useLocaleStore.getState().setLocaleMirror(next);
	// 3. cookie
	document.cookie = `lang=${next}; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
	// 4. <html lang>
	document.documentElement.lang = next;
	// 5. navigate to the equivalent path
	const targetPath = computeEquivalentPath(currentPathname, next);
	navigate(targetPath);
}
