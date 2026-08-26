/**
 * `GrainOverlay` — the 5% noise overlay mounted once per layout
 * (REQ-THEME-8). The asset URL is the design's third-party CDN
 * (`grainy-gradients.vercel.app/noise.svg`); a follow-up SDD
 * change can self-host the SVG.
 *
 * The overlay is `fixed inset-0` with `pointer-events-none` so
 * clicks pass through it. It is `z-[100]` so it sits above
 * scrolling content but below the toast viewport (which uses a
 * higher z-index in P1).
 */
import { cn } from '~/shared/lib/cn';

export type GrainOverlayProps = {
	className?: string;
	/** Optional override for the noise URL. Defaults to the design's CDN. */
	src?: string;
};

const DEFAULT_SRC = 'https://grainy-gradients.vercel.app/noise.svg';

export function GrainOverlay({ className, src = DEFAULT_SRC }: GrainOverlayProps) {
	return (
		<div
			aria-hidden="true"
			data-slot="grain-overlay"
			className={cn(
				'pointer-events-none fixed inset-0 z-[100] opacity-[0.05]',
				// The bg-[url(...)] is hardcoded because Tailwind has no
				// theme token for the SVG; the URL is a single canonical
				// asset per the design (REQ-THEME-8).
				`bg-[url('${src}')]`,
				className,
			)}
		/>
	);
}
