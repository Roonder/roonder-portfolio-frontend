/**
 * `WorksPage` — the public works catalog module.
 *
 * Holds the three pieces of client-only state per REQ-WORKS-2:
 * `query` (search input), `category` (filter chip), `page`
 * (1-indexed). Filtering + pagination are PURE (no `useMemo` /
 * `useCallback` per React Compiler era). The page renders the
 * hero + filter + grid + drawer + pagination + footer.
 *
 * The drawer is the in-page preview (REQ-WORKS-4); clicking
 * the card sets `useUIStore.drawerSlug`. Clicking "Launch Live
 * Experience" inside the drawer navigates to the canonical
 * `/works/:slug` URL (REQ-WORKS-5).
 */
import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { PublicHeader } from '~/shared/ui/molecules/public-header';
import { PublicFooter } from '~/shared/ui/molecules/public-footer';
import { GrainOverlay } from '~/shared/ui/atoms/grain-overlay';
import { EmptyState } from '~/shared/ui/atoms/empty-state';
import { Pagination } from '~/shared/ui/molecules/pagination';
import { MobileHeader } from '~/shared/ui/molecules/mobile-header';
import { BottomNavDock } from '~/shared/ui/molecules/bottom-nav-dock';

import { useUIStore } from '~/shared/stores/ui';

import { WorksHero } from '~/works/molecules/works-hero';
import { WorksFilter } from '~/works/molecules/works-filter';
import { ProjectCard, type ProjectCardVariant } from '~/works/molecules/project-card';
import { ProjectDrawer } from '~/works/organisms/project-drawer';

import type { Project } from '~/home/schema';
import type { Category } from '~/works/schema';

export type WorksPageProps = {
	projects: Project[];
	className?: string;
};

const PAGE_SIZE = 8;

export function WorksPage({ projects, className }: WorksPageProps) {
	const { t } = useTranslation();
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState<Category>('all');
	const [page, setPage] = useState(1);

	const setDrawer = useUIStore((s) => s.setDrawer);

	const projectsBySlug = useMemo(() => {
		const map: Record<string, Project> = {};
		for (const project of projects) map[project.slug] = project;
		return map;
	}, [projects]);

	const filtered = projects.filter((project) => {
		const matchesQuery =
			query.trim().length === 0 ||
			project.title.toLowerCase().includes(query.toLowerCase()) ||
			project.description.toLowerCase().includes(query.toLowerCase());
		if (!matchesQuery) return false;
		if (category === 'all') return true;
		return project.tags.some((tag) => tag.toLowerCase() === category);
	});

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const windowed = filtered.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	const handleSelect = (project: Project) => {
		setDrawer(true, project.slug);
	};

	return (
		<div
			data-slot="works-page"
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
					'mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 md:px-6 md:py-10',
					className,
				)}
			>
				<WorksHero query={query} onQueryChange={setQuery} />
				<WorksFilter value={category} onChange={setCategory} />

				{filtered.length === 0 ? (
					<EmptyState
						title={t('works.empty.title')}
						body={t('works.empty.body')}
					/>
				) : (
					<section className="grid grid-cols-1 gap-3 md:grid-cols-4">
						{windowed.map((project, idx) => (
							<ProjectCard
								key={project.id}
								project={project}
								variant={pickVariant(idx)}
								index={idx + 1}
								onSelect={handleSelect}
								className={
									pickVariant(idx) === 'featured' ||
									pickVariant(idx) === 'split'
										? 'md:col-span-2'
										: 'md:col-span-1'
								}
							/>
						))}
					</section>
				)}

				{totalPages > 1 ? (
					<Pagination
						page={currentPage}
						totalPages={totalPages}
						onPageChange={setPage}
						ariaLabel={t('works.pagination.page', {
							current: currentPage,
							total: totalPages,
						})}
					/>
				) : null}
			</main>

			<ProjectDrawer projectsBySlug={projectsBySlug} />
			<PublicFooter />
			<div className="md:hidden">
				<BottomNavDock />
			</div>
		</div>
	);
}

function pickVariant(index: number): ProjectCardVariant {
	if (index === 0) return 'featured';
	if (index === 3) return 'split';
	if (index === 4) return 'data';
	return 'compact';
}
