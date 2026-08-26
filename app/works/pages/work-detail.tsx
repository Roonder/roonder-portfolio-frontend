/**
 * `WorkDetailPage` — the canonical, URL-shareable
 * `/works/:slug` route module. Renders the full hero + body +
 * gallery + related per REQ-WORKS-5.
 *
 * The page is the destination of the catalog's "Launch Live
 * Experience" CTA; the route's meta tags include `og:image`
 * pointing at the project's hero image (REQ-WORKS-7).
 */
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { PublicHeader } from '~/shared/ui/molecules/public-header';
import { PublicFooter } from '~/shared/ui/molecules/public-footer';
import { GrainOverlay } from '~/shared/ui/atoms/grain-overlay';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';
import { MobileHeader } from '~/shared/ui/molecules/mobile-header';
import { BottomNavDock } from '~/shared/ui/molecules/bottom-nav-dock';

import { ProjectMeta } from '~/works/molecules/project-meta';
import { ProjectCard } from '~/works/molecules/project-card';

import type { Project } from '~/home/schema';
import type { ProjectDetail } from '~/works/schema';

export type WorkDetailPageProps = {
	project: ProjectDetail;
	related: Project[];
	className?: string;
};

export function WorkDetailPage({
	project,
	related,
	className,
}: WorkDetailPageProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const primaryUrl = project.urls?.[0];

	return (
		<div
			data-slot="work-detail-page"
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
				className={cn(
					'mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10',
					className,
				)}
			>
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="self-start text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
				>
					← {t('works.detail.back')}
				</button>

				<header className="flex flex-col gap-3">
					<MicroLabel label="[ Project Detail ]" />
					<h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
						{project.title}
					</h1>
					<ProjectMeta tags={project.tags} hours={project.hours} />
				</header>

				{project.coverImage ? (
					<figure className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container">
						<img
							src={project.coverImage}
							alt={project.title}
							className="aspect-[16/9] w-full object-cover"
						/>
					</figure>
				) : null}

				<section className="flex flex-col gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-6 md:p-8">
					<MicroLabel label={t('works.detail.about')} />
					<p className="text-base text-muted-foreground md:text-lg">
						{project.description}
					</p>
					{project.content ? (
						<div className="prose prose-invert max-w-none text-base leading-relaxed text-muted-foreground">
							{project.content}
						</div>
					) : null}
				</section>

				{primaryUrl ? (
					<section className="flex">
						<Link
							to={primaryUrl.url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-11 w-fit items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
						>
							{t('works.detail.launch')}
						</Link>
					</section>
				) : null}

				{related.length > 0 ? (
					<section className="flex flex-col gap-4 pt-6">
						<header>
							<MicroLabel label="[ Related Projects ]" />
							<h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
								{t('works.detail.related')}
							</h2>
						</header>
						<div className="grid gap-3 md:grid-cols-3">
							{related.slice(0, 3).map((relProject) => (
								<ProjectCard
									key={relProject.id}
									project={relProject}
									variant="compact"
									index={1}
									onSelect={(p) => navigate(`/works/${p.slug}`)}
								/>
							))}
						</div>
					</section>
				) : null}
			</main>

			<PublicFooter />
			<div className="md:hidden">
				<BottomNavDock />
			</div>
		</div>
	);
}
