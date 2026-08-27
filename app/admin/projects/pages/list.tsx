/**
 * `AdminProjectsListPage` — the admin projects list page module.
 *
 * Composes the page title + `New Project` CTA + filter row (status
 * chips) + grid of `AdminProjectCard`s + pagination. REQ-ADM-1.
 *
 * The filter row uses `<Link>` for server-side navigation (the
 * loader re-runs with the new `?status=` query param). The delete
 * action opens the confirm modal via local state.
 */
import { useState } from 'react';
import { Link, useFetcher } from 'react-router';

import { cn } from '~/shared/lib/cn';

import { Button } from '~/components/ui/button';
import { Plus } from 'lucide-react';

import { EmptyState } from '~/shared/ui/atoms/empty-state';
import { Pagination } from '~/shared/ui/molecules/pagination';
import { AdminProjectCard } from '~/admin/projects/molecules/admin-project-card';
import { AdminProjectConfirmModal } from '~/admin/projects/molecules/admin-project-confirm-modal';
import type { AdminProject } from '~/admin/projects/api/projects';

export type AdminProjectsListPageProps = {
	projects: AdminProject[];
	total: number;
	page: number;
	pageSize: number;
	currentStatus: string;
};

type StatusFilter = 'all' | 'published' | 'draft';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'published', label: 'Published' },
	{ value: 'draft', label: 'Draft' },
];

export default function AdminProjectsListPage({
	projects,
	total,
	page,
	pageSize,
	currentStatus,
}: AdminProjectsListPageProps) {
	const totalPages = Math.ceil(total / pageSize);
	const deleteFetcher = useFetcher();

	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		title: string;
	} | null>(null);

	function handleDeleteConfirm() {
		if (!deleteTarget) return;
		const fd = new FormData();
		fd.set('_method', 'DELETE');
		deleteFetcher.submit(fd, {
			method: 'post',
			action: `/admin/projects/${deleteTarget.id}`,
		});
		setDeleteTarget(null);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="font-display text-xl font-semibold text-on-surface">
					Projects
				</h1>
				<Button size="sm" render={<Link to="/admin/projects/new" />}>
					<Plus className="mr-1.5 size-4" aria-hidden="true" />
					New Project
				</Button>
			</div>

			{/* Filter row */}
			<div className="flex gap-2" role="tablist" aria-label="Filter by status">
				{STATUS_FILTERS.map(({ value, label }) => (
					<Link
						key={value}
						to={
							value === 'all'
								? '/admin/projects'
								: `/admin/projects?status=${value}`
						}
						role="tab"
						aria-selected={currentStatus === value}
						className={cn(
							'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors',
							currentStatus === value
								? 'border-primary/50 bg-primary/10 text-primary'
								: 'border-outline-variant/60 bg-surface-container text-muted-foreground hover:text-primary',
						)}
					>
						{label}
					</Link>
				))}
			</div>

			{/* Projects grid */}
			{projects.length === 0 ? (
				<EmptyState
					title="No projects yet"
					body="Create your first project to get started."
					action={
						<Button size="sm" render={<Link to="/admin/projects/new" />}>
							<Plus className="mr-1.5 size-4" aria-hidden="true" />
							New Project
						</Button>
					}
				/>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{projects.map((project) => (
						<AdminProjectCard
							key={project.id}
							project={project}
							onDelete={(id, title) => setDeleteTarget({ id, title })}
						/>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 ? (
				<Pagination
					page={page}
					totalPages={totalPages}
					onPageChange={(next) => {
						const params = new URLSearchParams();
						if (currentStatus !== 'all') params.set('status', currentStatus);
						params.set('page', String(next));
						window.location.href = `/admin/projects?${params.toString()}`;
					}}
				/>
			) : null}

			{/* Delete confirmation modal */}
			<AdminProjectConfirmModal
				projectTitle={deleteTarget?.title ?? ''}
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
				onConfirm={handleDeleteConfirm}
				isDeleting={deleteFetcher.state !== 'idle'}
			/>
		</div>
	);
}
