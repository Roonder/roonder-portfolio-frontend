/**
 * `SignOutButton` — presentational button that posts to the logout action.
 *
 * Uses `useFetcher` to fire `POST /admin/auth/logout` (the route
 * `app/routes/admin.auth.logout.tsx` re-exports `logoutAction` as its
 * `action`). On success the action's `redirect('/admin/auth')` lands
 * the user on the login form with both `rt` and `access` cookies
 * cleared.
 *
 * The button also clears the client-side `useSessionStore` after the
 * fetcher resolves. The action itself runs on the server and cannot
 * reach the zustand store directly; the button is the natural place
 * for the JS-side wipe because it is the user-facing trigger and
 * already owns the `useFetcher` lifecycle.
 *
 * Pending UX: while the action is in flight, the button is disabled
 * and the label switches to "Signing out...". Uses local `useState`
 * (NOT `useMemo` / `useCallback` — the React Compiler handles stable
 * references) for the loading flag and a `useEffect` for the
 * post-action store clear.
 */

import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { useSessionStore } from "~/shared/stores/session";

export function SignOutButton({ className }: { className?: string }) {
	const fetcher = useFetcher();
	const [submitting, setSubmitting] = useState(false);

	// Track the in-flight transition. `fetcher.state` is `'submitting'`
	// while the request is in flight and `'idle'` after. We mirror it
	// into local state so the disabled label updates without depending
	// on a fetcher-specific prop.
	const isPending = fetcher.state !== "idle" || submitting;

	// Once the fetcher has resolved AND the user has been navigated
	// away by the action's redirect, clear the session store. The
	// action's `redirect('/admin/auth')` triggers a navigation, so
	// by the time this effect fires (after the fetcher's data is set
	// and the navigation starts), the user is already on the way to
	// the login form. The store clear is the JS-side complement of
	// the cookie wipe in the action.
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data !== undefined) {
			useSessionStore.getState().logout();
		}
	}, [fetcher.state, fetcher.data]);

	return (
		<Button
			type="button"
			variant="ghost"
			disabled={isPending}
			className={className}
			onClick={() => {
				setSubmitting(true);
				fetcher.submit(null, {
					method: "post",
					action: "/admin/auth/logout",
				});
			}}
		>
			{isPending ? "Signing out..." : "Sign out"}
		</Button>
	);
}
