/**
 * `useUIStore` — cross-route UI state.
 *
 * Holds slices consumed by the public surface (works drawer) and
 * the admin mobile tab bar. The store is selector-form only (per
 * `zustand-5` skill + the locked `admin-auth` REQ-SES-3 pattern):
 * `useUIStore((s) => s.drawerOpen)`.
 *
 * No `persist` middleware: the data here is ephemeral and per-
 * session. A reload returns everything to the initial state.
 */

import { useShallow } from 'zustand/react/shallow';
import { create } from 'zustand';

export type AdminTab = 'projects' | 'reviews' | 'inbox';

export type UIState = {
	/** The works detail drawer (desktop) is open. */
	drawerOpen: boolean;
	/** The slug of the project the drawer is previewing. */
	drawerSlug: string | null;
	/** The active tab on the mobile admin shell. */
	activeAdminTab: AdminTab;
};

export type UIActions = {
	setDrawer: (open: boolean, slug?: string | null) => void;
	closeDrawer: () => void;
	setActiveAdminTab: (tab: AdminTab) => void;
};

export type UIStore = UIState & UIActions;

const initialState: UIState = {
	drawerOpen: false,
	drawerSlug: null,
	activeAdminTab: 'projects',
};

export const useUIStore = create<UIStore>()((set) => ({
	...initialState,
	setDrawer: (open, slug = null) =>
		set({ drawerOpen: open, drawerSlug: open ? slug : null }),
	closeDrawer: () => set({ drawerOpen: false, drawerSlug: null }),
	setActiveAdminTab: (tab) => set({ activeAdminTab: tab }),
}));

/**
 * Convenience selector for multi-field reads (per `zustand-5` skill):
 * consumers that need more than one field use this hook with
 * `useShallow` to avoid spurious re-renders.
 */
export function useUIShallow<T>(selector: (state: UIStore) => T): T {
	return useUIStore(useShallow(selector));
}
