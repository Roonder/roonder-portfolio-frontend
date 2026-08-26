/**
 * `/_public.p0-smoke` — P0 verify route (REMOVED in T-F-12).
 *
 * Renders a single headline that proves the i18n bootstrap works
 * end-to-end: the headline reads "Digital craftsmanship meets
 * raw logic" in en and "Artesanía digital con lógica pura" in
 * es, sourced from the home namespace.
 *
 * This route is a temporary P0 artifact; it is deleted in T-F-12
 * before P1 lands.
 */
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { BentoCell } from "~/shared/ui/atoms/bento-cell";
import { GrainOverlay } from "~/shared/ui/atoms/grain-overlay";
import { MicroLabel } from "~/shared/ui/atoms/micro-label";
import { LocaleSwitcher } from "~/shared/ui/molecules/locale-switcher";
import { setLocale } from "~/shared/i18n/set-locale";
import { useLocaleStore } from "~/shared/stores/locale";
import { useUIStore } from "~/shared/stores/ui";

export function meta() {
	return [{ title: "P0 Smoke — Roonder Portfolio" }];
}

export default function P0Smoke() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const locale = useLocaleStore((s) => s.locale);
	const { pathname } = { pathname: "/p0-smoke" } as { pathname: string };
	const openDrawer = useUIStore((s) => s.setDrawer);
	const closeDrawer = useUIStore((s) => s.closeDrawer);
	const isOpen = useUIStore((s) => s.drawerOpen);

	return (
		<div className="min-h-dvh bg-background text-on-surface">
			<GrainOverlay />
			<header className="flex items-center justify-between border-b border-outline-variant/40 px-6 py-3.5">
				<MicroLabel label="[ P0 Foundation Smoke ]" />
				<LocaleSwitcher currentPathname={pathname} />
			</header>
			<main className="mx-auto max-w-3xl space-y-6 p-8">
				<BentoCell variant="default">
					<MicroLabel label="[ Headline ]" />
					<h1 className="mt-2 text-3xl font-semibold tracking-tight">
						{t('home.hero.headline')}
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t('home.sections.about.body', { brand: t('common.brand.name') })}
					</p>
				</BentoCell>

				<BentoCell variant="elevated">
					<MicroLabel label="[ Brand ]" />
					<p className="mt-2 text-lg text-primary">{t('common.brand.name')}</p>
					<p className="text-sm text-muted-foreground">
						{locale} · {t('common.brand.handle')}
					</p>
				</BentoCell>

				<BentoCell variant="glass">
					<MicroLabel label="[ Locale Switcher ]" />
					<div className="mt-2 flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={() => setLocale('en', pathname, navigate)}
							className="rounded-md border border-outline-variant/60 bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-widest hover:border-primary/60"
						>
							EN
						</button>
						<button
							type="button"
							onClick={() => setLocale('es', pathname, navigate)}
							className="rounded-md border border-outline-variant/60 bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-widest hover:border-primary/60"
						>
							ES
						</button>
					</div>
				</BentoCell>

				<BentoCell>
					<MicroLabel label="[ Drawer ]" />
					<div className="mt-2 flex items-center gap-3">
						<button
							type="button"
							onClick={() => openDrawer(true, 'smoke-slug')}
							className="rounded-md border border-outline-variant/60 bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-widest hover:border-primary/60"
						>
							Open
						</button>
						<button
							type="button"
							onClick={closeDrawer}
							className="rounded-md border border-outline-variant/60 bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-widest hover:border-primary/60"
						>
							Close
						</button>
						<span className="text-xs text-muted-foreground">
							drawer: {isOpen ? 'open' : 'closed'}
						</span>
					</div>
				</BentoCell>
			</main>
		</div>
	);
}
