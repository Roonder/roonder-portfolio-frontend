/**
 * `WorksFilter` — the catalog filter chip row: `All`,
 * `Architecture`, `FinTech`, `Data`. The active chip is the
 * gold pill; the rest are the muted surface treatment. The
 * caller owns the active state via `value` + `onChange`.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { FilterChip } from '~/shared/ui/atoms/filter-chip';

import type { Category } from '~/works/schema';

export type WorksFilterProps = {
	value: Category;
	onChange: (next: Category) => void;
	className?: string;
};

const KEYS: Category[] = ['all', 'architecture', 'fintech', 'data'];

export function WorksFilter({ value, onChange, className }: WorksFilterProps) {
	const { t } = useTranslation();

	return (
		<div
			data-slot="works-filter"
			className={cn('flex flex-wrap items-center gap-2', className)}
			role="tablist"
			aria-label={t('works.filter.label')}
		>
			{KEYS.map((key) => (
				<FilterChip
					key={key}
					active={value === key}
					onClick={() => onChange(key)}
					aria-pressed={value === key}
				>
					{t(`works.filter.${key}`)}
				</FilterChip>
			))}
		</div>
	);
}
