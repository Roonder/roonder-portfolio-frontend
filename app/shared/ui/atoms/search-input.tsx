/**
 * `SearchInput` — a search field with an inline magnifier icon
 * (lucide-react `Search`). The component is presentational; the
 * caller owns the value via `value` + `onChange`.
 */
import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Search } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

export type SearchInputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'type'
> & {
	containerClassName?: string;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
	function SearchInput(
		{ className, containerClassName, placeholder, ...props },
		ref,
	) {
		return (
			<div
				data-slot="search-input"
				className={cn(
					'relative flex items-center w-full',
					containerClassName,
				)}
			>
				<Search
					aria-hidden="true"
					className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
				/>
				<input
					ref={ref}
					type="search"
					placeholder={placeholder}
					className={cn(
						'h-10 w-full min-w-0 rounded-md border border-input bg-input pl-9 pr-3 py-1 text-sm transition-colors outline-none',
						'placeholder:text-muted-foreground',
						'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
						'disabled:pointer-events-none disabled:opacity-50',
						className,
					)}
					{...props}
				/>
			</div>
		);
	},
);
