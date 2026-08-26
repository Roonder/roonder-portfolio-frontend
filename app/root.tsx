import { useEffect, useRef } from "react";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { useSessionStore } from "~/shared/stores/session";
import { useLocaleStore } from "~/shared/stores/locale";
// Side-effect import: initializes the i18next singleton so any
// component that calls t(...) before the _public loader runs is
// already wired up. Mirrors the useSessionStore.hydrate pattern
// below.
import "~/shared/i18n/side-effect";
import "./app.css";

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
	// Read the active locale for the <html lang> attribute. The
	// `_public.tsx` loader is what actually seeds the store on
	// every navigation (REQ-I18N-9); this read here keeps the
	// document attribute in sync after the store is populated.
	const locale = useLocaleStore.getState().locale;
	return (
		<html lang={locale}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body className="font-sans">
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	// REQ-SES-4: hydrate `useSessionStore` from the `access` cookie
	// once on the first client render. The `useRef` guard protects
	// against React 19 strict-mode double-invokes in dev (production
	// runs the effect once because the deps array is empty). NOT
	// `useMemo` / `useCallback` — the React Compiler handles stable
	// references.
	const hydratedRef = useRef(false);
	useEffect(() => {
		if (hydratedRef.current) return;
		hydratedRef.current = true;
		useSessionStore.getState().hydrate();
	}, []);

	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
