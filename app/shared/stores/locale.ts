/**
 * `useLocaleStore` — mirror of `i18next.language`.
 *
 * The store exists so non-hook consumers (e.g. `meta()` exports that
 * need to build `<html lang>` or canonical/hreflang tags) can read
 * the active locale via `useLocaleStore.getState().locale` without
 * calling a hook. The store is updated by:
 *   1. the public layout loader (on every navigation), AND
 *   2. the `setLocale` helper in `app/shared/i18n/set-locale.ts`
 *      (on user-initiated locale switches from the LocaleSwitcher).
 *
 * No `persist` middleware: the URL is the source of truth, and the
 * store is a per-render cache (per REQ-I18N-3 + the locked
 * `admin-auth` REQ-SES-2 "no `persist`" pattern).
 *
 * Selector form is the only allowed read style: selectors like
 * `useLocaleStore((s) => s.locale)` keep re-renders surgical.
 */

import { create } from 'zustand';

import type { Locale } from '~/shared/i18n';

export type LocaleState = {
	locale: Locale;
};

export type LocaleActions = {
	/**
	 * Sync the store with i18next. Called by the public layout
	 * loader on every navigation AND by the `setLocale` helper
	 * after `i18next.changeLanguage(...)` runs.
	 */
	setLocaleMirror: (next: Locale) => void;
};

export type LocaleStore = LocaleState & LocaleActions;

const initialState: LocaleState = {
	locale: 'en',
};

export const useLocaleStore = create<LocaleStore>()((set) => ({
	...initialState,
	setLocaleMirror: (next) => set({ locale: next }),
}));
