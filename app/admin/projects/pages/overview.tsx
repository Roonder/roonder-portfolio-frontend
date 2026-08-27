/**
 * `AdminOverviewPage` — the admin overview page module.
 *
 * Composes the welcome card + Active Works stat (BLOCKED-ON-BACKEND
 * fallback per REQ-ADM-11) + a 3-card projects grid from the recent
 * projects. REQ-ADM-6, REQ-ADM-11.
 */
import { Link } from 'react-router';
import { Folder, Plus } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { AdminStatCard } from '~/shared/ui/molecules/admin-stat-card';
import { AdminProjectCard } from '~/admin/projects/molecules/admin-project-card';
import { EmptyState } from '~/shared/ui/atoms/empty-state';
import type { AdminProject } from '~/admin/projects/api/projects';

export type AdminOverviewPageProps = {
	recentProjects: AdminProject[];
};

// TODO(admin-projects): wire to live stats — `GET /api/v1/admin/projects/stats`
// is BLOCKED-ON-BACKEND (REQ-ADM-11). When the backend ships the endpoint,
// replace these hardcoded values with the live fetch.
const STATS_FALLBACK = {
	activeWorks: 24,
	delta: '+3 this month',
};

export default function AdminOverviewPage({
	recentProjects,
}: AdminOverviewPageProps) {
	return (
		<div className="flex flex-col gap-8">
			{/* Welcome card */}
			<section className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-6">
				<h1 className="font-display text-2xl font-semibold text-on-surface">
					Welcome back
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Manage your projects, reviews, and inbox from here.
				</p>
			</section>

			{/* Stats row */}
			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<AdminStatCard
					value={STATS_FALLBACK.activeWorks}
					label="Active Works"
					delta={STATS_FALLBACK.delta}
					icon={<Folder className="size-5" aria-hidden="true" />}
				/>
				<AdminStatCard
					value="—"
					label="Reviews"
					delta="Coming soon"
					className="opacity-60"
				/>
				<AdminStatCard
					value="—"
					label="Inbox"
					delta="Coming soon"
					className="opacity-60"
				/>
			</section>

			{/* Recent projects */}
			<section className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<h2 className="font-display text-lg font-semibold text-on-surface">
						Recent Projects
					</h2>
					<Button size="sm" render={<Link to="/admin/projects/new" />}>
						<Plus className="mr-1.5 size-4" aria-hidden="true" />
						New
					</Button>
				</div>

				{recentProjects.length === 0 ? (
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
						{recentProjects.slice(0, 3).map((project) => (
							<AdminProjectCard
								key={project.id}
								project={project}
								onDelete={() => {
									// Delete is disabled on the overview; navigate to edit
								}}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
