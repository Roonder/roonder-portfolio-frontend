/**
 * `toast` — `motion` preset for the toast appear/disappear.
 *
 * Each toast fades + slides down (-10px) on enter, fades out on
 * exit. Applied per-toast in the `ToastViewport` (P1).
 *
 * Honors `prefers-reduced-motion`: when reduce is on, the y axis
 * is skipped (opacity only, instant).
 */
import type { Variants, Transition } from 'motion/react';

import { prefersReducedMotion } from '~/shared/animation/prefers-reduced-motion';

const reduced = prefersReducedMotion();

export const toastVariants: Variants = reduced
	? {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
		}
	: {
			initial: { opacity: 0, y: -10 },
			animate: { opacity: 1, y: 0 },
			exit: { opacity: 0 },
		};

export const toastTransition: Transition = reduced
	? { duration: 0 }
	: { ease: 'easeOut', duration: 0.2 };
