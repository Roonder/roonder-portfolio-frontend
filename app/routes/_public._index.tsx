import type { Route } from "./+types/_public._index";
// Components
import { Navbar } from "~/components/global/Navbar";
import { NeuronCard } from "~/components/cards/NeuronCard";

/**
 * Public home route.
 *
 * This route module is a CONTAINER. Page UI lives in `app/home/pages/home`.
 * When the page is built, import and render it here.
 */
export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Home — Roonder Portfolio" },
		{ name: "description", content: "Portfolio home" },
	];
}

export default function PublicHome() {
	return (
		<section className="@container bg-background min-h-dvh space-y-3">
			<Navbar />
			<NeuronCard>
        <p className="text-primary font-medium text-lg">Here's where</p>

				<h2 className="text-4xl">
					Digital
					craftsmanship{" "}
					<span className="text-neutral-400 text-3xl">
						meets raw logic
					</span>
				</h2>

        <p className="text-neutral-500 pt-3">Specializing in high-performance systems, based on strong roots, polished processes and landed visions.</p>
			</NeuronCard>
		</section>
	);
}
