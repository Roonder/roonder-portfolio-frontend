/**
 * `PublicFooter` — the public site footer.
 *
 * Layout: brand name + tagline on the left, copyright on the
 * right. The year is interpolated client-side (the i18n
 * `common.footer.copyright` template includes `{{year}}`).
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

export type PublicFooterProps = {
	className?: string;
};

export function PublicFooter({ className }: PublicFooterProps) {
	const { t } = useTranslation();
	const year = new Date().getFullYear();
	return (
		<footer
			data-slot="public-footer"
			className={cn(
				'mt-16 flex w-full flex-col items-start justify-between gap-3 border-t border-outline-variant/40 bg-background px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center',
				className,
			)}
		>
			<div className="flex flex-col gap-1">
				<span className="text-primary font-semibold">
					{t('common.brand.name')}
				</span>
				<span className="text-xs">{t('common.footer.copyright', { year })}</span>
			</div>
		</footer>
	);
}
