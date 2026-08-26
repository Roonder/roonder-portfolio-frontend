/**
 * `WorksHero` — the works catalog hero: brand micro-label +
 * title + search input.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { SectionHeading } from '~/shared/ui/atoms/section-heading';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';
import { SearchInput } from '~/shared/ui/atoms/search-input';

export type WorksHeroProps = {
	query: string;
	onQueryChange: (next: string) => void;
	className?: string;
};

export function WorksHero({ query, onQueryChange, className }: WorksHeroProps) {
	const { t } = useTranslation();

	return (
		<header
			data-slot="works-hero"
			className={cn(
				'flex flex-col gap-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-8 md:p-10',
				className,
			)}
		>
			<div className="flex flex-col gap-3">
				<MicroLabel label="[ Project Catalog ]" />
				<SectionHeading
					title={t('works.hero.title')}
					description={t('works.hero.subtitle')}
				/>
			</div>
			<SearchInput
				value={query}
				onChange={(e) => onQueryChange(e.currentTarget.value)}
				placeholder={t('works.hero.search')}
				aria-label={t('works.hero.search')}
			/>
		</header>
	);
}
