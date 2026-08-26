/**
 * `LocaleSwitcher` — toggles the active locale.
 *
 * Calls `setLocale(next, currentPathname, navigate)` from
 * `app/shared/i18n/set-locale.ts` (T-F-4). The active locale is
 * read from `useLocaleStore`; the available locales are
 * `LOCALES` from `app/shared/i18n`.
 */
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { LOCALES, type Locale } from '~/shared/i18n';
import { setLocale } from '~/shared/i18n/set-locale';
import { useLocaleStore } from '~/shared/stores/locale';

export type LocaleSwitcherProps = {
	currentPathname: string;
	className?: string;
};

export function LocaleSwitcher({
	currentPathname,
	className,
}: LocaleSwitcherProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const current = useLocaleStore((s) => s.locale);
	const next: Locale = current === 'en' ? 'es' : 'en';

	return (
		<button
			type="button"
			onClick={() => setLocale(next, currentPathname, navigate)}
			aria-label={`Switch language to ${next.toUpperCase()}`}
			data-slot="locale-switcher"
			data-current={current}
			className={cn(
				'inline-flex h-9 min-w-12 items-center justify-center rounded-md border border-outline-variant/60 bg-surface-container px-3 text-xs font-semibold uppercase tracking-widest text-on-surface transition-colors hover:border-primary/60 hover:text-primary',
				className,
			)}
		>
			{LOCALES.map((locale) => (
				<span
					key={locale}
					className={cn(
						locale === current ? 'text-primary' : 'text-muted-foreground',
					)}
				>
					{t(`common.locale.${locale}`)}
				</span>
			))}
		</button>
	);
}
