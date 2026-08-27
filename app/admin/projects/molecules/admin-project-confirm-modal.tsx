/**
 * `AdminProjectConfirmModal` — the delete confirmation modal.
 *
 * Uses the shadcn `Dialog` primitive (Base UI). The modal requires
 * the user to click `Confirm` before the delete action runs
 * (REQ-ADM-3 scenario "Delete requires confirm").
 *
 * The parent passes `open` + `onOpenChange` state; the modal
 * renders the confirm / cancel buttons and calls `onConfirm` when
 * the user clicks `Confirm`.
 */
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';

export type AdminProjectConfirmModalProps = {
	/** The project title to display in the confirmation message. */
	projectTitle: string;
	/** Called when the user clicks Confirm. The parent dispatches the delete. */
	onConfirm: () => void;
	/** Whether the modal is open. */
	open: boolean;
	/** Controlled open state setter. */
	onOpenChange: (open: boolean) => void;
	/** Whether the delete is in progress. */
	isDeleting?: boolean;
};

export function AdminProjectConfirmModal({
	projectTitle,
	onConfirm,
	open,
	onOpenChange,
	isDeleting,
}: AdminProjectConfirmModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogTitle>Delete project</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete <strong>{projectTitle}</strong>?
					This action cannot be undone.
				</DialogDescription>
				<DialogFooter>
					<DialogClose render={<Button variant="outline" />} disabled={isDeleting}>
						Cancel
					</DialogClose>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isDeleting}
					>
						{isDeleting ? 'Deleting…' : 'Confirm'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
