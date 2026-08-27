/**
 * `AdminProjectNewPage` — the admin new-project page module.
 *
 * Renders the `AdminProjectForm` with empty initial state. REQ-ADM-2.
 */
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

import { AdminProjectForm } from '~/admin/projects/molecules/admin-project-form';

export default function AdminProjectNewPage() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Link
					to="/admin/projects"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
				>
					<ChevronLeft className="size-4" aria-hidden="true" />
					Back to projects
				</Link>
			</div>

			<h1 className="font-display text-xl font-semibold text-on-surface">
				New Project
			</h1>

			<AdminProjectForm method="post" action="/admin/projects/new" />
		</div>
	);
}
