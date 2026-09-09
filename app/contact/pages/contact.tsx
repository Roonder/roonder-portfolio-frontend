/**
 * `ContactPage` — the public-facing `/contact` route module.
 *
 * Temporarily a `mailto:` CTA instead of the `ContactForm` molecule
 * while the Resend domain/sender verification is pending — see
 * `~/home/molecules/contact-cta` for the matching home-bento swap
 * and the reasoning. `ContactForm` itself is untouched.
 */
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';

import { PublicHeader } from '~/shared/ui/molecules/public-header';
import { PublicFooter } from '~/shared/ui/molecules/public-footer';
import { GrainOverlay } from '~/shared/ui/atoms/grain-overlay';
import { SectionHeading } from '~/shared/ui/atoms/section-heading';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';
import { MobileHeader } from '~/shared/ui/molecules/mobile-header';
import { BottomNavDock } from '~/shared/ui/molecules/bottom-nav-dock';
import { Button } from '~/components/ui/button';

const CONTACT_EMAIL = 'apontejuliam@gmail.com';

export type ContactPageProps = {
	className?: string;
};

export function ContactPage({ className }: ContactPageProps) {
	const { t } = useTranslation();

	return (
		<div
			data-slot="contact-page"
			className="relative isolate min-h-dvh bg-background text-on-surface"
		>
			<GrainOverlay />
			<div className="hidden md:block">
				<PublicHeader />
			</div>
			<div className="md:hidden">
				<MobileHeader />
			</div>

			<main
				className={`mx-auto w-full max-w-3xl px-6 py-12 md:py-20 ${className ?? ''}`}
			>
				<header className="flex flex-col gap-3 pb-10">
					<MicroLabel label="[ Initiate Contact ]" />
					<SectionHeading
						title={t('contact.page.title')}
						description={t('contact.page.subtitle')}
					/>
					<p className="max-w-prose text-sm text-muted-foreground md:text-base">
						{t('contact.page.intro')}
					</p>
				</header>

				<section className="flex flex-col items-start gap-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-6 md:p-8">
					<Button size="lg" render={<a href={`mailto:${CONTACT_EMAIL}`} />}>
						<Mail className="mr-1.5 size-4" aria-hidden="true" />
						{t('contact.page.mailButton')}
					</Button>
					<p className="text-sm text-muted-foreground">{CONTACT_EMAIL}</p>
				</section>
			</main>

			<PublicFooter />
			<div className="md:hidden">
				<BottomNavDock />
			</div>
		</div>
	);
}
