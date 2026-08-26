/**
 * `microHover` — CSS-only hover lift for the `BentoCell` and
 * project cards. No JS state, no `motion` calls. The string is
 * applied as a `className` so Tailwind compiles the transitions
 * at build time.
 *
 * Honors `prefers-reduced-motion` automatically: Tailwind's
 * `motion-reduce:` variant drops both the transition and the
 * translate (the cell sits still on hover).
 */
export const microHoverClassName =
	'transition-all duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

/**
 * Image-zoom hover variant for project card covers.
 */
export const microImageZoomClassName =
	'transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100';
