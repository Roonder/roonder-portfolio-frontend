/**
 * `prefersReducedMotion` — read the user's reduced-motion preference.
 *
 * Returns `true` when the user has `prefers-reduced-motion: reduce`
 * in their OS settings. SSR-safe: on the server it returns `false`
 * (animations will play; the client will re-render on hydration if
 * the user actually has reduce-motion).
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
