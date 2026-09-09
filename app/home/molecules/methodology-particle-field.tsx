/**
 * `MethodologyParticleField` — an ambient particle background that fills the
 * whole `MethodologyBento` card. No loop/triangle shape and no phase-driven
 * rotation: particles are spread evenly across the full canvas and each one
 * drifts independently, its `x`/`y` offset driven by its own sine wave
 * (amplitude, speed, and phase randomized per particle at init), so the
 * motion reads as organic drift rather than a shared, rigid pattern.
 *
 * `reduced` (from `prefersReducedMotion()`) stops the `requestAnimationFrame`
 * loop entirely — the field renders once, statically, at its base positions.
 */
import { useEffect, useRef } from 'react';

import { cn } from '~/shared/lib/cn';

export type MethodologyParticleFieldProps = {
	reduced: boolean;
	className?: string;
};

type Particle = {
	baseX: number; // 0..1, fraction of width
	baseY: number; // 0..1, fraction of height
	ampX: number;
	ampY: number;
	speedX: number;
	speedY: number;
	phaseX: number;
	phaseY: number;
	twinkleSpeed: number;
	twinklePhase: number;
	color: string;
	size: number;
};

// Real theme tokens only (app/app.css): brand yellow as the accent, the
// pale-green secondary, and the two neutral outline tones as the fill.
const PALETTE = ['#f2ca50', '#aecfaf', '#99907c', '#4d4635'];
const PALETTE_WEIGHTS = [0.18, 0.22, 0.3, 0.3]; // sums to 1

const PARTICLE_COUNT = 220;

function pickColor(rand: number): string {
	let acc = 0;
	for (let i = 0; i < PALETTE.length; i++) {
		acc += PALETTE_WEIGHTS[i]!;
		if (rand <= acc) return PALETTE[i]!;
	}
	return PALETTE[PALETTE.length - 1]!;
}

function createParticles(): Particle[] {
	const particles: Particle[] = [];

	for (let i = 0; i < PARTICLE_COUNT; i++) {
		particles.push({
			baseX: Math.random(),
			baseY: Math.random(),
			ampX: 6 + Math.random() * 18,
			ampY: 6 + Math.random() * 18,
			speedX: 0.1 + Math.random() * 0.5,
			speedY: 0.1 + Math.random() * 0.5,
			phaseX: Math.random() * Math.PI * 2,
			phaseY: Math.random() * Math.PI * 2,
			twinkleSpeed: 0.2 + Math.random() * 0.6,
			twinklePhase: Math.random() * Math.PI * 2,
			color: pickColor(Math.random()),
			size: 0.8 + Math.random() * 1.8,
		});
	}

	return particles;
}

function draw(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	particles: Particle[],
	time: number,
	animate: boolean,
) {
	ctx.clearRect(0, 0, width, height);

	for (const p of particles) {
		const dx = animate ? Math.sin(time * p.speedX + p.phaseX) * p.ampX : 0;
		const dy = animate ? Math.cos(time * p.speedY + p.phaseY) * p.ampY : 0;
		const twinkle = animate
			? 0.35 + 0.45 * Math.abs(Math.sin(time * p.twinkleSpeed + p.twinklePhase))
			: 0.55;

		const x = p.baseX * width + dx;
		const y = p.baseY * height + dy;

		ctx.beginPath();
		ctx.fillStyle = p.color;
		ctx.globalAlpha = twinkle;
		if (p.color === PALETTE[0]) {
			ctx.shadowColor = p.color;
			ctx.shadowBlur = 4;
		} else {
			ctx.shadowBlur = 0;
		}
		ctx.arc(x, y, p.size, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.shadowBlur = 0;
	ctx.globalAlpha = 1;
}

export function MethodologyParticleField({
	reduced,
	className,
}: MethodologyParticleFieldProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const particlesRef = useRef<Particle[]>(createParticles());
	const frameRef = useRef<number | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let width = 0;
		let height = 0;

		// `clientWidth`/`clientHeight` can still read 0 right after mount if the
		// bento grid/layout hasn't settled yet (web-font swap, parent layout
		// pass). Drawing against a 0/near-0 size sets `canvas.width` to a tiny
		// backing buffer that the CSS `w-full h-full` box then stretches back
		// up, turning small circles into wide vertical smears. A ResizeObserver
		// (rather than only `window` resize) re-syncs the backing buffer the
		// moment the container actually gets its real size, and skips the
		// zero-size case entirely instead of committing to it.
		const resize = () => {
			const nextWidth = canvas.clientWidth;
			const nextHeight = canvas.clientHeight;
			if (nextWidth === 0 || nextHeight === 0) return;
			width = nextWidth;
			height = nextHeight;
			const dpr = window.devicePixelRatio || 1;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (reduced) draw(ctx, width, height, particlesRef.current, 0, false);
		};

		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);

		if (reduced) {
			return () => observer.disconnect();
		}

		const start = performance.now();
		const loop = (now: number) => {
			const time = (now - start) / 1000;
			if (width > 0 && height > 0) {
				draw(ctx, width, height, particlesRef.current, time, true);
			}
			frameRef.current = requestAnimationFrame(loop);
		};
		frameRef.current = requestAnimationFrame(loop);

		return () => {
			observer.disconnect();
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		};
	}, [reduced]);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden="true"
			className={cn('pointer-events-none h-full w-full', className)}
		/>
	);
}
