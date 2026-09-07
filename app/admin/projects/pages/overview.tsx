/**
 * `AdminOverviewPage` — the admin overview page module.
 *
 * Composes the welcome card + the 3 live stat cards (Active Works,
 * Reviews pending, Inbox pending — `GET /api/v1/admin/stats`) + a
 * 3-card projects grid from the recent projects. REQ-ADM-6.
 */
import { Link } from 'react-router';
import { Folder, MessageSquare, Plus, Star } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { AdminStatCard } from '~/shared/ui/molecules/admin-stat-card';
import { AdminProjectCard } from '~/admin/projects/molecules/admin-project-card';
import { EmptyState } from '~/shared/ui/atoms/empty-state';
import type { AdminProject, AdminStats } from '~/admin/projects/api/projects';

export type AdminOverviewPageProps = {
	recentProjects: AdminProject[];
	stats: AdminStats;
};

export default function AdminOverviewPage({
	recentProjects,
	stats,
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
					value={stats.activeWorks}
					label="Active Works"
					delta={`+${stats.activeWorksThisMonth} this month`}
					icon={<Folder className="size-5" aria-hidden="true" />}
				/>
				<AdminStatCard
					value={stats.reviewsPending}
					label="Reviews"
					delta={stats.reviewsPending > 0 ? 'Pending approval' : 'All caught up'}
					icon={<Star className="size-5" aria-hidden="true" />}
				/>
				<AdminStatCard
					value={stats.inboxPending}
					label="Inbox"
					delta={stats.inboxPending > 0 ? 'Unread messages' : 'All caught up'}
					icon={<MessageSquare className="size-5" aria-hidden="true" />}
				/>
			</section>

			{/* Recent projects */}
			<section className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<h2 className="font-display text-lg font-semibold text-on-surface">
						Recent Projects
					</h2>
					<Button size="sm" render={<Link to="/administration-panel/projects/new" />}>
						<Plus className="mr-1.5 size-4" aria-hidden="true" />
						New
					</Button>
				</div>

				{recentProjects.length === 0 ? (
					<EmptyState
						title="No projects yet"
						body="Create your first project to get started."
						action={
							<Button size="sm" render={<Link to="/administration-panel/projects/new" />}>
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
