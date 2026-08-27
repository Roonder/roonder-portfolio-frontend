/**
 * `AdminProjectEditPage` — the admin edit-project page module.
 *
 * Renders the `AdminProjectForm` pre-filled with the loader's data.
 * Also renders the delete button + confirm modal. REQ-ADM-3.
 */
import { useState } from 'react';
import { Link, useFetcher } from 'react-router';
import { ChevronLeft, Trash2 } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { AdminProjectForm } from '~/admin/projects/molecules/admin-project-form';
import { AdminProjectConfirmModal } from '~/admin/projects/molecules/admin-project-confirm-modal';
import type { AdminProject } from '~/admin/projects/api/projects';

export type AdminProjectEditPageProps = {
	project: AdminProject;
};

export default function AdminProjectEditPage({
	project,
}: AdminProjectEditPageProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);
	const deleteFetcher = useFetcher();
	const isDeleting = deleteFetcher.state !== 'idle';

	function handleDeleteConfirm() {
		const fd = new FormData();
		fd.set('_method', 'DELETE');
		deleteFetcher.submit(fd, {
			method: 'post',
			action: `/admin/projects/${project.id}`,
		});
		setDeleteOpen(false);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<Link
					to="/admin/projects"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
				>
					<ChevronLeft className="size-4" aria-hidden="true" />
					Back to projects
				</Link>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setDeleteOpen(true)}
				>
					<Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
					Delete
				</Button>
			</div>

			<h1 className="font-display text-xl font-semibold text-on-surface">
				Edit Project
			</h1>

			<AdminProjectForm
				method="patch"
				action={`/admin/projects/${project.id}`}
				defaultValues={{
					title: project.title,
					slug: project.slug,
					description: project.description,
					content: project.content ?? '',
					coverImage: project.coverImage ?? '',
					tags: project.tags,
					isPublished: project.isPublished,
					urls: (project.urls ?? []).map((u) => ({
						title: u.title,
						url: u.url,
					})),
				}}
			/>

			<AdminProjectConfirmModal
				projectTitle={project.title}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onConfirm={handleDeleteConfirm}
				isDeleting={isDeleting}
			/>
		</div>
	);
}
