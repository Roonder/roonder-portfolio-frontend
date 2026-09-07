/**
 * `AdminReviewConfirmModal` — the delete confirmation modal.
 *
 * Scoped duplicate of `AdminProjectConfirmModal`'s pattern (same
 * shadcn `Dialog` primitive), kept separate per-domain rather than
 * generalized — the two modals differ only in copy.
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

export type AdminReviewConfirmModalProps = {
	/** The review author to display in the confirmation message. */
	authorName: string;
	/** Called when the user clicks Confirm. The parent dispatches the delete. */
	onConfirm: () => void;
	/** Whether the modal is open. */
	open: boolean;
	/** Controlled open state setter. */
	onOpenChange: (open: boolean) => void;
	/** Whether the delete is in progress. */
	isDeleting?: boolean;
};

export function AdminReviewConfirmModal({
	authorName,
	onConfirm,
	open,
	onOpenChange,
	isDeleting,
}: AdminReviewConfirmModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogTitle>Delete review</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete the review from{' '}
					<strong>{authorName}</strong>? This action cannot be undone.
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
