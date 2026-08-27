import type { Route } from './+types/_public._index';

import { HomePage } from '~/home/pages/home';
import { fetchHomeFeatured } from '~/home/api/featured';

/**
 * Public home route.
 *
 * Loader calls `fetchHomeFeatured` (REQ-HOME-1) which runs
 * `Promise.all` over the three backend endpoints. On non-2xx,
 * the typed `ApiError` propagates and the route's `ErrorBoundary`
 * renders the failure UI per REQ-HOME-5. The home metrics call
 * uses the design-time fallback per REQ-HOME-8 (BLOCKED-ON-BACKEND).
 */
export async function loader({ request }: Route.LoaderArgs) {
	const data = await fetchHomeFeatured(request);
	return data;
}

export function meta({ params }: Route.MetaArgs) {
	const lang = (params as { lang?: string }).lang ?? 'en';
	const isEs = lang === 'es';
	const base = isEs ? '/es' : '/';
	const origin = 'https://roonder.dev';
	const canonical = `${origin}${base}`;
	const altEn = `${origin}/`;
	const altEs = `${origin}/es`;
	const title = isEs
		? 'Inicio — Roonder Portfolio'
		: 'Home — Roonder Portfolio';
	const description = isEs
		? 'Artesanía digital con lógica pura. Portafolio de Juliam Aponte.'
		: 'Digital craftsmanship meets raw logic. The portfolio of Juliam Aponte.';
	return [
		{ title },
		{ name: 'description', content: description },
		{ tagName: 'link', rel: 'canonical', href: canonical },
		{
			tagName: 'link',
			rel: 'alternate',
			hrefLang: 'en',
			href: altEn,
		},
		{
			tagName: 'link',
			rel: 'alternate',
			hrefLang: 'es',
			href: altEs,
		},
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:type', content: 'website' },
	];
}

export default function PublicHomeRoute({
	loaderData,
}: Route.ComponentProps) {
	return <HomePage {...loaderData} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	// REQ-HOME-5: the boundary surfaces typed ApiError failures
	// with a retry button for `server` / `network` kinds.
	const message =
		error instanceof Error ? error.message : 'Something went wrong.';
	return (
		<section
			data-slot="home-error-boundary"
			className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-on-surface"
		>
			<h1 className="font-display text-3xl font-semibold">
				Unable to load the home page
			</h1>
			<p className="max-w-prose text-sm text-muted-foreground">{message}</p>
			<a
				href="/"
				className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold uppercase tracking-widest text-primary-foreground"
			>
				Retry
			</a>
		</section>
	);
}
