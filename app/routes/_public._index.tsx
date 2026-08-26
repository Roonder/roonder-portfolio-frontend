import type { Route } from "./+types/_public._index";

/**
 * Public home route.
 *
 * P0 placeholder: the route renders a minimal section so the new
 * Aurelian theme can be visually verified end-to-end before the real
 * home page from `app/home/pages/home.tsx` lands in P1.
 */
export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Home — Roonder Portfolio" },
		{ name: "description", content: "Portfolio home" },
	];
}

export default function PublicHome() {
	return (
		<section className="@container bg-background min-h-dvh space-y-3 p-8">
			<header className="border-b border-outline-variant/35 pb-3">
				<h1 className="text-primary text-2xl font-semibold">Juliam A.</h1>
			</header>
			<div className="mx-auto p-6 rounded-2xl w-[90%] min-h-32 bg-card/70 text-on-surface space-y-3">
				<p className="text-brand-micro-label text-xs font-semibold uppercase tracking-widest">
					[ P0 Foundation Smoke ]
				</p>
				<p className="text-primary font-medium text-lg">Here's where</p>
				<h2 className="text-4xl">
					Digital
					craftsmanship{" "}
					<span className="text-muted-foreground text-3xl">meets raw logic</span>
				</h2>
				<p className="text-muted-foreground pt-3">
					Specializing in high-performance systems, based on strong roots, polished
					processes and landed visions.
				</p>
			</div>
		</section>
	);
}
