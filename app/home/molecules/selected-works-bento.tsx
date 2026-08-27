/**
 * `SelectedWorksBento` — the 3-cell featured projects row from
 * the home `featuredProjects` payload. Each card links to its
 * canonical `/works/:slug` detail page (REQ-WORKS-5).
 *
 * BRAND FLOURISH — "PROYECTOS" / "Selected Works" micro-label
 * stays fixed per ADR-6 (Spanish brand flourish is part of the
 * visual identity); the eyebrow below is i18n-translated.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';

import type { Project } from '~/home/schema';

export type SelectedWorksBentoProps = {
	projects: Project[];
	className?: string;
};

export function SelectedWorksBento({
	projects,
	className,
}: SelectedWorksBentoProps) {
	const { t } = useTranslation();

	if (projects.length === 0) return null;

	return (
		<section
			data-slot="selected-works-bento"
			className={cn('flex flex-col gap-4', className)}
		>
			<header className="flex flex-col gap-1">
				<MicroLabel label="PROYECTOS" />
				<h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
					{t('home.sections.works.title')}
				</h2>
			</header>

			<div className="grid gap-3 md:grid-cols-3">
				{projects.slice(0, 3).map((project) => (
					<BentoCell
						key={project.id}
						className="group/featured flex flex-col gap-3 overflow-hidden p-0"
					>
						<Link
							to={`/works/${project.slug}`}
							className="flex h-full flex-col"
						>
							<div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container">
								{project.coverImage ? (
									<img
										src={project.coverImage}
										alt={project.title}
										loading="lazy"
										className="size-full object-cover transition-transform duration-500 group-hover/featured:scale-105 motion-reduce:transition-none"
									/>
								) : (
									<div className="flex size-full items-center justify-center text-muted-foreground">
										<span className="text-xs uppercase tracking-widest">
											{t('home.featured.placeholder')}
										</span>
									</div>
								)}
								<div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
							</div>
							<div className="flex flex-1 flex-col gap-2 p-5">
								<div className="flex flex-wrap items-center gap-2 text-xs">
									{project.tags.slice(0, 2).map((tag) => (
										<span
											key={tag}
											className="rounded-full border border-outline-variant/40 bg-surface-container-high px-2 py-0.5 font-semibold uppercase tracking-widest text-on-surface"
										>
											{tag}
										</span>
									))}
								</div>
								<h3 className="font-display text-lg font-semibold leading-tight md:text-xl">
									{project.title}
								</h3>
								<p className="line-clamp-2 text-sm text-muted-foreground">
									{project.description}
								</p>
							</div>
						</Link>
					</BentoCell>
				))}
			</div>
		</section>
	);
}
