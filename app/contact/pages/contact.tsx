/**
 * `ContactPage` — the public-facing `/contact` route module.
 *
 * Composes the `ContactForm` molecule (the source of truth for
 * both the home contact form and this page per REQ-CON-2 +
 * REQ-HOME-6) inside the `PublicLayout` chrome. The page itself
 * is a thin wrapper: the brand-flourish `MicroLabel`, a
 * `SectionHeading` with the page title/subtitle, the body
 * intro, and the form.
 */
import { useTranslation } from 'react-i18next';

import { PublicHeader } from '~/shared/ui/molecules/public-header';
import { PublicFooter } from '~/shared/ui/molecules/public-footer';
import { GrainOverlay } from '~/shared/ui/atoms/grain-overlay';
import { SectionHeading } from '~/shared/ui/atoms/section-heading';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';
import { MobileHeader } from '~/shared/ui/molecules/mobile-header';
import { BottomNavDock } from '~/shared/ui/molecules/bottom-nav-dock';

import { ContactForm } from '~/contact/molecules/contact-form';

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

				<section className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-6 md:p-8">
					<ContactForm />
				</section>
			</main>

			<PublicFooter />
			<div className="md:hidden">
				<BottomNavDock />
			</div>
		</div>
	);
}
