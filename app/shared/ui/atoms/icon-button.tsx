/**
 * `IconButton` — a square button that holds a single icon. Wraps
 * the shadcn `Button` primitive with `size="icon"` and renders
 * the children (typically a lucide-react icon) as the only
 * visible content.
 */
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '~/shared/lib/cn';

import { Button } from '~/components/ui/button';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	label: string; // a11y label
	variant?:
		| 'default'
		| 'outline'
		| 'ghost'
		| 'secondary'
		| 'destructive';
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	function IconButton({ label, className, variant = 'ghost', children, ...props }, ref) {
		return (
			<Button
				ref={ref}
				type="button"
				variant={variant}
				size="icon"
				aria-label={label}
				className={cn('size-9', className)}
				{...props}
			>
				{children}
			</Button>
		);
	},
);
