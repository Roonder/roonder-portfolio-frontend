/**
 * `ProjectWatermark` — the absolute giant "01" / "02" / "03"
 * number that decorates the Split project card variant.
 */
import { cn } from '~/shared/lib/cn';

export type ProjectWatermarkProps = {
	/** The number to display. 1-indexed ("01", "02", ...). */
	index: number;
	className?: string;
};

export function ProjectWatermark({ index, className }: ProjectWatermarkProps) {
	const padded = String(index).padStart(2, '0');
	return (
		<span
			data-slot="project-watermark"
			aria-hidden="true"
			className={cn(
				'pointer-events-none absolute right-2 bottom-2 font-display text-[8rem] font-black leading-none text-on-surface/[0.04] md:text-[10rem]',
				className,
			)}
		>
			{padded}
		</span>
	);
}
