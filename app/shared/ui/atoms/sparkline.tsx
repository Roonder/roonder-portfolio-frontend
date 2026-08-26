/**
 * `Sparkline` — a tiny inline SVG chart used on the home mobile
 * metrics and (optionally) on the works card. Renders a smooth
 * path through the data points; the stroke is the primary
 * Aurelian gold.
 */
import { useId } from 'react';

import { cn } from '~/shared/lib/cn';

export type SparklineProps = {
	points: number[];
	width?: number;
	height?: number;
	className?: string;
	strokeWidth?: number;
};

export function Sparkline({
	points,
	width = 80,
	height = 24,
	strokeWidth = 1.5,
	className,
}: SparklineProps) {
	const id = useId();
	if (points.length < 2) return null;
	const min = Math.min(...points);
	const max = Math.max(...points);
	const range = max - min || 1;
	const stepX = width / (points.length - 1);
	const path = points
		.map((p, i) => {
			const x = i * stepX;
			const y = height - ((p - min) / range) * height;
			return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(' ');
	return (
		<svg
			data-slot="sparkline"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			fill="none"
			aria-hidden="true"
			className={cn('text-primary', className)}
		>
			<title>{`sparkline-${id}`}</title>
			<path
				d={path}
				stroke="currentColor"
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
