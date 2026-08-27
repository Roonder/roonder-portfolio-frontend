/**
 * `HomePage` — the public home page module.
 *
 * Composes the 7-section bento per REQ-HOME-2:
 *   1. HeroProfileCard (top)
 *   2. MetricsBento (3-cell metrics row)
 *   3. SelectedWorksBento (3-cell featured projects)
 *   4. ExpandedAboutBento (About + secondary stat row)
 *   5. TestimonialsSplit (reviews split)
 *   6. ContactCTA (real form, not a CTA — REQ-HOME-6)
 *   7. PublicFooter + BottomNavDock (mobile)
 *
 * The page is the same for both `en` and `es`; the i18n
 * provider in the layout supplies the active translations.
 */
import { PublicHeader } from '~/shared/ui/molecules/public-header';
import { PublicFooter } from '~/shared/ui/molecules/public-footer';
import { GrainOverlay } from '~/shared/ui/atoms/grain-overlay';
import { MobileHeader } from '~/shared/ui/molecules/mobile-header';
import { BottomNavDock } from '~/shared/ui/molecules/bottom-nav-dock';

import { HeroOrb } from '~/home/atoms/hero-orb';
import { HeroProfileCard } from '~/home/molecules/hero-profile-card';
import { MetricsBento } from '~/home/molecules/metrics-bento';
import { SelectedWorksBento } from '~/home/molecules/selected-works-bento';
import { ExpandedAboutBento } from '~/home/molecules/expanded-about-bento';
import { TestimonialsSplit } from '~/home/molecules/testimonials-split';
import { ContactCTA } from '~/home/molecules/contact-cta';

import type { HomeFeaturedData } from '~/home/api/featured';

export type HomePageProps = HomeFeaturedData;

export function HomePage({
	featuredProjects,
	featuredReviews,
	homeMetrics,
}: HomePageProps) {
	return (
		<div
			data-slot="home-page"
			className="relative isolate min-h-dvh bg-background text-on-surface"
		>
			<GrainOverlay />
			<div className="hidden md:block">
				<PublicHeader />
			</div>
			<div className="md:hidden">
				<MobileHeader />
			</div>

			<main className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 md:px-6 md:py-10">
				<div className="relative">
					<HeroOrb />
					<HeroProfileCard />
				</div>

				<MetricsBento metrics={homeMetrics} />

				<SelectedWorksBento projects={featuredProjects} />

				<ExpandedAboutBento metrics={homeMetrics} />

				<TestimonialsSplit reviews={featuredReviews} />

				<ContactCTA />
			</main>

			<PublicFooter />
			<div className="md:hidden">
				<BottomNavDock />
			</div>
		</div>
	);
}
