/**
 * `useSessionStore` — the per-render cache for the admin session.
 *
 * The `access` cookie is the source of truth. The store is a cache
 * hydrated from it on first client render (via `hydrate()` from
 * `app/root.tsx`) and updated on `login`, `refresh`, and `logout`.
 *
 * NO `persist` middleware (REQ-SES-2): persisting the access token to
 * localStorage would make it XSS-readable AND let a stale token live
 * past logout. The cookie is already durable storage; the store is a
 * per-render cache, not a database.
 *
 * Selectors: use the selector form
 *   `useSessionStore((s) => s.user)` to avoid re-renders on unrelated
 *   state changes. The full-store read (`useSessionStore()`) is
 *   forbidden.
 */

import { create } from 'zustand';

export type SessionUser = { id: string; email: string };

export type SessionState = {
	accessToken: string | null;
	// Milliseconds since epoch. NOT a JWT decode — the server is the
	// source of truth for expiry. The store stores what the backend
	// returned (or `null` if unknown).
	expiresAt: number | null;
	user: SessionUser | null;
};

export type SessionActions = {
	/**
	 * Read the `access` cookie once and populate `accessToken`. Does
	 * NOT set `user` (the user is populated by the layout loader's
	 * data or by `login()`). Called from `app/root.tsx` on the first
	 * client render.
	 */
	hydrate: () => void;

	/**
	 * Set all three fields from a successful login. The access token,
	 * its expiry, and the user payload all arrive together.
	 */
	login: (input: { accessToken: string; expiresAt: number; user: SessionUser }) => void;

	/**
	 * Update `accessToken` + `expiresAt` only. `user` is unchanged on
	 * refresh (the same user has a new token).
	 */
	refresh: (input: { accessToken: string; expiresAt: number }) => void;

	/**
	 * Atomic clear. Resets all three fields to `null`. Called on
	 * logout and on terminal refresh-401.
	 */
	logout: () => void;
};

export type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
	accessToken: null,
	expiresAt: null,
	user: null,
};

export const useSessionStore = create<SessionStore>()((set) => ({
	...initialState,
	hydrate: () => {
		const token = readAccessCookieClient();
		if (!token) return;
		set({ accessToken: token });
	},
	login: (input) =>
		set({
			accessToken: input.accessToken,
			expiresAt: input.expiresAt,
			user: input.user,
		}),
	refresh: (input) =>
		set((s) => ({
			accessToken: input.accessToken,
			expiresAt: input.expiresAt,
			user: s.user,
		})),
	logout: () => set({ ...initialState }),
}));

/**
 * Read the `access` cookie from `document.cookie`. Returns `null` on
 * the server (where `document` is undefined) or when the cookie is
 * absent. Does NOT decode the JWT — the server validates on each
 * request.
 */
function readAccessCookieClient(): string | null {
	if (typeof document === 'undefined') return null;
	for (const segment of document.cookie.split(';')) {
		const trimmed = segment.trim();
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq);
		if (key !== 'access') continue;
		const value = trimmed.slice(eq + 1);
		return value.length > 0 ? value : null;
	}
	return null;
}
