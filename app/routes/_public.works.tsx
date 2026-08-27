import type { Route } from './+types/_public.works';

import { WorksPage } from '~/works/pages/works';
import { fetchWorksList } from '~/works/api/works';

/**
 * Public works catalog route.
 *
 * Loader fetches the full published list (REQ-WORKS-1); the page
 * filters + paginates client-side per REQ-WORKS-2. The 50-project
 * cap is documented in REQ-WORKS-8.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const data = await fetchWorksList(request);
	return data;
}

export function meta({ params }: Route.MetaArgs) {
	const lang = (params as { lang?: string }).lang ?? 'en';
	const isEs = lang === 'es';
	const base = isEs ? '/es/works' : '/works';
	const origin = 'https://roonder.dev';
	const canonical = `${origin}${base}`;
	const altEn = `${origin}/works`;
	const altEs = `${origin}/es/works`;
	const title = isEs
		? 'Proyectos — Roonder Portfolio'
		: 'Works — Roonder Portfolio';
	const description = isEs
		? 'Proyectos seleccionados de Juliam Aponte — arquitectura, fintech, datos y más.'
		: 'Selected works by Juliam Aponte — architecture, fintech, data, and more.';
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

export default function PublicWorksRoute({
	loaderData,
}: Route.ComponentProps) {
	return <WorksPage {...loaderData} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const message =
		error instanceof Error ? error.message : 'Something went wrong.';
	return (
		<section className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-on-surface">
			<h1 className="font-display text-3xl font-semibold">
				Unable to load the works catalog
			</h1>
			<p className="max-w-prose text-sm text-muted-foreground">{message}</p>
			<a
				href="/works"
				className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold uppercase tracking-widest text-primary-foreground"
			>
				Retry
			</a>
		</section>
	);
}
