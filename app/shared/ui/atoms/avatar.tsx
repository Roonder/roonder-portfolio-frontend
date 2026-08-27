/**
 * `Avatar` — a circular user avatar. Falls back to the
 * first letter of the `name` (uppercase) when no `src` is
 * supplied.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

export type AvatarProps = HTMLAttributes<HTMLDivElement> & {
	name: string;
	src?: string | null;
	size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
	sm: 'size-8 text-xs',
	md: 'size-10 text-sm',
	lg: 'size-14 text-base',
};

function initials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return '?';
	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
	return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({
	name,
	src,
	size = 'md',
	className,
	...props
}: AvatarProps) {
	return (
		<div
			data-slot="avatar"
			aria-label={name}
			className={cn(
				'inline-flex items-center justify-center overflow-hidden rounded-full border border-outline-variant/40 bg-surface-container-high text-on-surface font-semibold uppercase',
				sizeClasses[size],
				className,
			)}
			{...props}
		>
			{src ? (
				<img
					src={src}
					alt={name}
					className="h-full w-full object-cover"
					loading="lazy"
					decoding="async"
				/>
			) : (
				<span aria-hidden="true">{initials(name)}</span>
			)}
		</div>
	);
}
