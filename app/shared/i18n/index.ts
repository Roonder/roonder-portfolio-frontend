/**
 * i18n bootstrap.
 *
 * Wires `i18next` + `react-i18next` with two locales (`en` default at
 * root, `es` at the `/es/...` prefix) and one JSON namespace per area
 * (`common`, `home`, `works`, `contact`, `admin`). The locale
 * detection lives in the `_public.tsx` loader (the URL prefix is the
 * source of truth per `DESIGN.md §8`); this module wires the
 * language change to the `useLocaleStore` mirror.
 *
 * The `setLocale(next)` mutation entry that navigates + writes the
 * cookie lives in `set-locale.ts` (created in T-F-4).
 */

import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '~/shared/i18n/locales/en/common.json';
import enHome from '~/shared/i18n/locales/en/home.json';
import enWorks from '~/shared/i18n/locales/en/works.json';
import enContact from '~/shared/i18n/locales/en/contact.json';
import enAdmin from '~/shared/i18n/locales/en/admin.json';

import esCommon from '~/shared/i18n/locales/es/common.json';
import esHome from '~/shared/i18n/locales/es/home.json';
import esWorks from '~/shared/i18n/locales/es/works.json';
import esContact from '~/shared/i18n/locales/es/contact.json';

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const NAMESPACES = [
	'common',
	'home',
	'works',
	'contact',
	'admin',
] as const;
export type Namespace = (typeof NAMESPACES)[number];
export const DEFAULT_NAMESPACE: Namespace = 'common';

let initPromise: Promise<I18nInstance> | null = null;

/**
 * Initialize the i18n singleton. Safe to call from server or client;
 * returns a promise that resolves when i18next is fully initialized.
 * The public layout loader (`_public.tsx`) awaits this to ensure the
 * correct locale is active before any component renders.
 */
export function initI18n(initialLocale: Locale = DEFAULT_LOCALE): Promise<I18nInstance> {
	if (initPromise) return initPromise;
	initPromise = i18next.use(initReactI18next).init({
		resources: {
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
		},
		lng: initialLocale,
		fallbackLng: DEFAULT_LOCALE,
		ns: [...NAMESPACES],
		defaultNS: [...NAMESPACES],
		interpolation: {
			escapeValue: false,
		},
		react: {
			useSuspense: false,
		},
		// The admin namespace is en-only; fall back to en for `es`.
		partialBundledLanguages: true,
	}).then(() => i18next);
	return initPromise;
}

/**
 * Resolve the locale from a URL pathname. The URL is the source of
 * truth (per REQ-I18N-8 + DESIGN.md §8): `/es/...` is `es`,
 * everything else is `en`.
 */
export function resolveLocaleFromPath(pathname: string): Locale {
	return pathname.startsWith('/es') ? 'es' : 'en';
}

export { i18next };
