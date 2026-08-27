/**
 * `bottomSheet` — `motion` preset for the mobile works detail
 * bottom sheet (REQ-WORKS-4). The panel slides up from
 * `y: 100%` to `y: 0` with the design's cubic-bezier
 * (0.32, 0.72, 0, 1) ease over 500ms.
 *
 * Honors `prefers-reduced-motion`: when reduce is on, the duration
 * collapses to 0ms.
 */
import type { Variants, Transition } from 'motion/react';

import { prefersReducedMotion } from '~/shared/animation/prefers-reduced-motion';

const reduced = prefersReducedMotion();

export const bottomSheetVariants: Variants = {
	initial: { y: '100%' },
	animate: { y: 0 },
	exit: { y: '100%' },
};

export const bottomSheetTransition: Transition = reduced
	? { duration: 0 }
	: { ease: [0.32, 0.72, 0, 1] as const, duration: 0.5 };
