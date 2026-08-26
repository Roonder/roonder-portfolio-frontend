/**
 * `HeroOrb` — a soft radial-gradient backdrop behind the home
 * hero profile card. A decorative, non-interactive element that
 * adds depth to the Aurelian dark canvas.
 */
import { cn } from '~/shared/lib/cn';

export type HeroOrbProps = {
	className?: string;
};

export function HeroOrb({ className }: HeroOrbProps) {
	return (
		<div
			data-slot="hero-orb"
			aria-hidden="true"
			className={cn(
				'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
				className,
			)}
		>
			<div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl motion-reduce:blur-2xl" />
			<div className="absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl motion-reduce:blur-2xl" />
		</div>
	);
}
