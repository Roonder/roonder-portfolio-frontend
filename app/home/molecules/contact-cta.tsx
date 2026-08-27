/**
 * `ContactCTA` — the home contact CTA bento. Renders the SAME
 * `ContactForm` molecule the `/contact` route uses (REQ-HOME-6).
 * The form is the canonical molecule; this is a host that wraps
 * it with the brand-flourish `MicroLabel` and section heading.
 *
 * BRAND FLOURISH — "CONTACTO" micro-label stays fixed per ADR-6.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';

import { ContactForm } from '~/contact/molecules/contact-form';

export type ContactCTAProps = {
	className?: string;
};

export function ContactCTA({ className }: ContactCTAProps) {
	const { t } = useTranslation();

	return (
		<BentoCell
			variant="elevated"
			className={cn('flex flex-col gap-6 p-8 md:p-10', className)}
		>
			<header className="flex flex-col gap-2">
				<MicroLabel label="CONTACTO" />
				<h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
					{t('home.sections.contact.title')}
				</h2>
				<p className="text-sm text-muted-foreground md:text-base">
					{t('home.sections.contact.subtitle')}
				</p>
			</header>
			<ContactForm />
		</BentoCell>
	);
}
