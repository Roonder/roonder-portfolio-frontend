/**
 * `LocaleSwitcher` — toggles the active locale.
 *
 * Calls `setLocale(next, currentPathname, navigate)` from
 * `app/shared/i18n/set-locale.ts` (T-F-4). The active locale is
 * read from `useLocaleStore`. Renders a globe outline icon plus
 * only the currently selected locale label (clicking swaps to the
 * other one) — no stacked EN/ES pair.
 */
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import type { Locale } from '~/shared/i18n';
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
			aria-label={`${t(`common.locale.${current}`)}. ${t('common.locale.switchTo', { defaultValue: 'Switch language to' })} ${t(`common.locale.${next}`)}`}
			data-slot="locale-switcher"
			data-current={current}
			className={cn(
				'inline-flex h-9 items-center gap-1.5 rounded-md border border-outline-variant/60 bg-surface-container px-3 text-xs font-semibold uppercase tracking-widest text-on-surface transition-colors hover:border-primary/60 hover:text-primary',
				className,
			)}
		>
			<Globe className="size-4 stroke-[1.5]" aria-hidden="true" />
			<span>{t(`common.locale.${current}`)}</span>
		</button>
	);
}
