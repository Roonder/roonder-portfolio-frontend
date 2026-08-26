/**
 * `useToastStore` — toast queue with auto-dismiss.
 *
 * Toasts are pushed via `push({ kind, message, ttlMs })`; each toast
 * is assigned a UUID, scheduled for removal after `ttlMs`
 * (default 5s), and exposed via the `toasts` array. The
 * `ToastViewport` (P1) renders the list; the store is data-only.
 *
 * No `persist` middleware: toasts are ephemeral. The `push` action
 * is the only entry; consumers never mutate `toasts` directly.
 */

import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export type Toast = {
	id: string;
	kind: ToastKind;
	message: string;
	createdAt: number;
	ttlMs?: number;
};

export type ToastInput = {
	kind: ToastKind;
	message: string;
	ttlMs?: number;
};

export type ToastState = {
	toasts: Toast[];
};

export type ToastActions = {
	/**
	 * Add a toast. Returns the toast's id so the caller can dismiss
	 * it early (e.g. on navigation). Auto-dismisses after
	 * `ttlMs ?? 5000` ms.
	 */
	push: (input: ToastInput) => string;
	/** Remove a toast by id. Idempotent. */
	dismiss: (id: string) => void;
	/** Clear every toast. Used on navigation away. */
	clear: () => void;
};

export type ToastStore = ToastState & ToastActions;

const DEFAULT_TTL_MS = 5000;

function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useToastStore = create<ToastStore>()((set, get) => ({
	toasts: [],
	push: (input) => {
		const id = generateId();
		const toast: Toast = {
			id,
			kind: input.kind,
			message: input.message,
			createdAt: Date.now(),
			ttlMs: input.ttlMs,
		};
		set((s) => ({ toasts: [...s.toasts, toast] }));
		// Schedule auto-dismiss. We read the latest list to avoid
		// scheduling the same id twice if a caller pushes/dismisses
		// in the same tick.
		const ttl = input.ttlMs ?? DEFAULT_TTL_MS;
		if (typeof window !== 'undefined') {
			window.setTimeout(() => {
				const stillPresent = get().toasts.some((t) => t.id === id);
				if (stillPresent) {
					get().dismiss(id);
				}
			}, ttl);
		}
		return id;
	},
	dismiss: (id) => {
		set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
	},
	clear: () => set({ toasts: [] }),
}));
