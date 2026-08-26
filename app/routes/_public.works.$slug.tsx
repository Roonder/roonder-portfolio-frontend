import type { Route } from './+types/_public.works.$slug';

import { WorkDetailPage } from '~/works/pages/work-detail';
import { fetchWorkBySlug, fetchWorksList } from '~/works/api/works';

/**
 * Public works detail route.
 *
 * Loader fetches the single project by slug (REQ-WORKS-5); on 404
 * throws a typed Response so the ErrorBoundary renders the
 * not-found UI. Also fetches a small related-projects list from
 * the same category for the bottom related grid.
 *
 * The canonical URL is the unprefixed path
 * (`/works/:slug`), per REQ-WORKS-7 (search engines index the
 * default-locale URL).
 */
export async function loader({ request, params }: Route.LoaderArgs) {
	const slug = params.slug;
	if (!slug) {
		throw new Response('Not Found', { status: 404 });
	}

	const result = await fetchWorkBySlug(request, slug);
	if (!result.ok) {
		throw new Response('Project not found', { status: 404 });
	}
	const project = result.project;

	const all = await fetchWorksList(request);
	const related = all.projects
		.filter(
			(p) =>
				p.slug !== project.slug &&
				p.tags.some((t) => project.tags.includes(t)),
		)
		.slice(0, 3);

	return { project, related };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
	const slug = params.slug ?? '';
	const lang = (params as { lang?: string }).lang ?? 'en';
	const isEs = lang === 'es';
	const origin = 'https://roonder.dev';
	const canonical = `${origin}/works/${slug}`;
	const altEn = `${origin}/works/${slug}`;
	const altEs = `${origin}/es/works/${slug}`;
	const title = loaderData?.project
		? `${loaderData.project.title} — Roonder Portfolio`
		: isEs
			? 'Proyecto — Roonder Portfolio'
			: 'Project — Roonder Portfolio';
	const description =
		loaderData?.project?.description?.slice(0, 160) ??
		(isEs
			? 'Detalles del proyecto seleccionado.'
			: 'Selected project detail.');
	const ogImage = loaderData?.project?.coverImage ?? undefined;

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
		{ property: 'og:type', content: 'article' },
		...(ogImage ? [{ property: 'og:image', content: ogImage }] : []),
	];
}

export default function PublicWorkDetailRoute({
	loaderData,
}: Route.ComponentProps) {
	return <WorkDetailPage {...loaderData} />;
}

export function ErrorBoundary() {
	return (
		<section className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-on-surface">
			<h1 className="font-display text-3xl font-semibold">
				Project not found
			</h1>
			<p className="max-w-prose text-sm text-muted-foreground">
				The project you're looking for doesn't exist or has been moved.
			</p>
			<a
				href="/works"
				className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold uppercase tracking-widest text-primary-foreground"
			>
				Back to works
			</a>
		</section>
	);
}
