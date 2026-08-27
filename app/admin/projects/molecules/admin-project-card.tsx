/**
 * `AdminProjectCard` — the admin project card for the list view.
 *
 * Shows the cover image (or a placeholder), the status badge,
 * the project title + description, and Edit / Delete action
 * buttons. REQ-ADM-1.
 */
import { Link } from 'react-router';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { StatusBadge } from '~/shared/ui/atoms/status-badge';
import { Button } from '~/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

import type { AdminProject } from '~/admin/projects/api/projects';

export type AdminProjectCardProps = {
	project: AdminProject;
	onDelete: (id: string, title: string) => void;
	className?: string;
};

export function AdminProjectCard({
	project,
	onDelete,
	className,
}: AdminProjectCardProps) {
	return (
		<BentoCell
			as="article"
			className={cn('flex flex-col gap-4', className)}
		>
			<div className="aspect-video overflow-hidden rounded-lg bg-surface-container">
				{project.coverImage ? (
					<img
						src={project.coverImage}
						alt={project.title}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full items-center justify-center text-muted-foreground">
						<span className="text-xs uppercase tracking-widest">No cover</span>
					</div>
				)}
			</div>

			<div className="flex items-start justify-between gap-2">
				<h3 className="text-sm font-semibold text-on-surface line-clamp-1">
					{project.title}
				</h3>
				<StatusBadge variant={project.isPublished ? 'published' : 'draft'} />
			</div>

			<p className="text-xs text-muted-foreground line-clamp-2">
				{project.description}
			</p>

			<div className="mt-auto flex gap-2">
				<Button
					variant="outline"
					size="sm"
					className="flex-1"
					render={<Link to={`/admin/projects/${project.id}`} />}
				>
					<Pencil className="mr-1.5 size-3.5" aria-hidden="true" />
					Edit
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="flex-1"
					onClick={() => onDelete(project.id, project.title)}
				>
					<Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
					Delete
				</Button>
			</div>
		</BentoCell>
	);
}
