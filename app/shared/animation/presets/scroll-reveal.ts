/**
 * `scrollReveal` — `animejs` preset for the choreographed
 * bento-card reveal as it enters the viewport.
 *
 * Usage: a `useEffect` that builds an `anime` animation and plays
 * it on the first viewport entry. The targets are the bento
 * cells; the animation staggers them with a 60ms offset, fading
 * + translating each cell in over 400ms with an `outExpo` ease.
 *
 * Honors `prefers-reduced-motion`: when reduce is on, the
 * animation short-circuits and the targets are revealed
 * immediately (the final state is applied directly).
 */
import { animate, stagger, utils } from 'animejs';

import { prefersReducedMotion } from '~/shared/animation/prefers-reduced-motion';

export type ScrollRevealOptions = {
	/** Stagger offset between consecutive targets in ms. */
	staggerMs?: number;
	/** Per-target duration in ms. */
	durationMs?: number;
	/** Y offset to translate from (px). */
	offsetY?: number;
};

const DEFAULTS = {
	staggerMs: 60,
	durationMs: 400,
	offsetY: 12,
};

/**
 * Resolve the targets argument into a concrete element list. The
 * `string` variant is a CSS selector; the `Element[]` /
 * `NodeListOf<Element>` variants are pre-collected targets.
 */
function resolveTargets(
	targets: Element[] | NodeListOf<Element> | string,
	root: ParentNode = typeof document !== 'undefined' ? document : (null as unknown as ParentNode),
): HTMLElement[] {
	if (typeof targets === 'string') {
		return Array.from((root as Document).querySelectorAll<HTMLElement>(targets));
	}
	const arr: HTMLElement[] = [];
	for (const el of Array.from(targets)) {
		if (el instanceof HTMLElement) arr.push(el);
	}
	return arr;
}

/**
 * Play the scroll-reveal animation against the supplied targets.
 * Idempotent: the returned cleanup is a no-op (animejs animations
 * auto-complete). Callers usually invoke this from a `useEffect`
 * with an `IntersectionObserver` to defer playback until the
 * targets enter the viewport.
 */
export function playScrollReveal(
	targets: Element[] | NodeListOf<Element> | string,
	options: ScrollRevealOptions = {},
): () => void {
	const { staggerMs, durationMs, offsetY } = { ...DEFAULTS, ...options };
	const elements = resolveTargets(targets);
	if (elements.length === 0) return () => {};
	if (prefersReducedMotion()) {
		for (const el of elements) {
			el.style.opacity = '1';
			el.style.transform = 'translateY(0)';
		}
		return () => {};
	}
	animate(elements, {
		opacity: [0, 1],
		translateY: [offsetY, 0],
		duration: durationMs,
		ease: 'outExpo',
		delay: stagger(staggerMs),
	});
	return () => {
		// animejs animations are one-shot; nothing to clean up.
		void utils;
	};
}
