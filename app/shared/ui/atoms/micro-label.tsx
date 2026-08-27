/**
 * `MicroLabel` — the brand-flourish label that appears at the top
 * of every bento cell.
 *
 * BRAND FLOURISH — do not translate. The label values are part of
 * the Aurelian visual identity; translating them would dilute the
 * system. Contextual labels go through i18n; brand labels live
 * here. (ADR-6.)
 *
 * The component is a presentational `<span>` with the
 * `text-brand-micro-label` token (REQ-THEME-7) and the design's
 * `label-caps` typography (uppercase, 12px, tracked, semibold).
 * Bracketed variants are common (`[ Precision Metrics ]`) but
 * the brackets are NOT auto-applied; callers include them in the
 * label string so the visual is fully controlled by the call.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

export type MicroLabelProps = HTMLAttributes<HTMLSpanElement> & {
	/** The brand-flourish label string. Includes brackets if wanted. */
	label: string;
};

export function MicroLabel({ label, className, ...props }: MicroLabelProps) {
	return (
		<span
			data-slot="micro-label"
			className={cn(
				'text-brand-micro-label text-xs font-semibold uppercase tracking-widest',
				className,
			)}
			{...props}
		>
			{label}
		</span>
	);
}
