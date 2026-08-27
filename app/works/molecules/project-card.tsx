/**
 * `ProjectCard` — the works catalog card with 4 variants per
 * REQ-WORKS-3 + `assets/design/project_catalog/code.html`:
 *
 *   - `featured` — col-span-2 desktop, full-bleed mobile, 480px
 *     hero image with gradient overlay + View Details hover CTA
 *   - `compact`  — col-1 desktop, image with mix-blend-luminosity
 *     that goes to mix-blend-normal on hover
 *   - `data`     — col-1 desktop, no image; SVG circle composition
 *     with a 75% progress bar
 *   - `split`    — col-span-2 desktop, image left + text right with
 *     absolute `01` giant watermark
 *
 * The card click handler is a `button` (no `useNavigate`) so the
 * page owns navigation; clicking the card sets the drawer state
 * (preview) and the drawer's `Launch Live Experience` button
 * navigates to the canonical `/works/:slug` URL.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { ProjectWatermark } from '~/works/atoms/project-watermark';
import { ProjectMeta } from '~/works/molecules/project-meta';

import type { Project } from '~/home/schema';

export type ProjectCardVariant = 'featured' | 'compact' | 'data' | 'split';

export type ProjectCardProps = {
	project: Project;
	variant: ProjectCardVariant;
	index: number;
	onSelect: (project: Project) => void;
	className?: string;
};

export function ProjectCard({
	project,
	variant,
	index,
	onSelect,
	className,
}: ProjectCardProps) {
	const { t } = useTranslation();

	return (
		<BentoCell
			className={cn(
				'group/project relative flex h-full flex-col overflow-hidden p-0 text-left',
				className,
			)}
		>
			<button
				type="button"
				onClick={() => onSelect(project)}
				aria-label={t('works.card.viewDetails', { title: project.title })}
				className="flex h-full w-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{variant === 'featured' ? (
					<FeaturedLayout project={project} />
				) : variant === 'compact' ? (
					<CompactLayout project={project} />
				) : variant === 'data' ? (
					<DataLayout project={project} />
				) : (
					<SplitLayout project={project} index={index} />
				)}

				<div className="flex flex-1 flex-col gap-2 p-5">
					<ProjectMeta tags={project.tags} hours={project.hours} />
					<h3 className="font-display text-lg font-semibold leading-tight md:text-xl">
						{project.title}
					</h3>
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{project.description}
					</p>
				</div>
			</button>
		</BentoCell>
	);
}

function FeaturedLayout({ project }: { project: Project }) {
	return (
		<div className="relative aspect-[2/1] w-full overflow-hidden bg-surface-container md:aspect-[16/9]">
			{project.coverImage ? (
				<img
					src={project.coverImage}
					alt={project.title}
					loading="lazy"
					className="size-full object-cover"
				/>
			) : (
				<div className="flex size-full items-center justify-center bg-primary/10">
					<span className="font-display text-2xl font-bold text-on-surface">
						{project.title.charAt(0)}
					</span>
				</div>
			)}
			<div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
		</div>
	);
}

function CompactLayout({ project }: { project: Project }) {
	return (
		<div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container">
			{project.coverImage ? (
				<img
					src={project.coverImage}
					alt={project.title}
					loading="lazy"
					style={{ mixBlendMode: 'luminosity' }}
					className="size-full object-cover transition-[filter,mix-blend-mode] duration-500 group-hover/project:mix-blend-normal motion-reduce:transition-none"
				/>
			) : (
				<div className="flex size-full items-center justify-center bg-secondary/10">
					<span className="font-display text-2xl font-bold text-on-surface">
						{project.title.charAt(0)}
					</span>
				</div>
			)}
		</div>
	);
}

function DataLayout({ project }: { project: Project }) {
	return (
		<div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container">
			<svg
				viewBox="0 0 100 100"
				aria-hidden="true"
				className="absolute inset-0 size-full text-primary"
			>
				<circle
					cx="50"
					cy="50"
					r="38"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeOpacity="0.18"
				/>
				<circle
					cx="50"
					cy="50"
					r="38"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeDasharray="180 60"
					strokeDashoffset="40"
					strokeLinecap="round"
				/>
				<text
					x="50"
					y="54"
					textAnchor="middle"
					fontFamily="serif"
					fontSize="14"
					fontWeight="600"
					fill="currentColor"
				>
					{project.title.slice(0, 2).toUpperCase()}
				</text>
			</svg>
			<div className="absolute right-3 bottom-3 left-3">
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
					<div className="h-full w-3/4 rounded-full bg-primary" />
				</div>
			</div>
		</div>
	);
}

function SplitLayout({
	project,
	index,
}: {
	project: Project;
	index: number;
}) {
	return (
		<div className="relative grid w-full grid-cols-1 md:grid-cols-2">
			<div className="relative aspect-[4/3] overflow-hidden bg-surface-container md:aspect-auto md:h-full">
				{project.coverImage ? (
					<img
						src={project.coverImage}
						alt={project.title}
						loading="lazy"
						className="size-full object-cover"
					/>
				) : (
					<div className="flex size-full items-center justify-center bg-primary/10">
						<span className="font-display text-2xl font-bold text-on-surface">
							{project.title.charAt(0)}
						</span>
					</div>
				)}
			</div>
			<ProjectWatermark index={index} />
		</div>
	);
}
